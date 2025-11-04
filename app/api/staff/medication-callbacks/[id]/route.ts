import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSbClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// PUT /api/staff/medication-callbacks/[id] - Update a callback
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle params as either Promise or direct object (for Next.js version compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    const callbackId = resolvedParams?.id;

    // Fallback: extract ID from URL if params.id is not available
    const requestUrl = new URL(req.url);
    const finalCallbackId = callbackId || requestUrl.pathname.split('/').pop() || '';

    if (!finalCallbackId || finalCallbackId === 'medication-callbacks') {
      return NextResponse.json({ error: "Invalid callback ID" }, { status: 400 });
    }

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
    const updateData: any = {};

    // Only include fields that are provided
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.scheduled_at !== undefined) updateData.scheduled_at = body.scheduled_at;
    if (body.medication_name !== undefined) updateData.medication_name = body.medication_name;
    if (body.patient_name !== undefined) updateData.patient_name = body.patient_name;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.status !== undefined) {
      updateData.status = body.status;
      // Set completed_at if status is "done"
      if (body.status === "done") {
        updateData.completed_at = new Date().toISOString();
      } else if (body.status !== "done") {
        updateData.completed_at = null;
      }
    }

    // Update callback
    const { data: callback, error } = await supabase
      .from("medication_callbacks")
      .update(updateData)
      .eq("id", finalCallbackId)
      .eq("staff_id", user.id) // Ensure user owns this callback
      .select()
      .single();

    if (error) {
      console.error("Error updating medication callback:", error);
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Callback not found" }, { status: 404 });
      }
      return NextResponse.json(
        { error: "Failed to update callback", details: error.message },
        { status: 500 }
      );
    }

    if (!callback) {
      return NextResponse.json({ error: "Callback not found" }, { status: 404 });
    }

    // Send real-time broadcast
    try {
      const channel = supabase.channel(`medication-callbacks-broadcast:${user.id}`);
      await channel.send({
        type: 'broadcast',
        event: 'callback_updated',
        payload: {
          callback_id: callback.id,
          staff_id: user.id,
          status: callback.status,
          updated_at: callback.updated_at,
        }
      });
      supabase.removeChannel(channel);
    } catch (broadcastError) {
      console.error("Error sending real-time broadcast:", broadcastError);
    }

    return NextResponse.json({ callback });
  } catch (error: any) {
    console.error("Error in PUT /api/staff/medication-callbacks/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}

// DELETE /api/staff/medication-callbacks/[id] - Delete a callback
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle params as either Promise or direct object
    const resolvedParams = params instanceof Promise ? await params : params;
    const callbackId = resolvedParams?.id;

    // Fallback: extract ID from URL
    const requestUrl = new URL(req.url);
    const finalCallbackId = callbackId || requestUrl.pathname.split('/').pop() || '';

    if (!finalCallbackId || finalCallbackId === 'medication-callbacks') {
      return NextResponse.json({ error: "Invalid callback ID" }, { status: 400 });
    }

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

    // Delete callback
    const { error } = await supabase
      .from("medication_callbacks")
      .delete()
      .eq("id", finalCallbackId)
      .eq("staff_id", user.id); // Ensure user owns this callback

    if (error) {
      console.error("Error deleting medication callback:", error);
      return NextResponse.json(
        { error: "Failed to delete callback", details: error.message },
        { status: 500 }
      );
    }

    // Send real-time broadcast
    try {
      const channel = supabase.channel(`medication-callbacks-broadcast:${user.id}`);
      await channel.send({
        type: 'broadcast',
        event: 'callback_deleted',
        payload: {
          callback_id: finalCallbackId,
          staff_id: user.id,
        }
      });
      supabase.removeChannel(channel);
    } catch (broadcastError) {
      console.error("Error sending real-time broadcast:", broadcastError);
    }

    return NextResponse.json({ message: "Callback deleted successfully" });
  } catch (error: any) {
    console.error("Error in DELETE /api/staff/medication-callbacks/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}


