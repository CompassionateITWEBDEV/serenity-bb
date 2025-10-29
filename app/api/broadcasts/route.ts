import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const createBroadcastSchema = z.object({
  title: z.string().min(1).max(255),
  body: z.string().min(1),
  target_audience: z.enum(['all', 'staff', 'patients', 'clinicians']).default('all'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  scheduled_at: z.string().datetime().optional(),
  expires_at: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional()
});

const updateBroadcastSchema = createBroadcastSchema.partial().extend({
  status: z.enum(['draft', 'active', 'archived']).optional()
});

// GET /api/broadcasts - Get all broadcasts
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetAudience = searchParams.get('audience');
    const status = searchParams.get('status') || 'active';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('broadcasts')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (targetAudience) {
      query = query.or(`target_audience.eq.${targetAudience},target_audience.eq.all`);
    }

    const { data: broadcasts, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ broadcasts });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/broadcasts - Create new broadcast
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = createBroadcastSchema.parse(body);

    // Get user metadata
    const { data: userData, error: userError } = await supabase
      .from('auth.users')
      .select('raw_user_meta_data')
      .eq('id', user.id)
      .single();

    if (userError) {
      return NextResponse.json({ error: "User data not found" }, { status: 404 });
    }

    const userRole = userData.raw_user_meta_data?.role || 'staff';
    const userName = userData.raw_user_meta_data?.full_name || user.email || 'Unknown User';

    const { data: broadcast, error } = await supabase
      .from('broadcasts')
      .insert({
        ...validatedData,
        author_id: user.id,
        author_name: userName,
        author_role: userRole,
        status: 'active'
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send real-time notification to all staff
    const staffChannel = supabase.channel('staff-broadcasts', {
      config: { broadcast: { ack: true } },
    });

    await staffChannel.send({
      type: 'broadcast',
      event: 'new-broadcast',
      payload: {
        broadcast,
        timestamp: new Date().toISOString()
      },
    });

    supabase.removeChannel(staffChannel);

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
    const supabase = createClient();
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

    const { data: broadcast, error } = await supabase
      .from('broadcasts')
      .update(validatedData)
      .eq('id', id)
      .eq('author_id', user.id) // Ensure user can only update their own broadcasts
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!broadcast) {
      return NextResponse.json({ error: "Broadcast not found or unauthorized" }, { status: 404 });
    }

    // Send real-time update
    const staffChannel = supabase.channel('staff-broadcasts', {
      config: { broadcast: { ack: true } },
    });

    await staffChannel.send({
      type: 'broadcast',
      event: 'broadcast-updated',
      payload: {
        broadcast,
        timestamp: new Date().toISOString()
      },
    });

    supabase.removeChannel(staffChannel);

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
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: "Broadcast ID is required" }, { status: 400 });
    }

    const { data: broadcast, error } = await supabase
      .from('broadcasts')
      .delete()
      .eq('id', id)
      .eq('author_id', user.id) // Ensure user can only delete their own broadcasts
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!broadcast) {
      return NextResponse.json({ error: "Broadcast not found or unauthorized" }, { status: 404 });
    }

    // Send real-time update
    const staffChannel = supabase.channel('staff-broadcasts', {
      config: { broadcast: { ack: true } },
    });

    await staffChannel.send({
      type: 'broadcast',
      event: 'broadcast-deleted',
      payload: {
        broadcastId: id,
        timestamp: new Date().toISOString()
      },
    });

    supabase.removeChannel(staffChannel);

    return NextResponse.json({ message: "Broadcast deleted successfully" });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

