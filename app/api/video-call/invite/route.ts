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
      calleeId, 
      callType = "video",
      message = "Incoming video call",
      metadata = {}
    } = body;

    if (!conversationId || !calleeId) {
      return NextResponse.json({ error: "conversationId and calleeId are required" }, { status: 400 });
    }

    // Verify conversation exists and user has access
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id, patient_id, provider_id, provider_name, provider_role")
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: "conversation not found" }, { status: 404 });
    }

    // Check if user is part of this conversation
    if (![conversation.patient_id, conversation.provider_id].includes(au.user.id)) {
      return NextResponse.json({ error: "access denied" }, { status: 403 });
    }

    // Get caller information
    const { data: staff } = await supabase
      .from("staff")
      .select("role, department, first_name, last_name")
      .eq("user_id", au.user.id)
      .maybeSingle();

    const role = (staff?.role ?? staff?.department ?? "").toString().toLowerCase();
    const sender_role = role.includes("doc") ? "doctor" : 
                       role.includes("counsel") ? "counselor" : 
                       role.includes("nurse") ? "nurse" : "patient";
    
    const callerName = staff ? 
      [staff.first_name, staff.last_name].filter(Boolean).join(" ") || "Staff" :
      (au.user.user_metadata?.full_name as string) || au.user.email || "User";

    // Create call invitation
    const { data: invitation, error: inviteError } = await supabase
      .from("video_call_invitations")
      .insert({
        conversation_id: conversationId,
        caller_id: au.user.id,
        callee_id: calleeId,
        caller_name: callerName,
        caller_role: sender_role,
        call_type: callType,
        message,
        status: "pending",
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString()
        },
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
      })
      .select("*")
      .single();

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }

    // Send real-time notification via Supabase channels
    const userChannel = supabase.channel(`user_${calleeId}`, {
      config: { broadcast: { ack: true } },
    });

    const staffChannel = supabase.channel(`staff-calls-${calleeId}`, {
      config: { broadcast: { ack: true } },
    });

    const notificationPayload = {
      type: "video_call_invitation",
      invitation_id: invitation.id,
      conversation_id: conversationId,
      caller_id: au.user.id,
      caller_name: callerName,
      caller_role: sender_role,
      call_type: callType,
      message,
      timestamp: new Date().toISOString(),
      metadata
    };

    try {
      // Subscribe to both channels first
      await Promise.all([
        new Promise<void>((res, rej) => {
          const to = setTimeout(() => rej(new Error("user channel timeout")), 5000);
          userChannel.subscribe((s) => {
            if (s === "SUBSCRIBED") {
              clearTimeout(to);
              res();
            }
            if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") {
              clearTimeout(to);
              rej(new Error(String(s)));
            }
          });
        }),
        new Promise<void>((res, rej) => {
          const to = setTimeout(() => rej(new Error("staff channel timeout")), 5000);
          staffChannel.subscribe((s) => {
            if (s === "SUBSCRIBED") {
              clearTimeout(to);
              res();
            }
            if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") {
              clearTimeout(to);
              rej(new Error(String(s)));
            }
          });
        })
      ]);

      // Send to user channel
      await userChannel.send({
        type: "broadcast",
        event: "video-call-invitation",
        payload: notificationPayload,
      });

      // Send to staff channel
      await staffChannel.send({
        type: "broadcast",
        event: "incoming-video-call",
        payload: notificationPayload,
      });

      // Also send the old format for compatibility
      await userChannel.send({
        type: "broadcast",
        event: "invite",
        payload: { 
          conversationId, 
          fromId: au.user.id, 
          fromName: callerName, 
          mode: callType 
        },
      });

      await staffChannel.send({
        type: "broadcast",
        event: "incoming-call",
        payload: {
          conversationId,
          callerId: au.user.id,
          callerName,
          mode: callType,
          timestamp: new Date().toISOString(),
        },
      });

    } catch (error) {
      console.error("Failed to send notifications:", error);
    } finally {
      // Clean up channels
      try {
        supabase.removeChannel(userChannel);
        supabase.removeChannel(staffChannel);
      } catch {}
    }

    return NextResponse.json({ invitation });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await supabaseFromRoute();
    const { data: au } = await supabase.auth.getUser();
    if (!au.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json();
    const { invitationId, status } = body;

    if (!invitationId || !status) {
      return NextResponse.json({ error: "invitationId and status are required" }, { status: 400 });
    }

    if (!["accepted", "declined", "expired"].includes(status)) {
      return NextResponse.json({ error: "Invalid status. Must be accepted, declined, or expired" }, { status: 400 });
    }

    // Update invitation status
    const { data: invitation, error: updateError } = await supabase
      .from("video_call_invitations")
      .update({ 
        status,
        responded_at: new Date().toISOString()
      })
      .eq("id", invitationId)
      .eq("callee_id", au.user.id) // Ensure user can only respond to their invitations
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Send response notification back to caller
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
        status,
        timestamp: new Date().toISOString()
      },
    });

    supabase.removeChannel(callerChannel);

    return NextResponse.json({ invitation });

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

    let query = supabase
      .from("video_call_invitations")
      .select("*")
      .or(`caller_id.eq.${au.user.id},callee_id.eq.${au.user.id}`)
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

    return NextResponse.json({ invitations });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
