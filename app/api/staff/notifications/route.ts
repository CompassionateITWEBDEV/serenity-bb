import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSbClient } from "@supabase/supabase-js";

// GET /api/staff/notifications - Get staff notifications
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

    // Use service role for database operations to bypass RLS safely while filtering by user.id
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
    const dbClient = serviceKey
      ? createSbClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
      : (user === cookieAuth?.user ? supabase : createSbClient(url, anon, {
          global: { headers: { Authorization: `Bearer ${req.headers.get("authorization")?.slice(7) || req.headers.get("Authorization")?.slice(7) || ""}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        }));

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // Try to fetch from staff_notifications table
    const { data: notifications, error } = await dbClient
      .from('staff_notifications')
      .select('*')
      .eq('staff_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // If table doesn't exist, return empty array with a warning
      if (error.code === 'PGRST116' || error.message.includes('relation "staff_notifications" does not exist')) {
        console.warn('staff_notifications table does not exist. Please run the database migration.');
        return NextResponse.json({ 
          notifications: [],
          warning: "Notifications table not found. Please run database migration."
        });
      }
      
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notifications: notifications || [] });

  } catch (error: any) {
    console.error('Error in staff notifications API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/staff/notifications - Create notification
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

    // Use service role to insert safely
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
    const dbClient = serviceKey
      ? createSbClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
      : (user === cookieAuth?.user ? supabase : createSbClient(url, anon, {
          global: { headers: { Authorization: `Bearer ${req.headers.get("authorization")?.slice(7) || req.headers.get("Authorization")?.slice(7) || ""}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        }));

    const body = await req.json();
    const { type, title, message, patient_id, patient_name } = body;

    if (!type || !title || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data: notification, error } = await dbClient
      .from('staff_notifications')
      .insert({
        type,
        title,
        message,
        patient_id: patient_id || user.id,
        patient_name: patient_name || "System",
        staff_id: user.id,
        read: false
      })
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('relation "staff_notifications" does not exist')) {
        return NextResponse.json({ 
          error: "Notifications table not found. Please run database migration.",
          notification: null
        }, { status: 503 });
      }
      
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notification }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating staff notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/staff/notifications - Mark notification as read
export async function PUT(req: NextRequest) {
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

    // Use service role to update safely
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
    const dbClient = serviceKey
      ? createSbClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
      : (user === cookieAuth?.user ? supabase : createSbClient(url, anon, {
          global: { headers: { Authorization: `Bearer ${req.headers.get("authorization")?.slice(7) || req.headers.get("Authorization")?.slice(7) || ""}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        }));

    const { searchParams } = new URL(req.url);
    const notificationId = searchParams.get('id');
    
    if (!notificationId) {
      return NextResponse.json({ error: "Notification ID is required" }, { status: 400 });
    }

    const { data: notification, error } = await dbClient
      .from('staff_notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('staff_id', user.id)
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('relation "staff_notifications" does not exist')) {
        return NextResponse.json({ 
          error: "Notifications table not found. Please run database migration."
        }, { status: 503 });
      }
      
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notification });

  } catch (error: any) {
    console.error('Error updating staff notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
