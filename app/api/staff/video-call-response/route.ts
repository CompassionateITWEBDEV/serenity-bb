import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRoute } from "@/lib/supabaseRoute";

export async function POST(req: NextRequest) {
  try {
    const supabase = supabaseFromRoute();
    const { data: au } = await supabase.auth.getUser();
    if (!au.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json();
    const { 
      invitationId, 
      response, // "accepted" or "declined"
      message = "",
      metadata = {}
    } = body;

    if (!invitationId || !response) {
      return NextResponse.json({ error: "invitationId and response are required" }, { status: 400 });
    }

    if (!["accepted", "declined"].includes(response)) {
      return NextResponse.json({ error: "response must be 'accepted' or 'declined'" }, { status: 400 });
    }

    // Verify staff user
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("user_id, first_name, last_name, role, department")
      .eq("user_id", au.user.id)
      .single();

    if (staffError || !staff) {
      return NextResponse.json({ error: "staff not found" }, { status: 404 });
    }

    const staffName = [staff.first_name, staff.last_name].filter(Boolean).join(" ") || 
                     au.user.email || "Staff";

    // Get the invitation
    const { data: invitation, error: inviteError } = await supabase
      .from("video_call_invitations")
      .select("*")
      .eq("id", invitationId)
      .eq("callee_id", au.user.id) // Ensure staff can only respond to their invitations
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json({ error: "invitation not found" }, { status: 404 });
    }

    // Check if invitation is still valid
    if (invitation.status !== "pending") {
      return NextResponse.json({ error: "invitation already responded to" }, { status: 400 });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: "invitation has expired" }, { status: 400 });
    }

    // Update invitation status
    const { data: updatedInvitation, error: updateError } = await supabase
      .from("video_call_invitations")
      .update({ 
        status: response,
        responded_at: new Date().toISOString(),
        metadata: {
          ...invitation.metadata,
          staff_response: {
            staff_id: au.user.id,
            staff_name: staffName,
            response,
            message,
            timestamp: new Date().toISOString(),
            ...metadata
          }
        }
      })
      .eq("id", invitationId)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Update call session if accepted
    let updatedSession = null;
    if (response === "accepted") {
      const { data: session, error: sessionError } = await supabase
        .from("call_sessions")
        .update({
          status: "ringing",
          metadata: {
            ...invitation.metadata,
            staff_accepted: true,
            staff_id: au.user.id,
            staff_name: staffName,
            accepted_at: new Date().toISOString()
          }
        })
        .eq("conversation_id", invitation.conversation_id)
        .eq("caller_id", invitation.caller_id)
        .eq("callee_id", invitation.callee_id)
        .eq("status", "initiated")
        .select("*")
        .single();

      if (sessionError) {
        console.warn("Failed to update call session:", sessionError);
      } else {
        updatedSession = session;
      }

      // Update call history
      await supabase
        .from("call_history")
        .update({
          status: "ringing",
          metadata: {
            staff_accepted: true,
            staff_id: au.user.id,
            staff_name: staffName,
            accepted_at: new Date().toISOString()
          }
        })
        .eq("conversation_id", invitation.conversation_id)
        .eq("caller_id", invitation.caller_id)
        .eq("callee_id", invitation.callee_id)
        .eq("status", "initiated");
    }

    // Create response message
    const responseMessage = response === "accepted" 
      ? `Staff ${staffName} accepted your ${invitation.call_type} call request. ${message}`.trim()
      : `Staff ${staffName} declined your ${invitation.call_type} call request. ${message}`.trim();

    const { data: chatMessage, error: messageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: invitation.conversation_id,
        patient_id: invitation.caller_id, // The patient who made the request
        sender_id: au.user.id,
        sender_name: staffName,
        sender_role: staff.role?.toLowerCase().includes("doc") ? "doctor" : 
                    staff.role?.toLowerCase().includes("counsel") ? "counselor" : "nurse",
        content: responseMessage,
        read: false,
        metadata: {
          video_call_response: true,
          invitation_id: invitationId,
          response,
          call_type: invitation.call_type,
          ...metadata
        }
      })
      .select("*")
      .single();

    if (messageError) {
      console.warn("Failed to create response message:", messageError);
    }

    // Update conversation last message
    await supabase
      .from("conversations")
      .update({ 
        last_message: responseMessage, 
        last_message_at: new Date().toISOString()
      })
      .eq("id", invitation.conversation_id);

    // Send real-time notification back to patient
    const patientChannel = supabase.channel(`user_${invitation.caller_id}`, {
      config: { broadcast: { ack: true } },
    });

    await patientChannel.send({
      type: "broadcast",
      event: "video-call-response",
      payload: {
        invitation_id: invitationId,
        conversation_id: invitation.conversation_id,
        callee_id: au.user.id,
        callee_name: staffName,
        response,
        message,
        call_type: invitation.call_type,
        session: updatedSession,
        timestamp: new Date().toISOString(),
        metadata
      },
    });

    supabase.removeChannel(patientChannel);

    return NextResponse.json({ 
      invitation: updatedInvitation,
      session: updatedSession,
      message: chatMessage,
      response
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

    // Verify staff user
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("user_id")
      .eq("user_id", au.user.id)
      .single();

    if (staffError || !staff) {
      return NextResponse.json({ error: "staff not found" }, { status: 404 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "pending";
    const limit = parseInt(url.searchParams.get("limit") || "20");

    // Get pending video call invitations for this staff member
    const { data: invitations, error: inviteError } = await supabase
      .from("video_call_invitations")
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
      .eq("callee_id", au.user.id)
      .eq("status", status)
      .gt("expires_at", new Date().toISOString()) // Only non-expired invitations
      .order("created_at", { ascending: false })
      .limit(limit);

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      invitations: invitations || [],
      count: invitations?.length || 0
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
