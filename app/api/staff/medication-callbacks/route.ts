import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSbClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// GET /api/staff/medication-callbacks - Get all callbacks for the authenticated staff member
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

    // Get status filter from query params
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    // Build query
    let query = supabase
      .from("medication_callbacks")
      .select("*")
      .eq("staff_id", user.id)
      .order("scheduled_at", { ascending: true });

    // Apply status filter if provided
    if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data: callbacks, error } = await query;

    if (error) {
      console.error("Error fetching medication callbacks:", error);
      return NextResponse.json(
        { error: "Failed to fetch callbacks", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ callbacks: callbacks || [] });
  } catch (error: any) {
    console.error("Error in GET /api/staff/medication-callbacks:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}

// POST /api/staff/medication-callbacks - Create a new callback
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

    const body = await req.json();
    const { title, description, scheduled_at, medication_name, patient_name, notes } = body;

    if (!title || !scheduled_at) {
      return NextResponse.json(
        { error: "Title and scheduled_at are required" },
        { status: 400 }
      );
    }

    // Create callback
    const { data: callback, error } = await supabase
      .from("medication_callbacks")
      .insert({
        staff_id: user.id,
        title,
        description: description || null,
        scheduled_at,
        medication_name: medication_name || null,
        patient_name: patient_name || null,
        notes: notes || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating medication callback:", error);
      return NextResponse.json(
        { error: "Failed to create callback", details: error.message },
        { status: 500 }
      );
    }

    // Send real-time broadcast to notify other clients
    try {
      const channel = supabase.channel(`medication-callbacks-broadcast:${user.id}`);
      await channel.send({
        type: 'broadcast',
        event: 'callback_created',
        payload: {
          callback_id: callback.id,
          staff_id: user.id,
          title: callback.title,
          scheduled_at: callback.scheduled_at,
        }
      });
      supabase.removeChannel(channel);
    } catch (broadcastError) {
      console.error("Error sending real-time broadcast:", broadcastError);
      // Don't fail the request if broadcast fails
    }

    return NextResponse.json({ callback }, { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/staff/medication-callbacks:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}


