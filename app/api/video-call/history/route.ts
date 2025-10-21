import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRoute } from "@/lib/supabaseRoute";

export async function GET(req: NextRequest) {
  try {
    const supabase = supabaseFromRoute();
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

    let query = supabase
      .from("call_history")
      .select(`
        *,
        conversations!inner(
          id,
          patient_id,
          provider_id,
          provider_name,
          provider_role
        )
      `)
      .or(`caller_id.eq.${au.user.id},callee_id.eq.${au.user.id}`)
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

    // Get call statistics
    const { data: stats, error: statsError } = await supabase
      .from("call_history")
      .select("call_type, status, duration_seconds")
      .or(`caller_id.eq.${au.user.id},callee_id.eq.${au.user.id}`);

    if (statsError) {
      console.warn("Failed to get call statistics:", statsError);
    }

    // Calculate statistics
    const statistics = {
      total_calls: stats?.length || 0,
      video_calls: stats?.filter(call => call.call_type === "video").length || 0,
      audio_calls: stats?.filter(call => call.call_type === "audio").length || 0,
      completed_calls: stats?.filter(call => call.status === "ended").length || 0,
      missed_calls: stats?.filter(call => call.status === "missed").length || 0,
      total_duration: stats?.reduce((total, call) => total + (call.duration_seconds || 0), 0) || 0,
      average_duration: 0
    };

    if (statistics.completed_calls > 0) {
      const completedCalls = stats?.filter(call => call.status === "ended") || [];
      const totalDuration = completedCalls.reduce((total, call) => total + (call.duration_seconds || 0), 0);
      statistics.average_duration = Math.round(totalDuration / completedCalls.length);
    }

    return NextResponse.json({ 
      calls,
      statistics,
      pagination: {
        limit,
        offset,
        has_more: calls.length === limit
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = supabaseFromRoute();
    const { data: au } = await supabase.auth.getUser();
    if (!au.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const callId = url.searchParams.get("callId");

    if (!callId) {
      return NextResponse.json({ error: "callId is required" }, { status: 400 });
    }

    // Delete call history entry (user can only delete their own calls)
    const { error } = await supabase
      .from("call_history")
      .delete()
      .eq("id", callId)
      .or(`caller_id.eq.${au.user.id},callee_id.eq.${au.user.id}`);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
