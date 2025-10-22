import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRoute } from "@/lib/supabaseRoute";

export async function GET(req: NextRequest) {
  try {
    const supabase = await supabaseFromRoute();
    const { data: au } = await supabase.auth.getUser();
    if (!au.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
    }

    // Verify conversation access
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id, patient_id, provider_id, provider_name, provider_role")
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: "conversation not found" }, { status: 404 });
    }

    if (conversation.patient_id !== au.user.id) {
      return NextResponse.json({ error: "access denied - patient only" }, { status: 403 });
    }

    // Get active call session
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

    // Get pending invitations
    const { data: pendingInvitations, error: inviteError } = await supabase
      .from("video_call_invitations")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("callee_id", au.user.id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (inviteError) {
      console.warn("Failed to get pending invitations:", inviteError);
    }

    // Get recent call history
    const { data: recentCalls, error: historyError } = await supabase
      .from("call_history")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("started_at", { ascending: false })
      .limit(5);

    if (historyError) {
      console.warn("Failed to get call history:", historyError);
    }

    // Get patient's call statistics
    const { data: allCalls, error: statsError } = await supabase
      .from("call_history")
      .select("call_type, status, duration_seconds")
      .or(`caller_id.eq.${au.user.id},callee_id.eq.${au.user.id}`);

    if (statsError) {
      console.warn("Failed to get call statistics:", statsError);
    }

    // Calculate statistics
    const statistics = {
      total_calls: allCalls?.length || 0,
      video_calls: allCalls?.filter((call: any) => call.call_type === "video").length || 0,
      audio_calls: allCalls?.filter((call: any) => call.call_type === "audio").length || 0,
      completed_calls: allCalls?.filter((call: any) => call.status === "ended").length || 0,
      missed_calls: allCalls?.filter((call: any) => call.status === "missed").length || 0,
      total_duration: allCalls?.reduce((total: number, call: any) => total + (call.duration_seconds || 0), 0) || 0,
      average_duration: 0
    };

    if (statistics.completed_calls > 0) {
      const completedCalls = allCalls?.filter((call: any) => call.status === "ended") || [];
      const totalDuration = completedCalls.reduce((total: number, call: any) => total + (call.duration_seconds || 0), 0);
      statistics.average_duration = Math.round(totalDuration / completedCalls.length);
    }

    // Check if patient can initiate calls (based on provider availability)
    const canInitiateCall = !activeSession && (pendingInvitations?.length || 0) === 0;

    return NextResponse.json({
      activeSession,
      pendingInvitations: pendingInvitations || [],
      recentCalls: recentCalls || [],
      statistics,
      canInitiateCall,
      provider: {
        id: conversation.provider_id,
        name: conversation.provider_name,
        role: conversation.provider_role
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseFromRoute();
    const { data: au } = await supabase.auth.getUser();
    if (!au.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json();
    const { conversationId, action, metadata = {} } = body;

    if (!conversationId || !action) {
      return NextResponse.json({ error: "conversationId and action are required" }, { status: 400 });
    }

    const validActions = [
      "request_call", "cancel_request", "join_call", "leave_call", 
      "mute", "unmute", "camera_on", "camera_off"
    ];
    
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Verify conversation access
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id, patient_id, provider_id")
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: "conversation not found" }, { status: 404 });
    }

    if (conversation.patient_id !== au.user.id) {
      return NextResponse.json({ error: "access denied - patient only" }, { status: 403 });
    }

    // Handle different actions
    if (action === "request_call") {
      // This would typically redirect to the initiate-video-call endpoint
      return NextResponse.json({ 
        action: "redirect",
        endpoint: "/api/patient/initiate-video-call",
        message: "Please use the initiate-video-call endpoint to start a call"
      });
    }

    if (action === "cancel_request") {
      // Cancel any pending invitations
      const { error: cancelError } = await supabase
        .from("video_call_invitations")
        .update({ status: "declined" })
        .eq("conversation_id", conversationId)
        .eq("caller_id", au.user.id)
        .eq("status", "pending");

      if (cancelError) {
        return NextResponse.json({ error: cancelError.message }, { status: 500 });
      }

      return NextResponse.json({ 
        action: "cancelled",
        message: "Call request cancelled"
      });
    }

    // For other actions, update active session
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

    // Send real-time update to provider
    const providerChannel = supabase.channel(`user_${conversation.provider_id}`, {
      config: { broadcast: { ack: true } },
    });

    await providerChannel.send({
      type: "broadcast",
      event: "patient-call-action",
      payload: {
        session_id: activeSession.id,
        conversation_id: conversationId,
        action,
        user_id: au.user.id,
        metadata,
        timestamp: new Date().toISOString()
      },
    });

    supabase.removeChannel(providerChannel);

    return NextResponse.json({ 
      session: updatedSession,
      action,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}