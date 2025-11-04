import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSbClient } from "@supabase/supabase-js";
import { z } from "zod";

// Ensure Node.js runtime for Vercel (not Edge)
// Increase timeout for Vercel Pro plan (60s) or Hobby plan (10s)
export const runtime = "nodejs";
export const maxDuration = 60; // Maximum for Pro plan, will be capped at 10s for Hobby

const Body = z.object({
  patientId: z.string().uuid("patientId must be a valid UUID"),
  scheduledFor: z.union([
    z.string().datetime("scheduledFor must be a valid ISO 8601 datetime string"),
    z.null(),
    z.string().length(0).transform(() => null) // Convert empty string to null
  ]).optional(),
  testType: z.enum(["urine", "saliva", "hair", "blood"], {
    errorMap: () => ({ message: "testType must be one of: urine, saliva, hair, blood" })
  }).optional().default("urine"),
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

export async function POST(req: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[API] [${requestId}] POST /api/drug-tests - Request received at ${new Date().toISOString()}`);
  
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !anon) {
      console.error(`[API] [${requestId}] ❌ CRITICAL: Supabase environment variables missing`);
      console.error(`[API] [${requestId}] NEXT_PUBLIC_SUPABASE_URL:`, url ? "SET" : "MISSING");
      console.error(`[API] [${requestId}] NEXT_PUBLIC_SUPABASE_ANON_KEY:`, anon ? "SET" : "MISSING");
      return json({ 
        error: "Server configuration error",
        details: "Supabase configuration missing. Please check environment variables.",
        hint: "Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in Vercel"
      }, 500, {
        "x-debug": "env-missing",
      });
    }
    
    console.log(`[API] [${requestId}] ✅ Supabase environment variables configured`);

  // 1) Validate body
  let body: z.infer<typeof Body>;
  try {
    const rawBody = await req.json();
    console.log('[API] POST /api/drug-tests - Raw body received:', JSON.stringify(rawBody, null, 2));
    
    const result = Body.safeParse(rawBody);
    if (!result.success) {
      const errors = result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        received: err.path.length > 0 ? (rawBody as any)[err.path[0]] : undefined
      }));
      
      console.error('[API] POST /api/drug-tests - Validation failed:', JSON.stringify(errors, null, 2));
      
      return json({ 
        error: "Validation failed",
        details: errors,
        received: rawBody
      }, 400, { "x-debug": "zod-parse-failed" });
    }
    
    body = result.data;
    console.log('[API] POST /api/drug-tests - Validated body:', JSON.stringify(body, null, 2));
  } catch (e: any) {
    console.error('[API] POST /api/drug-tests - JSON parse error:', e);
    return json({ 
      error: "Invalid JSON body",
      details: e?.message ?? "Failed to parse request body"
    }, 400, { "x-debug": "json-parse-failed" });
  }

  try {
    // 2) Try cookie-bound client
    const jar = await cookies();
    const supaCookie = createServerClient(url, anon, {
      cookies: {
        get: (n) => jar.get(n)?.value,
        set: (n, v, o) => jar.set({ name: n, value: v, ...o }),
        remove: (n, o) => jar.set({ name: n, value: "", ...o, maxAge: 0 }),
      },
    });

    const { data: cookieAuth, error: cookieErr } = await supaCookie.auth.getUser();
    
    // 3) Fallback: Authorization: Bearer <jwt>
    const authz = req.headers.get("authorization") ?? req.headers.get("Authorization");
    let headerAuth: typeof cookieAuth | null = null;
    
    // Try Bearer token if no cookie auth or cookie auth failed
    if ((!cookieAuth?.user || cookieErr) && authz?.toLowerCase().startsWith("bearer ")) {
      const supaHeader = createSbClient(url, anon, {
        global: { headers: { Authorization: authz } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const r = await supaHeader.auth.getUser();
      if (r.error) return json({ error: r.error.message }, 401, { "x-debug": "header-getUser-error" });
      headerAuth = r.data;
    }

    const authed = cookieAuth?.user ?? headerAuth?.user;
    if (!authed) {
      return json({ error: "Auth session missing!" }, 401, { "x-debug": "no-session" });
    }

    // 4) Staff check with whichever client authenticated
    const staffClient =
      headerAuth?.user
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
      return json({ error: staffRes.error.message }, 500, { "x-debug": "staff-query-error" });
    }
    if (!staffRes.data || staffRes.data.active === false) {
      return json({ error: "Forbidden (not staff or inactive)" }, 403, { "x-debug": "not-staff" });
    }

    // 5) Insert via service role
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
    if (!serviceKey) {
      return json({ error: "Service role key not configured (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE)" }, 500, {
        "x-debug": "service-role-missing",
      });
    }

    const admin = createSbClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    // Test Supabase connection before proceeding
    console.log(`[API] [${requestId}] Testing Supabase connection...`);
    try {
      const { data: testConnection, error: connectionError } = await admin
        .from("drug_tests")
        .select("id")
        .limit(1);
      
      if (connectionError) {
        console.error(`[API] [${requestId}] ❌ Supabase connection failed:`, connectionError);
        return json({ 
          error: "Database connection failed",
          details: connectionError.message,
          hint: "Check Supabase project status and network connectivity"
        }, 503, { "x-debug": "supabase-connection-failed" });
      }
      
      console.log(`[API] [${requestId}] ✅ Supabase connection successful`);
    } catch (connErr: any) {
      console.error(`[API] [${requestId}] ❌ Supabase connection error:`, connErr);
      return json({ 
        error: "Unable to connect to database",
        details: connErr?.message || "Network error connecting to Supabase",
        hint: "Check your internet connection and Supabase project status"
      }, 503, { "x-debug": "supabase-connection-error" });
    }

    // Normalize scheduledFor - convert empty string to null
    const scheduledFor = body.scheduledFor === "" || body.scheduledFor === undefined ? null : body.scheduledFor;
    
    console.log(`[API] [${requestId}] Inserting drug test:`, {
      patient_id: body.patientId,
      scheduled_for: scheduledFor,
      created_by: authed.id,
      test_type: body.testType
    });
    
    const insStartTime = Date.now();
    const ins = await admin
      .from("drug_tests")
      .insert({
        patient_id: body.patientId,
        scheduled_for: scheduledFor,
        created_by: authed.id,
        status: "pending",
        metadata: {
          test_type: body.testType, // Store actual test type (urine, saliva, hair, blood)
          collection_method: body.testType === "urine" ? "Urine Collection" 
            : body.testType === "saliva" ? "Oral Swab"
            : body.testType === "hair" ? "Hair Sample"
            : "Blood Draw",
        }
      })
      .select(
        `id, status, scheduled_for, created_at, patient_id,
         patients:patient_id ( user_id, full_name, first_name, last_name, email )`
      )
      .single();

    const insTime = Date.now() - insStartTime;
    console.log(`[API] [${requestId}] Insert query completed in ${insTime}ms`);
    
    if (ins.error) {
      console.error(`[API] [${requestId}] ❌ Insert failed:`, ins.error);
      return json({ 
        error: "Failed to create drug test",
        details: ins.error.message,
        code: ins.error.code,
        hint: ins.error.code === "PGRST116" ? "Database constraint violation" : "Check database connection and permissions"
      }, 400, { "x-debug": "insert-error" });
    }
    
    console.log(`[API] [${requestId}] ✅ Drug test created successfully:`, ins.data.id);

    // Create patient notification (async, don't block response)
    try {
      const patientName = ins.data.patients?.full_name || 
        [ins.data.patients?.first_name, ins.data.patients?.last_name].filter(Boolean).join(" ").trim() || 
        "Patient";
      
      const scheduledDate = ins.data.scheduled_for 
        ? new Date(ins.data.scheduled_for).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long', 
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : "as soon as possible";

      const notificationMessage = ins.data.scheduled_for
        ? `A drug test has been scheduled for you on ${scheduledDate}. Please be prepared to take the test at the scheduled time.`
        : `A drug test has been assigned to you. Please contact the facility to schedule your test.`;

      // Insert notification into the notifications table
      // Try patient_id first, fallback to user_id if needed
      let notificationError: any = null;
      let notificationSuccess = false;

      // First attempt: use patient_id (preferred)
      // Note: notifications table type constraint only allows 'message', 'medicine', 'alert'
      // We'll use 'alert' type and store 'drug_test' in data.type
      const insertResult = await admin
        .from("notifications")
        .insert({
          patient_id: body.patientId,
          type: "alert", // Use 'alert' type (allowed by schema constraint)
          title: "Drug Test Assigned",
          message: notificationMessage,
          read: false,
          data: {
            notification_type: "drug_test", // Store actual type in data
            drug_test_id: ins.data.id,
            scheduled_for: ins.data.scheduled_for,
            created_by: authed.id,
            test_type: body.testType || "urine"
          }
        })
        .select()
        .single();

      if (insertResult.error) {
        // If patient_id fails, try user_id (fallback for schema compatibility)
        if (insertResult.error.code === "42703" || 
            (insertResult.error.message.includes("column") && insertResult.error.message.includes("does not exist"))) {
          const fallbackResult = await admin
            .from("notifications")
            .insert({
              user_id: body.patientId,
              type: "alert", // Use 'alert' type (allowed by schema constraint)
              title: "Drug Test Assigned",
              message: notificationMessage,
              read: false,
              data: {
                notification_type: "drug_test", // Store actual type in data
                drug_test_id: ins.data.id,
                scheduled_for: ins.data.scheduled_for,
                created_by: authed.id,
                test_type: body.testType || "urine"
              }
            })
            .select()
            .single();

          if (!fallbackResult.error) {
            notificationSuccess = true;
          } else {
            notificationError = fallbackResult.error;
          }
        } else {
          notificationError = insertResult.error;
        }
      } else {
        notificationSuccess = true;
      }

      // Send real-time notification broadcast if notification was created
      if (notificationSuccess) {
        try {
          const channel = admin.channel(`patient-notifications:${body.patientId}`);
          await channel.send({
            type: 'broadcast',
            event: 'drug_test_scheduled',
            payload: {
              drug_test_id: ins.data.id,
              patient_id: body.patientId,
              scheduled_for: ins.data.scheduled_for,
              message: notificationMessage,
              created_at: new Date().toISOString()
            }
          });
          admin.removeChannel(channel);
        } catch (channelError) {
          console.error("Error sending real-time notification:", channelError);
        }
      }

      if (notificationError) {
        console.error("Error creating patient notification:", notificationError);
      } else {
        console.log(`Patient notification created successfully for drug test ${ins.data.id}`);
      }
    } catch (error) {
      console.error("Error in patient notification creation:", error);
      // Don't fail the drug test creation if notification fails
    }

    // Notify staff when drug test is created (async, don't block response)
    try {
      const { createDrugTestNotificationServer } = await import("@/lib/notifications/staff-notifications-server");
      
      const patientName = ins.data.patients?.full_name || 
        [ins.data.patients?.first_name, ins.data.patients?.last_name].filter(Boolean).join(" ").trim() || 
        "Patient";
      
      const scheduledDate = ins.data.scheduled_for 
        ? new Date(ins.data.scheduled_for).toLocaleDateString("en-US", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Not scheduled";
      
      const message = ins.data.scheduled_for
        ? `A drug test has been scheduled for ${patientName} on ${scheduledDate}`
        : `A drug test has been assigned to ${patientName} (not yet scheduled)`;
      
      // Create notification for all active staff (runs async, won't block response)
      // Note: createDrugTestNotificationServer will exclude the creator automatically
      createDrugTestNotificationServer(
        body.patientId,
        ins.data.id,
        patientName,
        message,
        undefined, // testStatus - will be 'pending' for new tests
        "random" // testType
      ).catch((err) => {
        console.error("Failed to create staff notification for drug test:", err);
      });
    } catch (error) {
      console.error("Error importing notification function:", error);
      // Don't fail the drug test creation if notification fails
    }

    return json({ data: ins.data }, 200, { "x-debug": "ok" });
  } catch (e: any) {
    console.error(`[API] [${requestId}] ❌ Unhandled error:`, e);
    
    // Check for network/connection errors
    const errorMessage = e?.message || String(e) || 'Unknown error';
    const isNetworkError = errorMessage.includes('ECONNREFUSED') ||
                          errorMessage.includes('ENOTFOUND') ||
                          errorMessage.includes('ETIMEDOUT') ||
                          errorMessage.includes('NetworkError') ||
                          errorMessage.includes('Failed to fetch') ||
                          e?.code === 'ECONNREFUSED' ||
                          e?.code === 'ENOTFOUND' ||
                          e?.code === 'ETIMEDOUT';
    
    if (isNetworkError) {
      return json({ 
        error: "Network error: Unable to connect to the server",
        details: "The server could not connect to the database. Please check your internet connection and try again.",
        hint: "If this persists, check Supabase project status and network connectivity"
      }, 503, { "x-debug": "network-error" });
    }
    
    // Last-resort detail to help you see the exact failure
    return json({ 
      error: e?.message ?? "Unexpected error",
      details: String(e),
      hint: "Check server logs for more details"
    }, 500, { "x-debug": "unhandled" });
  }
}
