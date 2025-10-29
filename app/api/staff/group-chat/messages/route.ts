import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSbClient } from "@supabase/supabase-js";

// GET /api/staff/group-chat/messages - Get all group chat messages
export async function GET(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 });
    }

    // Try cookie-based auth first
    const cookieStore = await cookies();
    const supabase = createServerClient(url, anon, {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: any) => {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Edge runtime limitations
          }
        },
        remove: (name: string, options: any) => {
          try {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 });
          } catch {
            // Edge runtime limitations
          }
        },
      },
    });

    const { data: cookieAuth, error: cookieErr } = await supabase.auth.getUser();
    
    // Fallback to Bearer token if cookie auth fails
    let user = cookieAuth?.user;
    if ((!user || cookieErr) && req.headers) {
      const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
      const bearer = authHeader.toLowerCase().startsWith("bearer ")
        ? authHeader.slice(7).trim()
        : null;

      if (bearer) {
        const supabaseBearer = createSbClient(url, anon, {
          global: { headers: { Authorization: `Bearer ${bearer}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: bearerAuth } = await supabaseBearer.auth.getUser();
        user = bearerAuth?.user;
      }
    }
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use the appropriate client for database operations
    const dbClient = user === cookieAuth?.user ? supabase : createSbClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${req.headers.get("authorization")?.slice(7) || req.headers.get("Authorization")?.slice(7) || ""}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: messages, error } = await dbClient
      .from('staff_group_chat_messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ messages });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/staff/group-chat/messages - Create new message
export async function POST(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 });
    }

    // Try cookie-based auth first
    const cookieStore = await cookies();
    const supabase = createServerClient(url, anon, {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: any) => {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Edge runtime limitations
          }
        },
        remove: (name: string, options: any) => {
          try {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 });
          } catch {
            // Edge runtime limitations
          }
        },
      },
    });

    // Try getSession first (might refresh cookies)
    const { data: sessionData } = await supabase.auth.getSession();
    console.log('POST /api/staff/group-chat/messages: Session check', { 
      hasSession: !!sessionData?.session,
      userId: sessionData?.session?.user?.id 
    });

    const { data: cookieAuth, error: cookieErr } = await supabase.auth.getUser();
    console.log('POST /api/staff/group-chat/messages: Cookie auth check', {
      hasUser: !!cookieAuth?.user,
      userId: cookieAuth?.user?.id,
      error: cookieErr?.message,
      cookieNames: Array.from(cookieStore.getAll().map(c => c.name))
    });
    
    // Fallback to Bearer token if cookie auth fails
    let user = cookieAuth?.user;
    if ((!user || cookieErr) && req.headers) {
      const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
      const bearer = authHeader.toLowerCase().startsWith("bearer ")
        ? authHeader.slice(7).trim()
        : null;

      if (bearer) {
        console.log('POST /api/staff/group-chat/messages: Trying Bearer token auth');
        const supabaseBearer = createSbClient(url, anon, {
          global: { headers: { Authorization: `Bearer ${bearer}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: bearerAuth, error: bearerErr } = await supabaseBearer.auth.getUser();
        console.log('POST /api/staff/group-chat/messages: Bearer auth result', {
          hasUser: !!bearerAuth?.user,
          userId: bearerAuth?.user?.id,
          error: bearerErr?.message
        });
        user = bearerAuth?.user;
      }
    }
    
    if (!user) {
      console.error('POST /api/staff/group-chat/messages: Auth error - no user found', { 
        cookieErr: cookieErr?.message,
        cookieErrorCode: cookieErr?.code,
        hasCookies: cookieStore.getAll().length > 0,
        cookieNames: Array.from(cookieStore.getAll().map(c => c.name))
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log('POST /api/staff/group-chat/messages: User authenticated', user.id);

    // Use the appropriate client for database operations
    const dbClient = user === cookieAuth?.user ? supabase : createSbClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${req.headers.get("authorization")?.slice(7) || req.headers.get("Authorization")?.slice(7) || ""}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json();
    const { content, sender_id, sender_name, sender_avatar, role_group, attachment_url, attachment_type } = body;

    console.log('POST /api/staff/group-chat/messages: Request body', { 
      content: content?.substring(0, 50), 
      sender_id, 
      sender_name,
      role_group,
      hasAttachment: !!attachment_url,
      attachmentType: attachment_type
    });

    // Either content or attachment must be provided
    if ((!content || !content.trim()) && !attachment_url) {
      console.error('POST /api/staff/group-chat/messages: Missing content or attachment');
      return NextResponse.json({ error: "Either message content or attachment is required" }, { status: 400 });
    }

    if (!sender_id || !sender_name) {
      console.error('POST /api/staff/group-chat/messages: Missing required fields');
      return NextResponse.json({ error: "Missing sender_id or sender_name" }, { status: 400 });
    }

    // Validate attachment_type if attachment_url is provided
    if (attachment_url && attachment_type) {
      if (!['image', 'audio', 'file'].includes(attachment_type)) {
        return NextResponse.json({ error: "Invalid attachment_type. Must be 'image', 'audio', or 'file'" }, { status: 400 });
      }
    }

    // Verify user is staff before inserting
    const { data: staffCheck, error: staffError } = await dbClient
      .from('staff')
      .select('user_id, active')
      .eq('user_id', user.id)
      .eq('active', true)
      .maybeSingle();

    if (staffError) {
      console.error('POST /api/staff/group-chat/messages: Staff check error', staffError);
      return NextResponse.json({ 
        error: `Staff verification failed: ${staffError.message}` 
      }, { status: 403 });
    }

    if (!staffCheck) {
      console.error('POST /api/staff/group-chat/messages: User is not an active staff member');
      return NextResponse.json({ 
        error: "Only active staff members can send messages" 
      }, { status: 403 });
    }

    // Prepare message data
    const messageData: any = {
      content: content || (attachment_type === 'image' ? '(image)' : attachment_type === 'audio' ? '(voice note)' : '(file)'),
      sender_id,
      sender_name,
      sender_avatar,
      read: false,
      role_group: role_group || 'all'
    };

    // Add attachment fields if provided
    if (attachment_url) {
      messageData.attachment_url = attachment_url;
      messageData.attachment_type = attachment_type || 'file';
    }

    const { data: message, error } = await dbClient
      .from('staff_group_chat_messages')
      .insert(messageData)
      .select('*')
      .single();

    if (error) {
      console.error('POST /api/staff/group-chat/messages: Insert error - full error', JSON.stringify(error, null, 2));
      console.error('POST /api/staff/group-chat/messages: Error code', error?.code);
      console.error('POST /api/staff/group-chat/messages: Error message', error?.message);
      console.error('POST /api/staff/group-chat/messages: Error details', error?.details);
      console.error('POST /api/staff/group-chat/messages: Error hint', error?.hint);
      
      // Check for specific errors
      const errorCode = error?.code || '';
      const errorMessage = error?.message || '';
      
      if (errorCode === 'PGRST205' || errorCode === 'PGRST116' || errorMessage.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Chat table does not exist. Please run database migration.' 
        }, { status: 500 });
      }
      
      if (errorCode === '42501' || errorMessage.includes('permission denied') || errorMessage.includes('RLS')) {
        return NextResponse.json({ 
          error: 'Permission denied. Check RLS policies - user may not be in staff table.' 
        }, { status: 403 });
      }
      
      return NextResponse.json({ 
        error: errorMessage || 'Failed to create message',
        errorCode,
        details: error?.details,
        hint: error?.hint
      }, { status: 500 });
    }

    console.log('POST /api/staff/group-chat/messages: Message created successfully', message?.id);
    
    return NextResponse.json({ message }, { status: 201 });

  } catch (error: any) {
    console.error('POST /api/staff/group-chat/messages: Unexpected error', error);
    console.error('POST /api/staff/group-chat/messages: Error type', typeof error);
    console.error('POST /api/staff/group-chat/messages: Error message', error?.message || String(error));
    console.error('POST /api/staff/group-chat/messages: Error stack', error?.stack);
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError || error.message?.includes('JSON')) {
      return NextResponse.json({ 
        error: 'Invalid request format. Please check your message data.',
        errorCode: 'INVALID_JSON'
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: error?.message || 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
      details: error?.toString() || String(error)
    }, { status: 500 });
  }
}

    // Send real-time notification to all staff
    const staffChannel = supabase.channel('staff-group-chat', {
      config: { broadcast: { ack: true } },
    });

    await staffChannel.send({
      type: 'broadcast',
      event: 'new-message',
      payload: {
        message,
        timestamp: new Date().toISOString()
      },
    });

    supabase.removeChannel(staffChannel);

    return NextResponse.json({ message }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
