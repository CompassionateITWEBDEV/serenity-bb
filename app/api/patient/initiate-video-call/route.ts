import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRoute } from "@/lib/supabaseRoute";

export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseFromRoute();
    const { data: au } = await supabase.auth.getUser();
    if (!au.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json();
    const { 
      conversationId, 
      callType = "video",
      message = "I would like to start a video call",
      priority = "normal",
      metadata = {}
    } = body;

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
    }

    // Verify conversation exists and user is a patient
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

    // Check if there's already an active call session
    const { data: activeSession, error: activeError } = await supabase
      .from("call_sessions")
      .select("*")
      .eq("conversation_id", conversationId)
      .in("status", ["initiated", "ringing", "connected"])
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeError) {
      return NextResponse.json({ error: activeError.message }, { status: 500 });
    }

    if (activeSession) {
      return NextResponse.json({ 
        error: "There is already an active call session",
        activeSession 
      }, { status: 409 });
    }

    // Create call session
    const { data: callSession, error: sessionError } = await supabase
      .from("call_sessions")
      .insert({
        conversation_id: conversationId,
        caller_id: au.user.id,
        callee_id: conversation.provider_id,
        call_type: callType,
        status: "initiated",
        started_at: new Date().toISOString(),
        metadata: {
          ...metadata,
          patient_initiated: true,
          priority,
          message
        }
      })
      .select("*")
      .single();

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }

    // Create call invitation
    const { data: callInvitation, error: inviteError } = await supabase
      .from("video_call_invitations")
      .insert({
        conversation_id: conversationId,
        caller_id: au.user.id,
        callee_id: conversation.provider_id,
        caller_name: au.user.user_metadata?.full_name || au.user.email || "Patient",
        caller_role: "patient",
        call_type: callType,
        message: message,
        status: "pending",
        metadata: {
          ...metadata,
          patient_initiated: true,
          priority,
          auto_accept: false
        },
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
      })
      .select("*")
      .single();

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }

    // Create call history entry
    const { data: callHistory, error: historyError } = await supabase
      .from("call_history")
      .insert({
        conversation_id: conversationId,
        caller_id: au.user.id,
        callee_id: conversation.provider_id,
        caller_name: au.user.user_metadata?.full_name || au.user.email || "Patient",
        callee_name: conversation.provider_name || "Staff",
        call_type: callType,
        status: "initiated",
        started_at: new Date().toISOString(),
        notes: `Patient initiated ${callType} call: ${message}`
      })
      .select("*")
      .single();

    if (historyError) {
      console.warn("Failed to create call history:", historyError);
    }

    // Create a message in the conversation
    const { data: messageRecord, error: messageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        patient_id: conversation.patient_id,
        sender_id: au.user.id,
        sender_name: au.user.user_metadata?.full_name || au.user.email || "Patient",
        sender_role: "patient",
        content: `📞 ${message}`,
        read: false,
        metadata: {
          video_call_initiated: true,
          session_id: callSession.id,
          invitation_id: callInvitation.id,
          call_type: callType,
          priority
        }
      })
      .select("*")
      .single();

    if (messageError) {
      console.warn("Failed to create message:", messageError);
    }

    // Create video call message
    const { data: videoCallMessage, error: vcError } = await supabase
      .from("video_call_messages")
      .insert({
        conversation_id: conversationId,
        session_id: callSession.id,
        sender_id: au.user.id,
        sender_name: au.user.user_metadata?.full_name || au.user.email || "Patient",
        sender_role: "patient",
        message_type: "call_action",
        content: `Patient initiated ${callType} call: ${message}`,
        metadata: {
          ...metadata,
          patient_initiated: true,
          priority,
          original_message: message
        },
        read: false
      })
      .select("*")
      .single();

    if (vcError) {
      console.warn("Failed to create video call message:", vcError);
    }

    // Send real-time notifications
    const userChannel = supabase.channel(`user_${conversation.provider_id}`, {
      config: { broadcast: { ack: true } },
    });

    const staffChannel = supabase.channel(`staff-calls-${conversation.provider_id}`, {
      config: { broadcast: { ack: true } },
    });

    const notificationPayload = {
      type: "patient_video_call_request",
      conversation_id: conversationId,
      patient_id: au.user.id,
      patient_name: au.user.user_metadata?.full_name || au.user.email || "Patient",
      call_type: callType,
      message: message,
      session_id: callSession.id,
      invitation_id: callInvitation.id,
      priority,
      timestamp: new Date().toISOString()
    };

    // Send to both channels
    await Promise.all([
      userChannel.send({
        type: "broadcast",
        event: "patient-video-request",
        payload: notificationPayload,
      }),
      staffChannel.send({
        type: "broadcast",
        event: "incoming-patient-video-call",
        payload: notificationPayload,
      })
    ]);

    // Clean up channels
    supabase.removeChannel(userChannel);
    supabase.removeChannel(staffChannel);

    // Update conversation last message
    await supabase
      .from("conversations")
      .update({ 
        last_message: `📞 ${message}`, 
        last_message_at: new Date().toISOString()
      })
      .eq("id", conversationId);

    return NextResponse.json({ 
      callSession,
      callInvitation,
      callHistory,
      message: messageRecord,
      videoCallMessage,
      notification: {
        sent: true,
        channels: ["user", "staff"]
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await supabaseFromRoute();
    const { data: au } = await supabase.auth.getUser();
    if (!au.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversationId");
    const status = url.searchParams.get("status");
    const limit = parseInt(url.searchParams.get("limit") || "10");

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
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

    // Get call sessions for this conversation
    let query = supabase
      .from("call_sessions")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("started_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: callSessions, error: sessionError } = await query;

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }

    // Get call invitations
    const { data: invitations, error: inviteError } = await supabase
      .from("video_call_invitations")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("caller_id", au.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (inviteError) {
      console.warn("Failed to get call invitations:", inviteError);
    }

    return NextResponse.json({ 
      callSessions: callSessions || [],
      invitations: invitations || [],
      conversation: {
        id: conversation.id,
        provider_id: conversation.provider_id
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
