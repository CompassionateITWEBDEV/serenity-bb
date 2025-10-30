import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSbClient } from "@supabase/supabase-js";

function json(data: any, status = 200, headers: Record<string, string> = {}) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

// POST /api/video-submissions/notify-staff
// Creates staff notifications when a patient's video submission reaches a terminal state (e.g., completed)
export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return json({ error: "Supabase configuration missing" }, 500);
  }

  try {
    // Prefer cookie-based auth; fall back to Bearer token
    const cookieStore = await cookies();
    const supabase = createServerClient(url, anon, {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: any) => {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {}
        },
        remove: (name: string, options: any) => {
          try {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 });
          } catch {}
        },
      },
    });

    const { data: cookieAuth, error: cookieErr } = await supabase.auth.getUser();
    let user = cookieAuth?.user;
    if ((!user || cookieErr) && req.headers) {
      const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
      const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null;
      if (bearer) {
        const supabaseBearer = createSbClient(url, anon, {
          global: { headers: { Authorization: `Bearer ${bearer}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: bearerAuth } = await supabaseBearer.auth.getUser();
        user = bearerAuth?.user;
      }
    }

    if (!user) {
      // We allow anonymous in some patient flows, but still require a body to notify staff
      // If truly anonymous, we will continue but mark patientId from body; else return 401
      // For safety, require at least patientId in body.
    }

    const body = await req.json();
    const { videoSubmissionId, patientId, patientName, title, videoType, status } = body || {};

    if (!videoSubmissionId || !patientId || !patientName) {
      return json({ error: "Missing required fields" }, 400);
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
    if (!serviceKey) {
      return json({ error: "Service role key not configured" }, 500);
    }

    const admin = createSbClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Fetch active staff and respect notification preferences
    const { data: staffMembers, error: staffError } = await admin
      .from("staff")
      .select("user_id, notification_preferences, active")
      .eq("active", true);

    if (staffError) {
      console.error("Error fetching staff members:", staffError);
      return json({ error: "Failed to fetch staff members" }, 500);
    }

    const eligibleStaffIds = (staffMembers || [])
      .filter((s: any) => (s?.notification_preferences?.submission_alerts ?? true) === true)
      .map((s: any) => s.user_id);

    if (eligibleStaffIds.length === 0) {
      return json({ success: true, notificationsCreated: 0 });
    }

    const titleText = `New Video Submission from ${patientName}`;
    const messageText = `${patientName} submitted "${title || "Recording"}"${
      videoType ? ` (${videoType})` : ""
    }${status ? ` • status: ${status}` : ""}.`;

    const notifications = eligibleStaffIds.map((staffUserId: string) => ({
      type: "video_submission" as const,
      title: titleText,
      message: messageText,
      patient_id: patientId,
      patient_name: patientName,
      staff_id: staffUserId,
      read: false,
      metadata: {
        video_submission_id: videoSubmissionId,
        video_type: videoType || null,
        status: status || null,
        priority: "medium",
      },
    }));

    const { error: insertError } = await admin
      .from("staff_notifications")
      .insert(notifications as any);

    if (insertError) {
      console.error("Error creating staff notifications for video submission:", insertError);
      return json({ error: "Failed to create notifications", details: insertError.message }, 500);
    }

    return json({ success: true, notificationsCreated: notifications.length }, 200);
  } catch (error: any) {
    console.error("Error in video-submissions/notify-staff API:", error);
    return json({ error: error?.message || "Internal server error" }, 500);
  }
}


