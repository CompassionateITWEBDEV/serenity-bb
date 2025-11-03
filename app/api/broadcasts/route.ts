import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSbClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/server";
import { z } from "zod";

const createBroadcastSchema = z.object({
  title: z.string().min(1).max(255),
  body: z.string().min(1),
  target_audience: z.enum(['all', 'staff', 'patients', 'clinicians']).default('all'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
});

const updateBroadcastSchema = createBroadcastSchema.partial();

// GET /api/broadcasts - Get all broadcasts
export async function GET(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 });
    }

    // Authenticate user - support both cookies and Bearer token
    const cookieStore = await cookies();
    const supabase = createServerClient(url, anon, {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    });

    let { data: { user }, error: authError } = await supabase.auth.getUser();

    // Bearer token fallback if cookie-based auth fails
    if ((!user || authError) && req.headers) {
      const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
      const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : null;
      if (url && anon && bearer) {
        const bearerClient = createSbClient(url, anon, {
          global: { headers: { Authorization: `Bearer ${bearer}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: bearerUser, error: bearerError } = await bearerClient.auth.getUser();
        if (bearerUser?.user) {
          user = bearerUser.user;
          authError = null;
        } else {
          authError = bearerError || authError;
        }
      }
    }
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetAudience = searchParams.get('audience');
    const limit = parseInt(searchParams.get('limit') || '50');

    try {
      // Try admin client first, fallback to user's client if service role not available
      let dbClient: any;
      try {
        dbClient = supabaseAdmin();
      } catch (adminError: any) {
        console.warn('Admin client not available, using authenticated client:', adminError.message);
        // Fallback to user's authenticated client
        dbClient = supabase;
      }

      let query = (dbClient as any)
        .from('broadcasts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (targetAudience && targetAudience !== 'all') {
        query = query.or(`target_audience.eq.${targetAudience},target_audience.eq.all`);
      }

      const { data: broadcasts, error } = await query;

      if (error) {
        console.error('Error fetching broadcasts:', error);
        // If table doesn't exist, return empty array instead of error
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          return NextResponse.json({ broadcasts: [] });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ broadcasts: broadcasts || [] });
    } catch (error: any) {
      console.error('Error in broadcasts GET:', error);
      return NextResponse.json({ error: error?.message || 'Failed to fetch broadcasts' }, { status: 500 });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/broadcasts - Create new broadcast
export async function POST(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 });
    }

    // Authenticate user
    const cookieStore = await cookies();
    const supabase = createServerClient(url, anon, {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = createBroadcastSchema.parse(body);

    // Get user profile to populate author info
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single();

    const userName = profile?.full_name || user.email || 'Unknown User';
    const userRole = profile?.role || 'staff';

    // Use admin client for insert (RLS may restrict)
    const sb = supabaseAdmin();
    const { data: broadcast, error } = await (sb as any)
      .from('broadcasts')
      .insert({
        title: validatedData.title,
        body: validatedData.body,
        target_audience: validatedData.target_audience,
        priority: validatedData.priority,
        author_id: user.id,
        author_name: userName,
        author_role: userRole,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ broadcast }, { status: 201 });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/broadcasts - Update broadcast
export async function PUT(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 });
    }

    // Authenticate user
    const cookieStore = await cookies();
    const supabase = createServerClient(url, anon, {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({ error: "Broadcast ID is required" }, { status: 400 });
    }

    const validatedData = updateBroadcastSchema.parse(updateData);

    // Use admin client for update
    const sb = supabaseAdmin();
    const { data: broadcast, error } = await (sb as any)
      .from('broadcasts')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!broadcast) {
      return NextResponse.json({ error: "Broadcast not found" }, { status: 404 });
    }

    return NextResponse.json({ broadcast });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/broadcasts - Delete broadcast
export async function DELETE(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 });
    }

    // Authenticate user
    const cookieStore = await cookies();
    const supabase = createServerClient(url, anon, {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: "Broadcast ID is required" }, { status: 400 });
    }

    // Use admin client for delete
    const sb = supabaseAdmin();
    const { error } = await (sb as any)
      .from('broadcasts')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Broadcast deleted successfully" });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
