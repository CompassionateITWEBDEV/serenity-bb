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
      messageType = "text", 
      content, 
      metadata = {} 
    } = body;

    if (!conversationId || !content?.trim()) {
      return NextResponse.json({ error: "conversationId and content are required" }, { status: 400 });
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

    // Determine sender role
    const { data: staff } = await supabase
      .from("staff")
      .select("role, department")
      .eq("user_id", au.user.id)
      .maybeSingle();

    const role = (staff?.role ?? staff?.department ?? "").toString().toLowerCase();
    const sender_role = role.includes("doc") ? "doctor" : 
                       role.includes("counsel") ? "counselor" : 
                       role.includes("nurse") ? "nurse" : "patient";
    
    const sender_name = (au.user.user_metadata?.full_name as string) || au.user.email || "User";

    // Create video call message
    const { data: message, error: messageError } = await supabase
      .from("video_call_messages")
      .insert({
        conversation_id: conversationId,
        session_id: sessionId,
        sender_id: au.user.id,
        sender_name,
        sender_role,
        message_type: messageType,
        content: String(content).trim(),
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          call_context: true
        },
        read: false
      })
      .select("*")
      .single();

    if (messageError) {
      return NextResponse.json({ error: messageError.message }, { status: 500 });
    }

    // Also create a regular message for chat history
    const { data: chatMessage, error: chatError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        patient_id: conversation.patient_id,
        sender_id: au.user.id,
        sender_name,
        sender_role,
        content: `[Video Call] ${content}`,
        read: false,
        metadata: {
          video_call_message: true,
          session_id: sessionId,
          original_message_id: message.id
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
        last_message: `[Video Call] ${content}`, 
        last_message_at: message.created_at 
      })
      .eq("id", conversationId);

    return NextResponse.json({ 
      message,
      chatMessage 
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
    const sessionId = url.searchParams.get("sessionId");
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

    if (![conversation.patient_id, conversation.provider_id].includes(au.user.id)) {
      return NextResponse.json({ error: "access denied" }, { status: 403 });
    }

    let query = supabase
      .from("video_call_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (sessionId) {
      query = query.eq("session_id", sessionId);
    }

    if (before) {
      query = query.lt("created_at", before);
    }

    const { data: messages, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      messages: (messages ?? []).reverse() 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
