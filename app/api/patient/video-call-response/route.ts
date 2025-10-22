import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRoute } from "@/lib/supabaseRoute";

export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseFromRoute();
    const { data: au } = await supabase.auth.getUser();
    if (!au.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json();
    const { invitationId, response, message = "" } = body;

    if (!invitationId || !response) {
      return NextResponse.json({ error: "invitationId and response are required" }, { status: 400 });
    }

    if (!["accepted", "declined", "busy"].includes(response)) {
      return NextResponse.json({ error: "Invalid response. Must be accepted, declined, or busy" }, { status: 400 });
    }

    // Get the invitation
    const { data: invitation, error: inviteError } = await supabase
      .from("video_call_invitations")
      .select("*")
      .eq("id", invitationId)
      .eq("callee_id", au.user.id)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    // Check if invitation is still valid
    if (invitation.status !== "pending") {
      return NextResponse.json({ error: "Invitation is no longer pending" }, { status: 400 });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: "Invitation has expired" }, { status: 400 });
    }

    // Update invitation status
    const { data: updatedInvitation, error: updateError } = await supabase
      .from("video_call_invitations")
      .update({ 
        status: response,
        responded_at: new Date().toISOString(),
        response_message: message
      })
      .eq("id", invitationId)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Update call session if accepted
    if (response === "accepted") {
      const { data: session, error: sessionError } = await supabase
        .from("call_sessions")
        .update({ 
          status: "connected",
          connected_at: new Date().toISOString()
        })
        .eq("conversation_id", invitation.conversation_id)
        .eq("caller_id", invitation.caller_id)
        .eq("callee_id", au.user.id)
        .select("*")
        .single();

      if (sessionError) {
        console.warn("Failed to update call session:", sessionError);
      }

      // Create a message in the conversation
      const { data: messageRecord, error: messageError } = await supabase
        .from("messages")
        .insert({
          conversation_id: invitation.conversation_id,
          patient_id: au.user.id,
          sender_id: au.user.id,
          sender_name: au.user.user_metadata?.full_name || au.user.email || "Patient",
          sender_role: "patient",
          content: `✅ Accepted video call${message ? `: ${message}` : ""}`,
          read: false,
          metadata: {
            video_call_response: true,
            invitation_id: invitationId,
            response: "accepted"
          }
        })
        .select("*")
        .single();

      if (messageError) {
        console.warn("Failed to create message:", messageError);
      }

      // Send real-time notification to caller
      const callerChannel = supabase.channel(`user_${invitation.caller_id}`, {
        config: { broadcast: { ack: true } },
      });

      await callerChannel.send({
        type: "broadcast",
        event: "video-call-accepted",
        payload: {
          invitation_id: invitationId,
          conversation_id: invitation.conversation_id,
          callee_id: au.user.id,
          callee_name: au.user.user_metadata?.full_name || au.user.email || "Patient",
          response: "accepted",
          message,
          session_id: session?.id,
          timestamp: new Date().toISOString()
        },
      });

      supabase.removeChannel(callerChannel);

      return NextResponse.json({ 
        invitation: updatedInvitation,
        session,
        message: messageRecord,
        response: "accepted",
        timestamp: new Date().toISOString()
      });
    }

    // Handle declined or busy responses
    const { data: session, error: sessionError } = await supabase
      .from("call_sessions")
      .update({ 
        status: response === "declined" ? "declined" : "missed",
        ended_at: new Date().toISOString()
      })
      .eq("conversation_id", invitation.conversation_id)
      .eq("caller_id", invitation.caller_id)
      .eq("callee_id", au.user.id)
      .select("*")
      .single();

    if (sessionError) {
      console.warn("Failed to update call session:", sessionError);
    }

    // Create a message in the conversation
    const responseMessages: Record<string, string> = {
      declined: "❌ Declined video call",
      busy: "⏰ Patient is busy, please try again later"
    };

    const { data: messageRecord, error: messageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: invitation.conversation_id,
        patient_id: au.user.id,
        sender_id: au.user.id,
        sender_name: au.user.user_metadata?.full_name || au.user.email || "Patient",
        sender_role: "patient",
        content: `${responseMessages[response]}${message ? `: ${message}` : ""}`,
        read: false,
        metadata: {
          video_call_response: true,
          invitation_id: invitationId,
          response
        }
      })
      .select("*")
      .single();

    if (messageError) {
      console.warn("Failed to create message:", messageError);
    }

    // Send real-time notification to caller
    const callerChannel = supabase.channel(`user_${invitation.caller_id}`, {
      config: { broadcast: { ack: true } },
    });

    await callerChannel.send({
      type: "broadcast",
      event: "video-call-response",
      payload: {
        invitation_id: invitationId,
        conversation_id: invitation.conversation_id,
        callee_id: au.user.id,
        callee_name: au.user.user_metadata?.full_name || au.user.email || "Patient",
        response,
        message,
        session_id: session?.id,
        timestamp: new Date().toISOString()
      },
    });

    supabase.removeChannel(callerChannel);

    return NextResponse.json({ 
      invitation: updatedInvitation,
      session,
      message: messageRecord,
      response,
      timestamp: new Date().toISOString()
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

    // Get invitations where user is the callee
    let query = supabase
      .from("video_call_invitations")
      .select("*")
      .eq("callee_id", au.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (conversationId) {
      query = query.eq("conversation_id", conversationId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data: invitations, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      invitations: invitations || [],
      total: invitations?.length || 0
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
