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
      content, 
      messageType = "text",
      autoInitiateCall = false,
      callType = "video",
      metadata = {}
    } = body;

    if (!conversationId || !content?.trim()) {
      return NextResponse.json({ error: "conversationId and content are required" }, { status: 400 });
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

    // Ensure user is the patient in this conversation
    if (conversation.patient_id !== au.user.id) {
      return NextResponse.json({ error: "access denied - patient only" }, { status: 403 });
    }

    // Check if message contains video call keywords
    const videoCallKeywords = [
      'video call', 'video chat', 'video meeting', 'video conference',
      'call me', 'video', 'face to face', 'meet online', 'video session',
      'video consultation', 'video appointment', 'video therapy'
    ];
    
    const shouldInitiateCall = autoInitiateCall || 
      videoCallKeywords.some(keyword => 
        content.toLowerCase().includes(keyword.toLowerCase())
      );

    let callSession = null;
    let callInvitation = null;

    // If video call should be initiated, create session and invitation
    if (shouldInitiateCall) {
      // Create call session
      const { data: session, error: sessionError } = await supabase
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
            auto_initiated: true,
            patient_message: content
          }
        })
        .select("*")
        .single();

      if (sessionError) {
        console.warn("Failed to create call session:", sessionError);
      } else {
        callSession = session;

        // Create call invitation
        const { data: invitation, error: inviteError } = await supabase
          .from("video_call_invitations")
          .insert({
            conversation_id: conversationId,
            caller_id: au.user.id,
            callee_id: conversation.provider_id,
            caller_name: au.user.user_metadata?.full_name || au.user.email || "Patient",
            caller_role: "patient",
            call_type: callType,
            message: `Patient requested: ${content}`,
            status: "pending",
            metadata: {
              ...metadata,
              auto_initiated: true,
              patient_message: content
            },
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
          })
          .select("*")
          .single();

        if (inviteError) {
          console.warn("Failed to create call invitation:", inviteError);
        } else {
          callInvitation = invitation;

          // Send real-time notification to staff
          const staffChannel = supabase.channel(`staff-calls-${conversation.provider_id}`, {
            config: { broadcast: { ack: true } },
          });

          await staffChannel.send({
            type: "broadcast",
            event: "patient-video-request",
            payload: {
              conversation_id: conversationId,
              patient_id: au.user.id,
              patient_name: au.user.user_metadata?.full_name || au.user.email || "Patient",
              message: content,
              call_type: callType,
              session_id: session.id,
              invitation_id: invitation.id,
              timestamp: new Date().toISOString()
            },
          });

          supabase.removeChannel(staffChannel);
        }
      }
    }

    // Create the message
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        patient_id: conversation.patient_id,
        sender_id: au.user.id,
        sender_name: au.user.user_metadata?.full_name || au.user.email || "Patient",
        sender_role: "patient",
        content: String(content).trim(),
        read: false,
        metadata: {
          ...metadata,
          message_type: messageType,
          video_call_initiated: shouldInitiateCall,
          session_id: callSession?.id,
          invitation_id: callInvitation?.id
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
        last_message: message.content, 
        last_message_at: message.created_at 
      })
      .eq("id", conversationId);

    // Create video call message if call was initiated
    let videoCallMessage = null;
    if (shouldInitiateCall && callSession) {
      const { data: vcMessage, error: vcError } = await supabase
        .from("video_call_messages")
        .insert({
          conversation_id: conversationId,
          session_id: callSession.id,
          sender_id: au.user.id,
          sender_name: au.user.user_metadata?.full_name || au.user.email || "Patient",
          sender_role: "patient",
          message_type: "call_action",
          content: `Patient initiated video call: ${content}`,
          metadata: {
            ...metadata,
            auto_initiated: true,
            original_message: content
          },
          read: false
        })
        .select("*")
        .single();

      if (vcError) {
        console.warn("Failed to create video call message:", vcError);
      } else {
        videoCallMessage = vcMessage;
      }
    }

    return NextResponse.json({ 
      message,
      videoCallMessage,
      callSession,
      callInvitation,
      videoCallInitiated: shouldInitiateCall,
      callType: shouldInitiateCall ? callType : null
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
    const includeVideoCalls = url.searchParams.get("includeVideoCalls") === "true";
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const before = url.searchParams.get("before");

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

    // Get messages
    let query = supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt("created_at", before);
    }

    const { data: messages, error: messageError } = await query;

    if (messageError) {
      return NextResponse.json({ error: messageError.message }, { status: 500 });
    }

    let videoCallData = null;
    if (includeVideoCalls) {
      // Get video call sessions for this conversation
      const { data: sessions, error: sessionError } = await supabase
        .from("call_sessions")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("started_at", { ascending: false })
        .limit(10);

      if (sessionError) {
        console.warn("Failed to get video call sessions:", sessionError);
      } else {
        videoCallData = sessions;
      }
    }

    return NextResponse.json({ 
      messages: (messages ?? []).reverse(),
      videoCallData,
      conversation: {
        id: conversation.id,
        provider_id: conversation.provider_id
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}