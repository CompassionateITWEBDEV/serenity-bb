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
      sessionId,
      action, // "accept", "reject", "start_call", "end_call"
      metadata = {}
    } = body;

    if (!conversationId || !action) {
      return NextResponse.json({ error: "conversationId and action are required" }, { status: 400 });
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

    let result = {};

    switch (action) {
      case "accept":
        // Staff accepts the call - automatically start the connection process
        const { data: session, error: sessionError } = await supabase
          .from("call_sessions")
          .update({
            status: "connected",
            metadata: {
              ...metadata,
              accepted_at: new Date().toISOString(),
              accepted_by: au.user.id,
              auto_connect: true
            }
          })
          .eq("conversation_id", conversationId)
          .eq("callee_id", au.user.id)
          .eq("status", "ringing")
          .select("*")
          .single();

        if (sessionError) {
          return NextResponse.json({ error: sessionError.message }, { status: 500 });
        }

        // Update call history
        await supabase
          .from("call_history")
          .update({
            status: "connected",
            metadata: {
              accepted_at: new Date().toISOString(),
              accepted_by: au.user.id,
              auto_connect: true
            }
          })
          .eq("conversation_id", conversationId)
          .eq("callee_id", au.user.id)
          .eq("status", "ringing");

        // Send real-time signal to start WebRTC connection
        const callerChannel = supabase.channel(`user_${conversation.patient_id}`, {
          config: { broadcast: { ack: true } },
        });

        await callerChannel.send({
          type: "broadcast",
          event: "call-accepted",
          payload: {
            session_id: session.id,
            conversation_id: conversationId,
            callee_id: au.user.id,
            action: "accept",
            auto_connect: true,
            timestamp: new Date().toISOString(),
            metadata
          },
        });

        supabase.removeChannel(callerChannel);

        result = { session, action: "accepted" };
        break;

      case "reject":
        // Staff rejects the call
        const { data: rejectedSession, error: rejectError } = await supabase
          .from("call_sessions")
          .update({
            status: "declined",
            ended_at: new Date().toISOString(),
            metadata: {
              ...metadata,
              rejected_at: new Date().toISOString(),
              rejected_by: au.user.id
            }
          })
          .eq("conversation_id", conversationId)
          .eq("callee_id", au.user.id)
          .eq("status", "ringing")
          .select("*")
          .single();

        if (rejectError) {
          return NextResponse.json({ error: rejectError.message }, { status: 500 });
        }

        // Update call history
        await supabase
          .from("call_history")
          .update({
            status: "declined",
            ended_at: new Date().toISOString(),
            metadata: {
              rejected_at: new Date().toISOString(),
              rejected_by: au.user.id
            }
          })
          .eq("conversation_id", conversationId)
          .eq("callee_id", au.user.id)
          .eq("status", "ringing");

        // Send real-time signal to caller
        const callerRejectChannel = supabase.channel(`user_${conversation.patient_id}`, {
          config: { broadcast: { ack: true } },
        });

        await callerRejectChannel.send({
          type: "broadcast",
          event: "call-rejected",
          payload: {
            session_id: rejectedSession.id,
            conversation_id: conversationId,
            callee_id: au.user.id,
            action: "reject",
            timestamp: new Date().toISOString(),
            metadata
          },
        });

        supabase.removeChannel(callerRejectChannel);

        result = { session: rejectedSession, action: "rejected" };
        break;

      case "start_call":
        // Patient starts the call - initiate WebRTC process
        const { data: startSession, error: startError } = await supabase
          .from("call_sessions")
          .update({
            status: "ringing",
            metadata: {
              ...metadata,
              call_started_at: new Date().toISOString(),
              started_by: au.user.id
            }
          })
          .eq("conversation_id", conversationId)
          .eq("caller_id", au.user.id)
          .eq("status", "initiated")
          .select("*")
          .single();

        if (startError) {
          return NextResponse.json({ error: startError.message }, { status: 500 });
        }

        // Send real-time signal to callee to start ringing
        const calleeChannel = supabase.channel(`user_${conversation.provider_id}`, {
          config: { broadcast: { ack: true } },
        });

        await calleeChannel.send({
          type: "broadcast",
          event: "call-ringing",
          payload: {
            session_id: startSession.id,
            conversation_id: conversationId,
            caller_id: au.user.id,
            action: "start_call",
            timestamp: new Date().toISOString(),
            metadata
          },
        });

        supabase.removeChannel(calleeChannel);

        result = { session: startSession, action: "started" };
        break;

      case "end_call":
        // End the call
        const { data: endSession, error: endError } = await supabase
          .from("call_sessions")
          .update({
            status: "ended",
            ended_at: new Date().toISOString(),
            duration_seconds: Math.floor((Date.now() - new Date(sessionId ? sessionId : Date.now()).getTime()) / 1000),
            metadata: {
              ...metadata,
              ended_at: new Date().toISOString(),
              ended_by: au.user.id
            }
          })
          .eq("conversation_id", conversationId)
          .or(`caller_id.eq.${au.user.id},callee_id.eq.${au.user.id}`)
          .eq("status", "connected")
          .select("*")
          .single();

        if (endError) {
          return NextResponse.json({ error: endError.message }, { status: 500 });
        }

        // Update call history
        await supabase
          .from("call_history")
          .update({
            status: "ended",
            ended_at: new Date().toISOString(),
            duration_seconds: Math.floor((Date.now() - new Date(sessionId ? sessionId : Date.now()).getTime()) / 1000),
            metadata: {
              ended_at: new Date().toISOString(),
              ended_by: au.user.id
            }
          })
          .eq("conversation_id", conversationId)
          .or(`caller_id.eq.${au.user.id},callee_id.eq.${au.user.id}`)
          .eq("status", "connected");

        // Send real-time signal to other participant
        const otherUserId = endSession.caller_id === au.user.id ? endSession.callee_id : endSession.caller_id;
        const otherChannel = supabase.channel(`user_${otherUserId}`, {
          config: { broadcast: { ack: true } },
        });

        await otherChannel.send({
          type: "broadcast",
          event: "call-ended",
          payload: {
            session_id: endSession.id,
            conversation_id: conversationId,
            ended_by: au.user.id,
            action: "end_call",
            timestamp: new Date().toISOString(),
            metadata
          },
        });

        supabase.removeChannel(otherChannel);

        result = { session: endSession, action: "ended" };
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true,
      ...result,
      timestamp: new Date().toISOString()
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

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
    }

    // Get active call session
    const { data: session, error: sessionError } = await supabase
      .from("call_sessions")
      .select("*")
      .eq("conversation_id", conversationId)
      .or(`caller_id.eq.${au.user.id},callee_id.eq.${au.user.id}`)
      .in("status", ["initiated", "ringing", "connected"])
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      session,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
