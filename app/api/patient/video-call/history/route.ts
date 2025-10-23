import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRoute } from "@/lib/supabaseRoute";

export async function GET(req: NextRequest) {
  try {
    const supabase = await supabaseFromRoute();
    const { data: au } = await supabase.auth.getUser();
    if (!au.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversationId");
    const callType = url.searchParams.get("callType");
    const status = url.searchParams.get("status");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Verify user is a patient
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("user_id, first_name, last_name")
      .eq("user_id", au.user.id)
      .single();

    if (patientError || !patient) {
      return NextResponse.json({ error: "Only patients can use this endpoint" }, { status: 403 });
    }

    let query = supabase
      .from("call_history")
      .select(`
        *,
        conversations!inner(
          id,
          patient_id,
          provider_id,
          provider_name,
          provider_role,
          provider_avatar
        )
      `)
      .eq("caller_id", au.user.id)
      .order("started_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (conversationId) {
      query = query.eq("conversation_id", conversationId);
    }

    if (callType) {
      query = query.eq("call_type", callType);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (startDate) {
      query = query.gte("started_at", startDate);
    }

    if (endDate) {
      query = query.lte("started_at", endDate);
    }

    const { data: calls, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get call statistics for this patient
    const { data: stats, error: statsError } = await supabase
      .from("call_history")
      .select("call_type, status, duration_seconds, started_at")
      .eq("caller_id", au.user.id);

    if (statsError) {
      console.warn("Failed to get call statistics:", statsError);
    }

    // Calculate statistics
    const statistics = {
      total_calls: stats?.length || 0,
      video_calls: stats?.filter((call: any) => call.call_type === "video").length || 0,
      audio_calls: stats?.filter((call: any) => call.call_type === "audio").length || 0,
      completed_calls: stats?.filter((call: any) => call.status === "ended").length || 0,
      missed_calls: stats?.filter((call: any) => call.status === "missed").length || 0,
      declined_calls: stats?.filter((call: any) => call.status === "declined").length || 0,
      total_duration: stats?.reduce((total: number, call: any) => total + (call.duration_seconds || 0), 0) || 0,
      average_duration: 0,
      calls_this_week: 0,
      calls_this_month: 0
    };

    if (statistics.completed_calls > 0) {
      const completedCalls = stats?.filter((call: any) => call.status === "ended") || [];
      const totalDuration = completedCalls.reduce((total: number, call: any) => total + (call.duration_seconds || 0), 0);
      statistics.average_duration = Math.round(totalDuration / completedCalls.length);
    }

    // Calculate calls this week and month
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    statistics.calls_this_week = stats?.filter((call: any) => 
      new Date(call.started_at) >= weekAgo
    ).length || 0;

    statistics.calls_this_month = stats?.filter((call: any) => 
      new Date(call.started_at) >= monthAgo
    ).length || 0;

    // Get recent call sessions
    const { data: recentSessions, error: sessionsError } = await supabase
      .from("call_sessions")
      .select(`
        *,
        conversations!inner(
          id,
          patient_id,
          provider_id,
          provider_name,
          provider_role,
          provider_avatar
        )
      `)
      .eq("caller_id", au.user.id)
      .order("started_at", { ascending: false })
      .limit(5);

    if (sessionsError) {
      console.warn("Failed to get recent sessions:", sessionsError);
    }

    return NextResponse.json({ 
      calls,
      statistics,
      recentSessions: recentSessions || [],
      pagination: {
        limit,
        offset,
        has_more: calls.length === limit
      },
      patientInfo: {
        id: au.user.id,
        name: [patient.first_name, patient.last_name].filter(Boolean).join(" ") || "Patient"
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await supabaseFromRoute();
    const { data: au } = await supabase.auth.getUser();
    if (!au.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const callId = url.searchParams.get("callId");

    if (!callId) {
      return NextResponse.json({ error: "callId is required" }, { status: 400 });
    }

    // Verify user is a patient
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("user_id")
      .eq("user_id", au.user.id)
      .single();

    if (patientError || !patient) {
      return NextResponse.json({ error: "Only patients can use this endpoint" }, { status: 403 });
    }

    // Delete call history entry (patient can only delete their own calls)
    const { error } = await supabase
      .from("call_history")
      .delete()
      .eq("id", callId)
      .eq("caller_id", au.user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
