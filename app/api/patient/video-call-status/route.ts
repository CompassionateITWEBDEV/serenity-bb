import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRoute } from "@/lib/supabaseRoute";

export async function GET(req: NextRequest) {
  try {
    const supabase = supabaseFromRoute();
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
      return NextResponse.json({ error: "access denied" }, { status: 403 });
    }

    // Get active call session
    const { data: activeSession, error: sessionError } = await supabase
      .from("call_sessions")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("caller_id", au.user.id)
      .in("status", ["initiated", "ringing", "connected"])
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError) {
      console.warn("Failed to get active session:", sessionError);
    }

    // Get pending invitations
    const { data: pendingInvitations, error: inviteError } = await supabase
      .from("video_call_invitations")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("caller_id", au.user.id)
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
      .eq("caller_id", au.user.id)
      .order("started_at", { ascending: false })
      .limit(5);

    if (historyError) {
      console.warn("Failed to get call history:", historyError);
    }

    // Get recent video call related messages
    const { data: videoMessages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .not("metadata->video_call_related", "is", null)
      .order("created_at", { ascending: false })
      .limit(10);

    if (messagesError) {
      console.warn("Failed to get video messages:", messagesError);
    }

    // Calculate call statistics
    const { data: allCalls, error: statsError } = await supabase
      .from("call_history")
      .select("call_type, status, duration_seconds")
      .eq("conversation_id", conversationId)
      .eq("caller_id", au.user.id);

    const statistics = {
      total_calls: allCalls?.length || 0,
      video_calls: allCalls?.filter(call => call.call_type === "video").length || 0,
      audio_calls: allCalls?.filter(call => call.call_type === "audio").length || 0,
      completed_calls: allCalls?.filter(call => call.status === "ended").length || 0,
      missed_calls: allCalls?.filter(call => call.status === "missed").length || 0,
      declined_calls: allCalls?.filter(call => call.status === "declined").length || 0,
      total_duration: allCalls?.reduce((total, call) => total + (call.duration_seconds || 0), 0) || 0,
      average_duration: 0
    };

    if (statistics.completed_calls > 0) {
      const completedCalls = allCalls?.filter(call => call.status === "ended") || [];
      const totalDuration = completedCalls.reduce((total, call) => total + (call.duration_seconds || 0), 0);
      statistics.average_duration = Math.round(totalDuration / completedCalls.length);
    }

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        provider_id: conversation.provider_id,
        provider_name: conversation.provider_name,
        provider_role: conversation.provider_role
      },
      activeSession,
      pendingInvitations: pendingInvitations || [],
      recentCalls: recentCalls || [],
      videoMessages: videoMessages || [],
      statistics,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = supabaseFromRoute();
    const { data: au } = await supabase.auth.getUser();
    if (!au.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json();
    const { 
      conversationId, 
      action, // "cancel_request", "resend_invitation", "update_message"
      invitationId,
      message,
      metadata = {}
    } = body;

    if (!conversationId || !action) {
      return NextResponse.json({ error: "conversationId and action are required" }, { status: 400 });
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

    let result = {};

    switch (action) {
      case "cancel_request":
        if (!invitationId) {
          return NextResponse.json({ error: "invitationId is required for cancel_request" }, { status: 400 });
        }

        // Cancel the invitation
        const { data: cancelledInvite, error: cancelError } = await supabase
          .from("video_call_invitations")
          .update({ 
            status: "cancelled",
            metadata: {
              ...metadata,
              cancelled_at: new Date().toISOString(),
              cancelled_by: "patient"
            }
          })
          .eq("id", invitationId)
          .eq("caller_id", au.user.id)
          .select("*")
          .single();

        if (cancelError) {
          return NextResponse.json({ error: cancelError.message }, { status: 500 });
        }

        result = { cancelledInvitation: cancelledInvite };
        break;

      case "resend_invitation":
        if (!invitationId) {
          return NextResponse.json({ error: "invitationId is required for resend_invitation" }, { status: 400 });
        }

        // Get the original invitation
        const { data: originalInvite, error: getError } = await supabase
          .from("video_call_invitations")
          .select("*")
          .eq("id", invitationId)
          .eq("caller_id", au.user.id)
          .single();

        if (getError || !originalInvite) {
          return NextResponse.json({ error: "original invitation not found" }, { status: 404 });
        }

        // Create a new invitation
        const { data: newInvite, error: resendError } = await supabase
          .from("video_call_invitations")
          .insert({
            conversation_id: conversationId,
            caller_id: au.user.id,
            callee_id: originalInvite.callee_id,
            caller_name: originalInvite.caller_name,
            caller_role: originalInvite.caller_role,
            call_type: originalInvite.call_type,
            message: message || originalInvite.message,
            status: "pending",
            metadata: {
              ...originalInvite.metadata,
              ...metadata,
              resend_count: (originalInvite.metadata?.resend_count || 0) + 1,
              original_invitation_id: invitationId,
              resent_at: new Date().toISOString()
            },
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
          })
          .select("*")
          .single();

        if (resendError) {
          return NextResponse.json({ error: resendError.message }, { status: 500 });
        }

        result = { newInvitation: newInvite };
        break;

      case "update_message":
        if (!invitationId || !message) {
          return NextResponse.json({ error: "invitationId and message are required for update_message" }, { status: 400 });
        }

        // Update the invitation message
        const { data: updatedInvite, error: updateError } = await supabase
          .from("video_call_invitations")
          .update({ 
            message,
            metadata: {
              ...metadata,
              message_updated_at: new Date().toISOString()
            }
          })
          .eq("id", invitationId)
          .eq("caller_id", au.user.id)
          .select("*")
          .single();

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        result = { updatedInvitation: updatedInvite };
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true,
      action,
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
