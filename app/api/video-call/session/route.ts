import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRoute } from "@/lib/supabaseRoute";

export async function POST(req: NextRequest) {
  try {
    const supabase = supabaseFromRoute();
    const { data: au } = await supabase.auth.getUser();
    if (!au.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json();
    const { conversationId, callType = "video", participantId } = body;

    if (!conversationId || !participantId) {
      return NextResponse.json({ error: "conversationId and participantId are required" }, { status: 400 });
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

    // Create call session
    const { data: callSession, error: sessionError } = await supabase
      .from("call_sessions")
      .insert({
        conversation_id: conversationId,
        caller_id: au.user.id,
        callee_id: participantId,
        call_type: callType,
        status: "initiated",
        started_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }

    // Create call history entry
    const { data: callHistory, error: historyError } = await supabase
      .from("call_history")
      .insert({
        conversation_id: conversationId,
        caller_id: au.user.id,
        callee_id: participantId,
        caller_name: au.user.user_metadata?.full_name || au.user.email || "User",
        callee_name: conversation.provider_name || "Staff",
        call_type: callType,
        status: "initiated",
        started_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (historyError) {
      console.warn("Failed to create call history:", historyError);
    }

    return NextResponse.json({ 
      session: callSession,
      history: callHistory 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = supabaseFromRoute();
    const { data: au } = await supabase.auth.getUser();
    if (!au.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json();
    const { sessionId, status, endedAt, duration } = body;

    if (!sessionId || !status) {
      return NextResponse.json({ error: "sessionId and status are required" }, { status: 400 });
    }

    // Update call session
    const updateData: any = { status };
    if (endedAt) updateData.ended_at = endedAt;
    if (duration !== undefined) updateData.duration_seconds = duration;

    const { data: session, error: sessionError } = await supabase
      .from("call_sessions")
      .update(updateData)
      .eq("id", sessionId)
      .eq("caller_id", au.user.id) // Ensure user can only update their own calls
      .select("*")
      .single();

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }

    // Update call history
    const { error: historyError } = await supabase
      .from("call_history")
      .update(updateData)
      .eq("conversation_id", session.conversation_id)
      .eq("caller_id", au.user.id)
      .eq("status", "initiated"); // Update the most recent initiated call

    if (historyError) {
      console.warn("Failed to update call history:", historyError);
    }

    return NextResponse.json({ session });

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
    const status = url.searchParams.get("status");
    const limit = parseInt(url.searchParams.get("limit") || "10");

    let query = supabase
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
      .or(`caller_id.eq.${au.user.id},callee_id.eq.${au.user.id}`)
      .order("started_at", { ascending: false })
      .limit(limit);

    if (conversationId) {
      query = query.eq("conversation_id", conversationId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data: sessions, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sessions });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
