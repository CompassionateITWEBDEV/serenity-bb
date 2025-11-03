import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSbClient } from "@supabase/supabase-js";
import { z } from "zod";

// Request body schema
const Body = z.object({
  patientId: z.string().uuid("Invalid patient ID format"),
  drugTestId: z.string().uuid().optional(), // Optional: if creating notification for existing test
  scheduledFor: z.string().datetime().nullable().optional(), // Optional: test schedule
  testType: z.enum(["random", "scheduled", "routine"]).optional().default("random"),
  customMessage: z.string().max(500).optional(), // Optional custom message
  urgent: z.boolean().optional().default(true),
});

function json(data: any, status = 200, headers: Record<string, string> = {}) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      vary: "authorization, cookie",
      ...headers,
    },
  });
}

export const dynamic = "force-dynamic";

/**
 * POST /api/notifications/drug-test
 * Creates a notification for a patient about a drug test
 * Requires staff authentication
 */
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return json({ error: "Supabase env missing" }, 500, {
      "x-debug": "env-missing",
    });
  }

  try {
    // Parse and validate request body
    let body: z.infer<typeof Body>;
    try {
      body = Body.parse(await req.json());
    } catch (e: any) {
      return json({ error: e?.message ?? "Invalid body" }, 400, {
        "x-debug": "zod-parse-failed",
      });
    }

    // Authenticate using cookie or Bearer token
    const jar = await cookies();
    const supaCookie = createServerClient(url, anon, {
      cookies: {
        get: (n) => jar.get(n)?.value,
        set: (n, v, o) => jar.set({ name: n, value: v, ...o }),
        remove: (n, o) => jar.set({ name: n, value: "", ...o, maxAge: 0 }),
      },
    });

    const { data: cookieAuth, error: cookieErr } = await supaCookie.auth.getUser();

    // Fallback: Authorization: Bearer <jwt>
    const headersList = await req.headers;
    const authz = headersList.get("authorization") ?? headersList.get("Authorization");
    let headerAuth: typeof cookieAuth | null = null;

    if ((!cookieAuth?.user || cookieErr) && authz?.toLowerCase().startsWith("bearer ")) {
      const supaHeader = createSbClient(url, anon, {
        global: { headers: { Authorization: authz } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const r = await supaHeader.auth.getUser();
      if (r.error) {
        return json({ error: r.error.message }, 401, {
          "x-debug": "header-getUser-error",
        });
      }
      headerAuth = r.data;
    }

    const authed = cookieAuth?.user ?? headerAuth?.user;
    if (!authed) {
      return json({ error: "Unauthorized" }, 401, { "x-debug": "no-session" });
    }

    // Verify staff authorization
    const staffClient = headerAuth?.user
      ? createSbClient(url, anon, {
          global: { headers: { Authorization: authz! } },
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : supaCookie;

    const staffRes = await staffClient
      .from("staff")
      .select("user_id, active")
      .eq("user_id", authed.id)
      .maybeSingle();

    if (staffRes.error) {
      return json({ error: staffRes.error.message }, 500, {
        "x-debug": "staff-query-error",
      });
    }
    if (!staffRes.data || staffRes.data.active === false) {
      return json({ error: "Forbidden (not staff or inactive)" }, 403, {
        "x-debug": "not-staff",
      });
    }

    // Get patient information
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
    if (!serviceKey) {
      return json(
        {
          error: "Service role key not configured",
        },
        500,
        { "x-debug": "service-role-missing" }
      );
    }

    const admin = createSbClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Fetch patient information
    const { data: patient, error: patientError } = await admin
      .from("patients")
      .select("user_id, full_name, first_name, last_name, email")
      .eq("user_id", body.patientId)
      .single();

    if (patientError || !patient) {
      return json({ error: "Patient not found" }, 404, {
        "x-debug": "patient-not-found",
      });
    }

    const patientName =
      patient.full_name ||
      [patient.first_name, patient.last_name].filter(Boolean).join(" ").trim() ||
      "Patient";

    // If drugTestId provided, verify it exists and belongs to the patient
    if (body.drugTestId) {
      const { data: drugTest, error: drugTestError } = await admin
        .from("drug_tests")
        .select("id, patient_id, scheduled_for, status")
        .eq("id", body.drugTestId)
        .eq("patient_id", body.patientId)
        .single();

      if (drugTestError || !drugTest) {
        return json(
          { error: "Drug test not found or does not belong to patient" },
          404,
          { "x-debug": "drug-test-not-found" }
        );
      }

      // Use the scheduled_for from the drug test if not provided in body
      body.scheduledFor = body.scheduledFor ?? drugTest.scheduled_for;
    }

    // Build notification message
    let notificationMessage: string;
    if (body.customMessage) {
      notificationMessage = body.customMessage;
    } else {
      const scheduledDate = body.scheduledFor
        ? new Date(body.scheduledFor).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "as soon as possible";

      if (body.scheduledFor) {
        notificationMessage = `A ${body.testType} drug test has been scheduled for you on ${scheduledDate}. Please be prepared to take the test at the scheduled time.`;
      } else {
        notificationMessage = `A ${body.testType} drug test has been assigned to you. Please contact the facility to schedule your test.`;
      }
    }

    // Build notification metadata (stored in data JSONB field)
    const notificationData: any = {
      drug_test_id: body.drugTestId || null,
      scheduled_for: body.scheduledFor || null,
      created_by: authed.id,
      test_type: body.testType,
      created_at: new Date().toISOString(),
      priority: body.urgent ? "high" : "medium",
    };

    // Create notification - try patient_id first (used by working routes), fallback to user_id if needed
    let notification: any = null;
    let notificationError: any = null;

    // Try with patient_id (matches /api/random-tests and /api/dashboard patterns)
    // Note: notifications table type constraint only allows 'message', 'medicine', 'alert'
    // We'll use 'alert' type and store 'drug_test' in data.notification_type
    const insertResult = await admin
      .from("notifications")
      .insert({
        patient_id: body.patientId,
        type: "alert", // Use 'alert' type (allowed by schema constraint)
        title: "Drug Test Assigned",
        message: notificationMessage,
        data: {
          ...notificationData,
          notification_type: "drug_test", // Store actual type in data
        },
        read: false,
      })
      .select()
      .single();

    if (insertResult.error) {
      // If patient_id fails, try user_id (matches migration schema)
      if (insertResult.error.code === "42703" || (insertResult.error.message.includes("column") && insertResult.error.message.includes("does not exist"))) {
        const fallbackResult = await admin
          .from("notifications")
          .insert({
            user_id: body.patientId,
            type: "alert", // Use 'alert' type (allowed by schema constraint)
            title: "Drug Test Assigned",
            message: notificationMessage,
            data: {
              ...notificationData,
              notification_type: "drug_test", // Store actual type in data
            },
            read: false,
          })
          .select()
          .single();
        
        notification = fallbackResult.data;
        notificationError = fallbackResult.error;
      } else {
        notificationError = insertResult.error;
      }
    } else {
      notification = insertResult.data;
    }

    if (notificationError) {
      console.error("Error creating notification:", notificationError);
      return json({ error: notificationError.message }, 500, {
        "x-debug": "notification-insert-error",
      });
    }

    return json(
      {
        success: true,
        notification: {
          id: notification.id,
          patientId: notification.patient_id || notification.user_id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          urgent: notification.urgent,
          createdAt: notification.created_at,
        },
        patient: {
          id: patient.user_id,
          name: patientName,
        },
      },
      201
    );
  } catch (e: any) {
    console.error("Server error in drug-test notification:", e);
    return json(
      { error: e?.message ?? "Internal server error" },
      500,
      { "x-debug": "server-error" }
    );
  }
}



