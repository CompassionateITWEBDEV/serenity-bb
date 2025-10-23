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

    if (!["accepted", "declined"].includes(response)) {
      return NextResponse.json({ error: "Response must be 'accepted' or 'declined'" }, { status: 400 });
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

    // Get the invitation
    const { data: invitation, error: inviteError } = await supabase
      .from("video_call_invitations")
      .select("*")
      .eq("id", invitationId)
      .eq("caller_id", au.user.id) // Patient is the caller in this case
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    if (invitation.status !== "pending") {
      return NextResponse.json({ error: "Invitation has already been responded to" }, { status: 400 });
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: "Invitation has expired" }, { status: 400 });
    }

    // Update invitation status
    const { data: updatedInvitation, error: updateError } = await supabase
      .from("video_call_invitations")
      .update({ 
        status: response,
        responded_at: new Date().toISOString(),
        metadata: {
          ...invitation.metadata,
          response_message: message,
          responded_by: au.user.id
        }
      })
      .eq("id", invitationId)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Update call session status
    const { data: session, error: sessionError } = await supabase
      .from("call_sessions")
      .update({
        status: response === "accepted" ? "connected" : "declined",
        ...(response === "declined" && { ended_at: new Date().toISOString() })
      })
      .eq("conversation_id", invitation.conversation_id)
      .eq("caller_id", au.user.id)
      .eq("status", "initiated")
      .select("*")
      .single();

    if (sessionError) {
      console.warn("Failed to update call session:", sessionError);
    }

    // Update call history
    await supabase
      .from("call_history")
      .update({
        status: response === "accepted" ? "connected" : "declined",
        ...(response === "declined" && { 
          ended_at: new Date().toISOString(),
          notes: `Patient ${response}: ${message}`.trim()
        })
      })
      .eq("conversation_id", invitation.conversation_id)
      .eq("caller_id", au.user.id)
      .eq("status", "initiated");

    // Send response notification to provider
    const providerId = invitation.callee_id;
    const userChannel = supabase.channel(`user_${providerId}`, {
      config: { broadcast: { ack: true } },
    });

    const staffChannel = supabase.channel(`staff-calls-${providerId}`, {
      config: { broadcast: { ack: true } },
    });

    const notificationPayload = {
      type: "patient_video_call_response",
      invitation_id: invitationId,
      conversation_id: invitation.conversation_id,
      caller_id: au.user.id,
      caller_name: [patient.first_name, patient.last_name].filter(Boolean).join(" ") || "Patient",
      response,
      message,
      timestamp: new Date().toISOString(),
      session_id: session?.id
    };

    // Send to user channel
    await userChannel.send({
      type: "broadcast",
      event: "patient-video-call-response",
      payload: notificationPayload,
    });

    // Send to staff channel
    await staffChannel.send({
      type: "broadcast",
      event: "patient-call-response",
      payload: notificationPayload,
    });

    // Clean up channels
    supabase.removeChannel(userChannel);
    supabase.removeChannel(staffChannel);

    // Create a message in the conversation
    const { data: chatMessage, error: chatError } = await supabase
      .from("messages")
      .insert({
        conversation_id: invitation.conversation_id,
        patient_id: au.user.id,
        sender_id: au.user.id,
        sender_name: [patient.first_name, patient.last_name].filter(Boolean).join(" ") || "Patient",
        sender_role: "patient",
        content: `[Video Call ${response === "accepted" ? "Accepted" : "Declined"}] ${message || `Patient ${response} the video call`}`,
        read: false,
        metadata: {
          video_call_response: true,
          invitation_id: invitationId,
          response,
          session_id: session?.id
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
        last_message: `[Video Call ${response === "accepted" ? "Accepted" : "Declined"}] ${message || `Patient ${response} the video call`}`, 
        last_message_at: new Date().toISOString()
      })
      .eq("id", invitation.conversation_id);

    return NextResponse.json({ 
      success: true,
      invitation: updatedInvitation,
      session,
      chatMessage,
      redirect_url: response === "accepted" ? 
        `/call/${invitation.conversation_id}?role=caller&mode=${invitation.call_type}&peer=${invitation.callee_id}&peerName=${invitation.caller_name}` : 
        null
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
      .from("video_call_invitations")
      .select("*")
      .eq("caller_id", au.user.id)
      .order("created_at", { ascending: false });

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
      patient_id: au.user.id
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
