import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRoute } from "@/lib/supabaseRoute";

export const runtime = "nodejs";

type EnsureConversationParams = { p_patient: string; p_provider: string };

export async function POST(req: NextRequest) {
  const supabase = supabaseFromRoute();
  const { data: au, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
  const me = au.user;
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let content = "";
  let videoCallRequest = false;
  let callType = "video";
  let autoRedirect = true;
  let metadata = {};

  try {
    const body = (await req.json()) as { 
      content?: unknown; 
      videoCallRequest?: boolean;
      callType?: string;
      autoRedirect?: boolean;
      metadata?: any;
    };
    content = String(body?.content ?? "").trim();
    videoCallRequest = Boolean(body?.videoCallRequest);
    callType = String(body?.callType ?? "video");
    autoRedirect = Boolean(body?.autoRedirect ?? true);
    metadata = body?.metadata || {};
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!content) return NextResponse.json({ error: "empty" }, { status: 400 });

  const { data: rel, error: relErr } = await supabase
    .from("patient_care_team")
    .select("staff_id, is_primary")
    .eq("patient_id", me.id)
    .order("is_primary", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (relErr) return NextResponse.json({ error: relErr.message }, { status: 400 });
  if (!rel?.staff_id) return NextResponse.json({ error: "no assigned staff" }, { status: 400 });

  const { data: convId, error: fnErr } = await supabase.rpc(
    "ensure_conversation",
    { p_patient: me.id, p_provider: rel.staff_id } as EnsureConversationParams
  );
  if (fnErr || !convId) return NextResponse.json({ error: fnErr?.message || "ensure failed" }, { status: 400 });

  const sender_name =
    (me.user_metadata?.full_name as string | undefined) ?? me.email ?? "Patient";

  let callSession = null;
  let invitation = null;

  // If this is a video call request, create the call session and invitation
  if (videoCallRequest) {
    // Create video call session
    const { data: session, error: sessionError } = await supabase
      .from("call_sessions")
      .insert({
        conversation_id: convId as unknown as string,
        caller_id: me.id,
        callee_id: rel.staff_id,
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
      console.warn("Failed to create call session:", sessionError);
    } else {
      callSession = session;
    }

    // Create call history entry
    const { data: callHistory, error: historyError } = await supabase
      .from("call_history")
      .insert({
        conversation_id: convId as unknown as string,
        caller_id: me.id,
        callee_id: rel.staff_id,
        caller_name: sender_name,
        callee_name: "Staff",
        call_type: callType,
        status: "initiated",
        started_at: new Date().toISOString(),
        notes: `Patient message: ${content}`
      })
      .select("*")
      .single();

    if (historyError) {
      console.warn("Failed to create call history:", historyError);
    }

    // Create video call invitation
    const { data: invite, error: inviteError } = await supabase
      .from("video_call_invitations")
      .insert({
        conversation_id: convId as unknown as string,
        caller_id: me.id,
        callee_id: rel.staff_id,
        caller_name: sender_name,
        caller_role: "patient",
        call_type: callType,
        message: `Patient wants to start a ${callType} call: ${content}`,
        status: "pending",
        metadata: {
          ...metadata,
          patient_message: content,
          auto_redirect: autoRedirect
        },
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
      })
      .select("*")
      .single();

    if (inviteError) {
      console.warn("Failed to create invitation:", inviteError);
    } else {
      invitation = invite;
    }

    // Send real-time notification to staff
    const staffChannel = supabase.channel(`staff-calls-${rel.staff_id}`, {
      config: { broadcast: { ack: true } },
    });

    const userChannel = supabase.channel(`user_${rel.staff_id}`, {
      config: { broadcast: { ack: true } },
    });

    const notificationPayload = {
      type: "patient_video_call_request",
      invitation_id: invite?.id,
      session_id: callSession?.id,
      conversation_id: convId,
      caller_id: me.id,
      caller_name: sender_name,
      caller_role: "patient",
      call_type: callType,
      message: `Patient wants to start a ${callType} call: ${content}`,
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
  }

  // Create the message
  const messageContent = videoCallRequest ? `[Video Call Request] ${content}` : content;
  const messageMetadata = videoCallRequest ? {
    video_call_request: true,
    session_id: callSession?.id,
    invitation_id: invitation?.id,
    call_type: callType,
    auto_redirect: autoRedirect,
    ...metadata
  } : {};

  const { data: msg, error: msgErr } = await supabase
    .from("messages")
    .insert({
      conversation_id: convId as unknown as string,
      patient_id: me.id,
      sender_id: me.id,
      sender_name,
      sender_role: "patient",
      content: messageContent,
      read: false,
      metadata: messageMetadata
    })
    .select("*")
    .single();
  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 400 });

  await supabase
    .from("conversations")
    .update({ last_message: msg.content, last_message_at: msg.created_at })
    .eq("id", convId as unknown as string);

  // Create staff notification for new message (async, don't block response)
  try {
    const { createMessageNotificationServer } = await import("@/lib/notifications/staff-notifications-server");
    
    // Get patient name for notification
    const { data: patientData } = await supabase
      .from("patients")
      .select("first_name, last_name, full_name")
      .eq("user_id", me.id)
      .single();
    
    const patientName = patientData?.full_name || 
      [patientData?.first_name, patientData?.last_name].filter(Boolean).join(" ").trim() || 
      "Patient";
    
    const messagePreview = content.length > 100 ? `${content.substring(0, 100)}...` : content;
    
    // Create notification for staff (runs async, won't block response)
    createMessageNotificationServer(
      me.id,
      msg.id,
      convId as unknown as string,
      patientName,
      messagePreview
    ).catch((err) => {
      console.error("Failed to create staff notification for message:", err);
    });
  } catch (error) {
    console.error("Error importing notification function:", error);
    // Don't fail the message send if notification fails
  }

  return NextResponse.json({ 
    conversationId: convId, 
    message: msg,
    ...(videoCallRequest && {
      callSession,
      invitation,
      redirect_url: autoRedirect ? `/call/${convId}?role=caller&mode=${callType}&peer=${rel.staff_id}&peerName=Staff` : null
    })
  });
}
