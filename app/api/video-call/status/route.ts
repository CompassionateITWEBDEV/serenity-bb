import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRoute } from "@/lib/supabaseRoute";

export async function GET(req: NextRequest) {
  try {
    const supabase = supabaseFromRoute();
    const { data: au } = await supabase.auth.getUser();
    if (!au.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
    }

    // Get active call session for this conversation
    const { data: activeSession, error: sessionError } = await supabase
      .from("call_sessions")
      .select("*")
      .eq("conversation_id", conversationId)
      .in("status", ["initiated", "ringing", "connected"])
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }

    // Get pending invitations for this conversation
    const { data: pendingInvitations, error: inviteError } = await supabase
      .from("video_call_invitations")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }

    // Get recent call history for this conversation
    const { data: recentCalls, error: historyError } = await supabase
      .from("call_history")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("started_at", { ascending: false })
      .limit(5);

    if (historyError) {
      return NextResponse.json({ error: historyError.message }, { status: 500 });
    }

    // Get user's online status (if available)
    const { data: userStatus } = await supabase
      .from("user_status")
      .select("online, last_seen")
      .eq("user_id", au.user.id)
      .single();

    return NextResponse.json({
      activeSession,
      pendingInvitations: pendingInvitations || [],
      recentCalls: recentCalls || [],
      userStatus: userStatus || { online: false, last_seen: null },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = supabaseFromRoute();
    const { data: au } = await supabase.auth.getUser();
    if (!au.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json();
    const { conversationId, action, metadata = {} } = body;

    if (!conversationId || !action) {
      return NextResponse.json({ error: "conversationId and action are required" }, { status: 400 });
    }

    const validActions = ["join", "leave", "mute", "unmute", "camera_on", "camera_off", "screen_share", "stop_screen_share"];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Get active session
    const { data: activeSession, error: sessionError } = await supabase
      .from("call_sessions")
      .select("*")
      .eq("conversation_id", conversationId)
      .in("status", ["initiated", "ringing", "connected"])
      .order("started_at", { ascending: false })
      .limit(1)
      .single();

    if (sessionError || !activeSession) {
      return NextResponse.json({ error: "No active call session found" }, { status: 404 });
    }

    // Check if user is part of this call
    if (![activeSession.caller_id, activeSession.callee_id].includes(au.user.id)) {
      return NextResponse.json({ error: "access denied" }, { status: 403 });
    }

    // Update session metadata with action
    const updatedMetadata = {
      ...activeSession.metadata,
      [action]: {
        user_id: au.user.id,
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };

    const { data: updatedSession, error: updateError } = await supabase
      .from("call_sessions")
      .update({ 
        metadata: updatedMetadata,
        updated_at: new Date().toISOString()
      })
      .eq("id", activeSession.id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Send real-time update to other participants
    const otherUserId = activeSession.caller_id === au.user.id ? 
      activeSession.callee_id : activeSession.caller_id;

    const userChannel = supabase.channel(`user_${otherUserId}`, {
      config: { broadcast: { ack: true } },
    });

    await userChannel.send({
      type: "broadcast",
      event: "call-status-update",
      payload: {
        session_id: activeSession.id,
        conversation_id: conversationId,
        action,
        user_id: au.user.id,
        metadata,
        timestamp: new Date().toISOString()
      },
    });

    supabase.removeChannel(userChannel);

    return NextResponse.json({ 
      session: updatedSession,
      action,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
