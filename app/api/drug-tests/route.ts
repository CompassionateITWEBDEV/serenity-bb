import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSbClient } from "@supabase/supabase-js";
import { z } from "zod";

const Body = z.object({
  patientId: z.string().uuid(),
  scheduledFor: z.string().datetime().nullable(),
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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return json({ error: "Supabase env missing (NEXT_PUBLIC_SUPABASE_URL/_ANON_KEY)" }, 500, {
      "x-debug": "env-missing",
    });
  }

  // 1) Validate body
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e: any) {
    return json({ error: e?.message ?? "Invalid body" }, 400, { "x-debug": "zod-parse-failed" });
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

    const ins = await admin
      .from("drug_tests")
      .insert({
        patient_id: body.patientId,
        scheduled_for: body.scheduledFor,
        created_by: authed.id,
        status: "pending",
      })
      .select(
        `id, status, scheduled_for, created_at, patient_id,
         patients:patient_id ( user_id, full_name, first_name, last_name, email )`
      )
      .single();

    if (ins.error) {
      return json({ error: ins.error.message }, 400, { "x-debug": "insert-error" });
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
      createDrugTestNotificationServer(
        body.patientId,
        ins.data.id,
        patientName,
        message
      ).catch((err) => {
        console.error("Failed to create staff notification for drug test:", err);
      });
    } catch (error) {
      console.error("Error importing notification function:", error);
      // Don't fail the drug test creation if notification fails
    }

    return json({ data: ins.data }, 200, { "x-debug": "ok" });
  } catch (e: any) {
    // Last-resort detail to help you see the exact failure
    return json({ error: e?.message ?? "Unexpected error" }, 500, { "x-debug": "unhandled" });
  }
}
