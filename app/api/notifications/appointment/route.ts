import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSbClient } from "@supabase/supabase-js";
import { z } from "zod";

// Request body schema
const Body = z.object({
  patientId: z.string().uuid("Invalid patient ID format"),
  appointmentId: z.string().uuid().optional(), // Optional: if creating notification for existing appointment
  appointmentTime: z.string().datetime().optional(), // Optional: appointment schedule
  appointmentType: z.string().optional(),
  provider: z.string().optional(),
  location: z.string().optional(),
  isVirtual: z.boolean().optional(),
  customMessage: z.string().max(500).optional(), // Optional custom message
  urgent: z.boolean().optional().default(false),
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
 * POST /api/notifications/appointment
 * Creates a notification for a patient about an appointment
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

    // If appointmentId provided, verify it exists and belongs to the patient
    if (body.appointmentId) {
      const { data: appointment, error: appointmentError } = await admin
        .from("appointments")
        .select("id, appointment_time, title, provider, location, is_virtual, type")
        .eq("id", body.appointmentId)
        .eq("patient_id", body.patientId)
        .single();

      if (appointmentError || !appointment) {
        return json(
          { error: "Appointment not found or does not belong to patient" },
          404,
          { "x-debug": "appointment-not-found" }
        );
      }

      // Use the appointment data if not provided in body
      body.appointmentTime = body.appointmentTime ?? appointment.appointment_time;
      body.appointmentType = body.appointmentType ?? appointment.type;
      body.provider = body.provider ?? appointment.provider;
      body.location = body.location ?? appointment.location;
      body.isVirtual = body.isVirtual ?? appointment.is_virtual;
    }

    // Build notification message
    let notificationTitle = "Appointment Scheduled";
    let notificationMessage = body.customMessage;

    if (!notificationMessage) {
      const appointmentDate = body.appointmentTime
        ? new Date(body.appointmentTime).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "TBD";

      const locationText = body.isVirtual
        ? "Virtual Meeting"
        : body.location || "Location TBD";

      const providerText = body.provider ? `with ${body.provider}` : "";
      const typeText = body.appointmentType ? ` (${body.appointmentType})` : "";

      notificationMessage = body.appointmentTime
        ? `You have an appointment${providerText}${typeText} on ${appointmentDate}${!body.isVirtual ? ` at ${locationText}` : ""}. Please arrive on time.`
        : `An appointment${providerText}${typeText} has been scheduled for you${!body.isVirtual ? ` at ${locationText}` : ""}. Details will be provided soon.`;
    }

    // Insert notification into the notifications table
    // Note: The notifications table uses 'user_id' to reference patients
    const { data: notification, error: notificationError } = await admin
      .from("notifications")
      .insert({
        user_id: body.patientId, // This is the patient's user_id (patient.user_id)
        type: body.isVirtual ? "virtual_appointment" : "appointment",
        title: notificationTitle,
        message: notificationMessage,
        data: {
          appointment_id: body.appointmentId || null,
          appointment_time: body.appointmentTime || null,
          appointment_type: body.appointmentType || null,
          provider: body.provider || null,
          location: body.location || null,
          is_virtual: body.isVirtual || false,
          created_by: authed.id,
        },
        read: false,
        urgent: body.urgent,
      })
      .select("*")
      .single();

    if (notificationError) {
      console.error("Error creating appointment notification:", notificationError);
      return json(
        {
          error: "Failed to create notification",
          details: notificationError.message,
        },
        500,
        { "x-debug": "notification-insert-failed" }
      );
    }

    return json(
      {
        success: true,
        notification: {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          appointment_id: body.appointmentId || null,
        },
        patient: {
          id: patient.user_id,
          name: patientName,
        },
      },
      201,
      { "x-debug": "ok" }
    );
  } catch (e: any) {
    console.error("Server error in appointment notification:", e);
    return json(
      {
        error: "Internal server error",
        details: e?.message || String(e),
      },
      500,
      { "x-debug": "unhandled-error" }
    );
  }
}



