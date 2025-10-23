import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRoute } from "@/lib/supabaseRoute";

export async function GET(req: NextRequest) {
  try {
    const supabase = await supabaseFromRoute();
    const { data: au } = await supabase.auth.getUser();
    if (!au.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversationId");

    // Verify user is a patient
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("user_id, first_name, last_name")
      .eq("user_id", au.user.id)
      .single();

    if (patientError || !patient) {
      return NextResponse.json({ error: "Only patients can use this endpoint" }, { status: 403 });
    }

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
    }

    // Get active call session for this conversation
    const { data: activeSession, error: sessionError } = await supabase
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
      .eq("conversation_id", conversationId)
      .eq("caller_id", au.user.id)
      .in("status", ["initiated", "ringing", "connected"])
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }

    // Get pending invitations for this conversation
    const { data: pendingInvitations, error: inviteError } = await supabase
      .from("video_call_invitations")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("caller_id", au.user.id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }

    // Get recent call history for this conversation
    const { data: recentCalls, error: historyError } = await supabase
      .from("call_history")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("caller_id", au.user.id)
      .order("started_at", { ascending: false })
      .limit(5);

    if (historyError) {
      return NextResponse.json({ error: historyError.message }, { status: 500 });
    }

    // Check if provider is available for calls
    const { data: providerStatus, error: providerError } = await supabase
      .from("user_status")
      .select("online, last_seen")
      .eq("user_id", activeSession?.conversations?.provider_id)
      .single();

    if (providerError) {
      console.warn("Failed to get provider status:", providerError);
    }

    return NextResponse.json({
      activeSession,
      pendingInvitations: pendingInvitations || [],
      recentCalls: recentCalls || [],
      providerStatus: providerStatus || { online: false, last_seen: null },
      patientInfo: {
        id: au.user.id,
        name: [patient.first_name, patient.last_name].filter(Boolean).join(" ") || "Patient"
      },
      timestamp: new Date().toISOString(),
      canInitiateCall: !activeSession && (pendingInvitations?.length || 0) === 0
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseFromRoute();
    const { data: au } = await supabase.auth.getUser();
    if (!au.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json();
    const { conversationId, action, metadata = {} } = body;

    if (!conversationId || !action) {
      return NextResponse.json({ error: "conversationId and action are required" }, { status: 400 });
    }

    // Verify user is a patient
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("user_id")
      .eq("user_id", au.user.id)
      .single();

    if (patientError || !patient) {
      return NextResponse.json({ error: "Only patients can use this endpoint" }, { status: 403 });
    }

    const validActions = ["join", "leave", "mute", "unmute", "camera_on", "camera_off", "end_call"];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Get active session
    const { data: activeSession, error: sessionError } = await supabase
      .from("call_sessions")
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
      .eq("conversation_id", conversationId)
      .eq("caller_id", au.user.id)
      .in("status", ["initiated", "ringing", "connected"])
      .order("started_at", { ascending: false })
      .limit(1)
      .single();

    if (sessionError || !activeSession) {
      return NextResponse.json({ error: "No active call session found" }, { status: 404 });
    }

    // Update session metadata with action
    const updatedMetadata = {
      ...activeSession.metadata,
      [action]: {
        user_id: au.user.id,
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };

    let updateData: any = { 
      metadata: updatedMetadata,
      updated_at: new Date().toISOString()
    };

    // Handle specific actions
    if (action === "end_call") {
      updateData.status = "ended";
      updateData.ended_at = new Date().toISOString();
      updateData.duration_seconds = Math.floor((new Date().getTime() - new Date(activeSession.started_at).getTime()) / 1000);
    }

    const { data: updatedSession, error: updateError } = await supabase
      .from("call_sessions")
      .update(updateData)
      .eq("id", activeSession.id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Update call history if call ended
    if (action === "end_call") {
      await supabase
        .from("call_history")
        .update({
          status: "ended",
          ended_at: updateData.ended_at,
          duration_seconds: updateData.duration_seconds
        })
        .eq("conversation_id", conversationId)
        .eq("caller_id", au.user.id)
        .eq("status", "initiated");
    }

    // Send real-time update to provider
    const providerId = activeSession.conversations?.provider_id;
    if (providerId) {
      const userChannel = supabase.channel(`user_${providerId}`, {
        config: { broadcast: { ack: true } },
      });

      await userChannel.send({
        type: "broadcast",
        event: "patient-call-status-update",
        payload: {
          session_id: activeSession.id,
          conversation_id: conversationId,
          action,
          user_id: au.user.id,
          metadata,
          timestamp: new Date().toISOString()
        },
      });

      supabase.removeChannel(userChannel);
    }

    return NextResponse.json({ 
      session: updatedSession,
      action,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
