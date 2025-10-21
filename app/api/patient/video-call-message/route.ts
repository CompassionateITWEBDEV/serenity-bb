import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRoute } from "@/lib/supabaseRoute";

export async function POST(req: NextRequest) {
  try {
    const supabase = supabaseFromRoute();
    const { data: au } = await supabase.auth.getUser();
    if (!au.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json();
    const { 
      conversationId, 
      message, 
      callType = "video",
      autoInitiateCall = true,
      metadata = {}
    } = body;

    if (!conversationId || !message?.trim()) {
      return NextResponse.json({ error: "conversationId and message are required" }, { status: 400 });
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

    // Verify user is the patient in this conversation
    if (conversation.patient_id !== au.user.id) {
      return NextResponse.json({ error: "access denied - only patients can use this endpoint" }, { status: 403 });
    }

    // Get patient information
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("user_id, first_name, last_name, email")
      .eq("user_id", au.user.id)
      .single();

    if (patientError || !patient) {
      return NextResponse.json({ error: "patient not found" }, { status: 404 });
    }

    const patientName = [patient.first_name, patient.last_name].filter(Boolean).join(" ") || 
                       patient.email || "Patient";

    // Create the message first
    const { data: chatMessage, error: messageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        patient_id: conversation.patient_id,
        sender_id: au.user.id,
        sender_name: patientName,
        sender_role: "patient",
        content: message.trim(),
        read: false,
        metadata: {
          ...metadata,
          video_call_related: true,
          call_type: callType
        }
      })
      .select("*")
      .single();

    if (messageError) {
      return NextResponse.json({ error: messageError.message }, { status: 500 });
    }

    // Update conversation last message
    await supabase
      .from("conversations")
      .update({ 
        last_message: message.trim(), 
        last_message_at: chatMessage.created_at 
      })
      .eq("id", conversationId);

    let callSession = null;
    let invitation = null;

    // If autoInitiateCall is true, automatically create video call session and invitation
    if (autoInitiateCall) {
      // Create call session with improved flow
      const { data: session, error: sessionError } = await supabase
        .from("call_sessions")
        .insert({
          conversation_id: conversationId,
          caller_id: au.user.id,
          callee_id: conversation.provider_id,
          call_type: callType,
          status: "initiated", // Start as initiated, will change to ringing when staff accepts
          started_at: new Date().toISOString(),
          metadata: {
            auto_initiated: true,
            message_id: chatMessage.id,
            systematic_flow: true, // Flag for improved flow
            ...metadata
          }
        })
        .select("*")
        .single();

      if (sessionError) {
        console.warn("Failed to create call session:", sessionError);
      } else {
        callSession = session;

        // Create call history entry
        await supabase
          .from("call_history")
          .insert({
            conversation_id: conversationId,
            caller_id: au.user.id,
            callee_id: conversation.provider_id,
            caller_name: patientName,
            callee_name: conversation.provider_name || "Staff",
            call_type: callType,
            status: "initiated",
            started_at: new Date().toISOString(),
          });

        // Create call invitation
        const { data: invite, error: inviteError } = await supabase
          .from("video_call_invitations")
          .insert({
            conversation_id: conversationId,
            caller_id: au.user.id,
            callee_id: conversation.provider_id,
            caller_name: patientName,
            caller_role: "patient",
            call_type: callType,
            message: `Patient wants to start a ${callType} call: "${message.trim()}"`,
            status: "pending",
            metadata: {
              auto_initiated: true,
              message_id: chatMessage.id,
              ...metadata
            },
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
          })
          .select("*")
          .single();

        if (inviteError) {
          console.warn("Failed to create call invitation:", inviteError);
        } else {
          invitation = invite;

          // Send real-time notification to staff
          const staffChannel = supabase.channel(`staff-calls-${conversation.provider_id}`, {
            config: { broadcast: { ack: true } },
          });

          const userChannel = supabase.channel(`user_${conversation.provider_id}`, {
            config: { broadcast: { ack: true } },
          });

          const notificationPayload = {
            type: "patient_video_call_request",
            invitation_id: invite.id,
            session_id: session.id,
            conversation_id: conversationId,
            caller_id: au.user.id,
            caller_name: patientName,
            caller_role: "patient",
            call_type: callType,
            message: message.trim(),
            timestamp: new Date().toISOString(),
            metadata
          };

          // Send to both channels
          await Promise.all([
            staffChannel.send({
              type: "broadcast",
              event: "patient-video-call-request",
              payload: notificationPayload,
            }),
            userChannel.send({
              type: "broadcast",
              event: "incoming-video-call",
              payload: notificationPayload,
            })
          ]);

          // Clean up channels
          supabase.removeChannel(staffChannel);
          supabase.removeChannel(userChannel);
        }
      }
    }

    return NextResponse.json({ 
      message: chatMessage,
      callSession,
      invitation,
      autoInitiated: autoInitiateCall
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = supabaseFromRoute();
    const { data: au } = await supabase.auth.getUser();
    if (!au.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversationId");
    const includeCallHistory = url.searchParams.get("includeCallHistory") === "true";

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
      return NextResponse.json({ error: "access denied" }, { status: 403 });
    }

    // Get messages with video call context
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("sender_id", au.user.id)
      .not("metadata->video_call_related", "is", null)
      .order("created_at", { ascending: false })
      .limit(20);

    if (messagesError) {
      return NextResponse.json({ error: messagesError.message }, { status: 500 });
    }

    let callHistory = null;
    if (includeCallHistory) {
      const { data: history, error: historyError } = await supabase
        .from("call_history")
        .select("*")
        .eq("conversation_id", conversationId)
        .eq("caller_id", au.user.id)
        .order("started_at", { ascending: false })
        .limit(10);

      if (!historyError) {
        callHistory = history;
      }
    }

    return NextResponse.json({ 
      messages: messages || [],
      callHistory: callHistory || [],
      conversation: {
        id: conversation.id,
        provider_id: conversation.provider_id
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
