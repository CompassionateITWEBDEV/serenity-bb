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
      message, 
      callType = "video",
      autoRedirect = true,
      metadata = {}
    } = body;

    if (!conversationId || !message?.trim()) {
      return NextResponse.json({ error: "conversationId and message are required" }, { status: 400 });
    }

    // Verify user is a patient
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("user_id, first_name, last_name")
      .eq("user_id", au.user.id)
      .single();

    if (patientError || !patient) {
      return NextResponse.json({ error: "Only patients can use this endpoint" }, { status: 403 });
    }

    // Verify conversation exists and get provider info
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select(`
        id, 
        patient_id, 
        provider_id, 
        provider_name, 
        provider_role,
        provider_avatar
      `)
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: "conversation not found" }, { status: 404 });
    }

    // Check if user is part of this conversation
    if (conversation.patient_id !== au.user.id) {
      return NextResponse.json({ error: "access denied" }, { status: 403 });
    }

    const patientName = [patient.first_name, patient.last_name].filter(Boolean).join(" ") || "Patient";

    // Create video call session
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
          auto_redirect: autoRedirect
        }
      })
      .select("*")
      .single();

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }

    // Create call history entry
    const { data: callHistory, error: historyError } = await supabase
      .from("call_history")
      .insert({
        conversation_id: conversationId,
        caller_id: au.user.id,
        callee_id: conversation.provider_id,
        caller_name: patientName,
        callee_name: conversation.provider_name,
        call_type: callType,
        status: "initiated",
        started_at: new Date().toISOString(),
        notes: `Patient message: ${message}`
      })
      .select("*")
      .single();

    if (historyError) {
      console.warn("Failed to create call history:", historyError);
    }

    // Create video call invitation
    const { data: invitation, error: inviteError } = await supabase
      .from("video_call_invitations")
      .insert({
        conversation_id: conversationId,
        caller_id: au.user.id,
        callee_id: conversation.provider_id,
        caller_name: patientName,
        caller_role: "patient",
        call_type: callType,
        message: `Patient wants to start a ${callType} call: ${message}`,
        status: "pending",
        metadata: {
          ...metadata,
          patient_message: message,
          auto_redirect: autoRedirect
        },
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
      })
      .select("*")
      .single();

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }

    // Send real-time notification to staff
    const staffChannel = supabase.channel(`staff-calls-${conversation.provider_id}`, {
      config: { broadcast: { ack: true } },
    });

    const userChannel = supabase.channel(`user_${conversation.provider_id}`, {
      config: { broadcast: { ack: true } },
    });

    const notificationPayload = {
      type: "patient_video_call_request",
      invitation_id: invitation.id,
      session_id: callSession.id,
      conversation_id: conversationId,
      caller_id: au.user.id,
      caller_name: patientName,
      caller_role: "patient",
      call_type: callType,
      message: `Patient wants to start a ${callType} call: ${message}`,
      timestamp: new Date().toISOString(),
      auto_redirect: autoRedirect,
      metadata
    };

    // Send to staff channel
    await staffChannel.send({
      type: "broadcast",
      event: "patient-video-call-request",
      payload: notificationPayload,
    });

    // Send to user channel
    await userChannel.send({
      type: "broadcast",
      event: "incoming-patient-video-call",
      payload: notificationPayload,
    });

    // Clean up channels
    supabase.removeChannel(staffChannel);
    supabase.removeChannel(userChannel);

    // Create a regular message in the conversation
    const { data: chatMessage, error: chatError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        patient_id: au.user.id,
        sender_id: au.user.id,
        sender_name: patientName,
        sender_role: "patient",
        content: `[Video Call Request] ${message}`,
        read: false,
        metadata: {
          video_call_request: true,
          session_id: callSession.id,
          invitation_id: invitation.id,
          call_type: callType,
          auto_redirect: autoRedirect
        }
      })
      .select("*")
      .single();

    if (chatError) {
      console.warn("Failed to create chat message:", chatError);
    }

    // Update conversation last message
    await supabase
      .from("conversations")
      .update({ 
        last_message: `[Video Call Request] ${message}`, 
        last_message_at: new Date().toISOString()
      })
      .eq("id", conversationId);

    return NextResponse.json({ 
      success: true,
      session: callSession,
      invitation,
      chatMessage,
      callHistory,
      redirect_url: autoRedirect ? `/call/${conversationId}?role=caller&mode=${callType}&peer=${conversation.provider_id}&peerName=${conversation.provider_name}` : null
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

    // Verify user is a patient
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("user_id")
      .eq("user_id", au.user.id)
      .single();

    if (patientError || !patient) {
      return NextResponse.json({ error: "Only patients can use this endpoint" }, { status: 403 });
    }

    let query = supabase
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
      .order("started_at", { ascending: false });

    if (conversationId) {
      query = query.eq("conversation_id", conversationId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data: sessions, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get pending invitations
    const { data: invitations, error: inviteError } = await supabase
      .from("video_call_invitations")
      .select("*")
      .eq("caller_id", au.user.id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (inviteError) {
      console.warn("Failed to get invitations:", inviteError);
    }

    return NextResponse.json({ 
      sessions: sessions || [],
      invitations: invitations || [],
      patient_id: au.user.id
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
