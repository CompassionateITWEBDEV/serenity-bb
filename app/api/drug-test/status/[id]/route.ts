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
    const jar = cookies();
    const supaCookie = createServerClient(url, anon, {
      cookies: {
        get: (n) => jar.get(n)?.value,
        set: (n, v, o) => jar.set({ name: n, value: v, ...o }),
        remove: (n, o) => jar.set({ name: n, value: "", ...o, maxAge: 0 }),
      },
    });
    const { data: cookieAuth, error: cookieErr } = await supaCookie.auth.getUser();
    if (cookieErr) return json({ error: cookieErr.message }, 500, { "x-debug": "cookie-getUser-error" });

    // 2) If no cookie session, try Authorization header
    const bearer = req.headers.get("authorization"); // "Bearer <jwt>"
    let headerAuth: typeof cookieAuth | null = null;
    if (!cookieAuth?.user && bearer?.startsWith("Bearer ")) {
      const supaHeader = createSbClient(url, anon, {
        global: { headers: { Authorization: bearer } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const r = await supaHeader.auth.getUser();
      if (r.error) return json({ error: r.error.message }, 401, { "x-debug": "header-getUser-error" });
      headerAuth = r.data;
    }

    const authed = cookieAuth?.user ?? headerAuth?.user;
    if (!authed) return json({ error: "Unauthorized" }, 401, { "x-debug": "no-session" });

    // 3) Staff check using the client style that worked
    const staffClient =
      headerAuth?.user
        ? createSbClient(url, anon, {
            global: { headers: { Authorization: bearer! } },
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

    // If status changed to completed or missed, notify staff
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
