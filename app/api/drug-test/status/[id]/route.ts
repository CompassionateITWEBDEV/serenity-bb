import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSbClient } from "@supabase/supabase-js";
import { z } from "zod";

const Body = z.object({ status: z.enum(["completed", "missed", "pending"]) });

function json(data: any, status = 200, headers: Record<string, string> = {}) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return json({ error: "Supabase env missing" }, 500, { "x-debug": "env-missing" });

  // Validate body
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e: any) {
    return json({ error: e?.message ?? "Invalid body" }, 400, { "x-debug": "zod-parse-failed" });
  }

  try {
    // 1) Cookie-bound client
    const jar = await cookies();
    const supaCookie = createServerClient(url, anon, {
      cookies: {
        get: (n) => jar.get(n)?.value,
        set: (n, v, o) => jar.set({ name: n, value: v, ...o }),
        remove: (n, o) => jar.set({ name: n, value: "", ...o, maxAge: 0 }),
      },
    });
    const { data: cookieAuth, error: cookieErr } = await supaCookie.auth.getUser();

    // 2) Fallback: Authorization: Bearer <jwt>
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

    // 3) Staff check using the client style that worked
    const staffClient =
      headerAuth?.user
        ? createSbClient(url, anon, {
            global: { headers: { Authorization: authz! } },
            auth: { persistSession: false, autoRefreshToken: false },
          })
        : supaCookie;

    const { data: staffRow, error: staffErr } = await staffClient
      .from("staff")
      .select("user_id, active")
      .eq("user_id", authed.id)
      .maybeSingle();

    if (staffErr) return json({ error: staffErr.message }, 500, { "x-debug": "staff-query-error" });
    if (!staffRow || staffRow.active === false) return json({ error: "Forbidden" }, 403, { "x-debug": "not-staff" });

    // 4) Update with service role (RLS-safe)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
    if (!serviceKey) return json({ error: "Service role key not configured" }, 500, { "x-debug": "service-role-missing" });

    const admin = createSbClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    // First get the drug test to get patient info before updating
    const { data: drugTestBefore, error: fetchError } = await admin
      .from("drug_tests")
      .select("id, patient_id, status, scheduled_for")
      .eq("id", params.id)
      .single();

    if (fetchError?.code === "PGRST116") return json({ error: "Not found" }, 404, { "x-debug": "not-found" });
    if (fetchError) return json({ error: fetchError.message }, 400, { "x-debug": "fetch-error" });

    // Update the drug test status
    const { data, error } = await admin
      .from("drug_tests")
      .update({ status: body.status })
      .eq("id", params.id)
      .select("id, patient_id, status, scheduled_for, created_at, updated_at")
      .single();

    if (error?.code === "PGRST116") return json({ error: "Not found" }, 404, { "x-debug": "not-found" });
    if (error) return json({ error: error.message }, 400, { "x-debug": "update-error" });

    // If status changed to completed or missed, notify staff and update patient notifications
    if (drugTestBefore && body.status !== drugTestBefore.status && (body.status === "completed" || body.status === "missed")) {
      try {
        // Get patient info for notification
        const { data: patientData } = await admin
          .from("patients")
          .select("user_id, first_name, last_name, full_name")
          .eq("user_id", data.patient_id)
          .single();

        const patientName = patientData?.full_name || 
          [patientData?.first_name, patientData?.last_name].filter(Boolean).join(" ").trim() || 
          "Patient";

        // Update patient notifications - mark pending drug test notifications as completed/succeeded
        if (body.status === "completed") {
          // Find and update notifications related to this drug test
          // Try to find notifications with drug_test notification type
          const { data: notifications } = await admin
            .from("notifications")
            .select("id, data")
            .eq("patient_id", data.patient_id)
            .eq("type", "alert");

          if (notifications && notifications.length > 0) {
            // Filter for drug test notifications and update them
            const drugTestNotifications = notifications.filter((notif: any) => {
              const notifData = notif.data || {};
              return (notifData.notification_type === "drug_test" && notifData.drug_test_id === params.id) ||
                     (notifData.drug_test_id === params.id);
            });

            // Update each notification
            for (const notif of drugTestNotifications) {
              const updatedData = {
                ...(notif.data || {}),
                status: "completed",
                completed_at: new Date().toISOString()
              };
              
              await admin
                .from("notifications")
                .update({ 
                  read: true,
                  data: updatedData
                })
                .eq("id", notif.id)
                .catch((err) => {
                  console.error("Failed to update notification:", err);
                });
            }
          }

          // Create new patient notification for completion
          const completionMessage = "Your drug test has been completed. Results will be available soon.";
          try {
            const notificationResult = await admin
              .from("notifications")
              .insert({
                patient_id: data.patient_id,
                type: "alert",
                title: "Drug Test Completed",
                message: completionMessage,
                read: false,
                data: {
                  notification_type: "drug_test",
                  drug_test_id: params.id,
                  status: "completed",
                  completed_at: new Date().toISOString(),
                  created_by: authed.id
                }
              })
              .select()
              .single();

            // Send real-time notification
            if (!notificationResult.error) {
              console.log(`[Drug Test Status] Created patient notification for completion: ${notificationResult.data?.id}`);
              const channel = admin.channel(`patient-notifications:${data.patient_id}`);
              await channel.send({
                type: 'broadcast',
                event: 'drug_test_completed',
                payload: {
                  drug_test_id: params.id,
                  patient_id: data.patient_id,
                  message: completionMessage,
                  created_at: new Date().toISOString()
                }
              });
              admin.removeChannel(channel);
            } else {
              console.error(`[Drug Test Status] Failed to create patient notification:`, notificationResult.error);
            }
          } catch (notifErr: any) {
            // Try fallback with user_id if patient_id fails
            if (notifErr.code === "42703" || (notifErr.message?.includes("column") && notifErr.message?.includes("does not exist"))) {
              await admin
                .from("notifications")
                .insert({
                  user_id: data.patient_id,
                  type: "alert",
                  title: "Drug Test Completed",
                  message: completionMessage,
                  read: false,
                  data: {
                    notification_type: "drug_test",
                    drug_test_id: params.id,
                    status: "completed",
                    completed_at: new Date().toISOString(),
                    created_by: authed.id
                  }
                })
                .select()
                .single()
                .catch((fallbackErr) => {
                  console.error("Failed to create patient notification (fallback):", fallbackErr);
                });
            } else {
              console.error("Failed to create patient notification:", notifErr);
            }
          }
        } else if (body.status === "missed") {
          // Create patient notification for missed test
          const missedMessage = "You have missed your scheduled drug test. Please contact the facility to reschedule.";
          try {
            const notificationResult = await admin
              .from("notifications")
              .insert({
                patient_id: data.patient_id,
                type: "alert",
                title: "Drug Test Missed",
                message: missedMessage,
                read: false,
                data: {
                  notification_type: "drug_test",
                  drug_test_id: params.id,
                  status: "missed",
                  missed_at: new Date().toISOString(),
                  created_by: authed.id
                }
              })
              .select()
              .single();

            // Send real-time notification
            if (!notificationResult.error) {
              console.log(`[Drug Test Status] Created patient notification for missed: ${notificationResult.data?.id}`);
              const channel = admin.channel(`patient-notifications:${data.patient_id}`);
              await channel.send({
                type: 'broadcast',
                event: 'drug_test_missed',
                payload: {
                  drug_test_id: params.id,
                  patient_id: data.patient_id,
                  message: missedMessage,
                  created_at: new Date().toISOString()
                }
              });
              admin.removeChannel(channel);
            } else {
              console.error(`[Drug Test Status] Failed to create patient notification:`, notificationResult.error);
            }
          } catch (notifErr: any) {
            // Try fallback with user_id if patient_id fails
            if (notifErr.code === "42703" || (notifErr.message?.includes("column") && notifErr.message?.includes("does not exist"))) {
              await admin
                .from("notifications")
                .insert({
                  user_id: data.patient_id,
                  type: "alert",
                  title: "Drug Test Missed",
                  message: missedMessage,
                  read: false,
                  data: {
                    notification_type: "drug_test",
                    drug_test_id: params.id,
                    status: "missed",
                    missed_at: new Date().toISOString(),
                    created_by: authed.id
                  }
                })
                .select()
                .single()
                .catch((fallbackErr) => {
                  console.error("Failed to create patient notification (fallback):", fallbackErr);
                });
            } else {
              console.error("Failed to create patient notification:", notifErr);
            }
          }
        }

        // Create staff notification (async, don't block response)
        const { createDrugTestNotificationServer } = await import("@/lib/notifications/staff-notifications-server");
        
        const message = body.status === 'completed'
          ? `${patientName} has completed their drug test. Results are ready for review.`
          : `${patientName} has missed their scheduled drug test. Follow-up may be required.`;
        
        createDrugTestNotificationServer(
          data.patient_id,
          params.id,
          patientName,
          message,
          body.status as 'completed' | 'missed'
        ).catch((err) => {
          console.error("Failed to create staff notification for drug test:", err);
        });
      } catch (error) {
        console.error("Error creating drug test notification:", error);
        // Don't fail the status update if notification fails
      }
    }

    return json({ data }, 200, { "x-debug": "ok" });
  } catch (e: any) {
    return json({ error: e?.message ?? "Unexpected error" }, 500, { "x-debug": "unhandled" });
  }
}
