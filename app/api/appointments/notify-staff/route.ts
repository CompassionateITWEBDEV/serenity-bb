import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSbClient } from "@supabase/supabase-js";

function json(data: any, status = 200, headers: Record<string, string> = {}) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

// POST /api/appointments/notify-staff - Notify staff when patient creates appointment
export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return json({ error: "Supabase configuration missing" }, 500);
  }

  try {
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
      return json({ error: "Unauthorized" }, 401);
    }

    // Parse body
    const body = await req.json();
    const { appointmentId, patientId, patientName, appointmentDate, appointmentType, provider, staffId, isVirtual } = body;

    if (!appointmentId || !patientId || !patientName) {
      return json({ error: "Missing required fields" }, 400);
    }

    // Use service role to create notifications
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
    if (!serviceKey) {
      return json({ error: "Service role key not configured" }, 500);
    }

    const admin = createSbClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // If staffId is provided, notify only that staff member; otherwise notify all staff
    let targetStaffIds: string[] = [];
    
    if (staffId) {
      // Verify the staff member exists and is active
      const { data: staffMember, error: staffError } = await admin
        .from('staff')
        .select('user_id')
        .eq('user_id', staffId)
        .eq('active', true)
        .single();

      if (staffError || !staffMember) {
        console.error('Error fetching staff member:', staffError);
        return json({ error: "Selected staff member not found or inactive" }, 404);
      }

      targetStaffIds = [staffId];
    } else {
      // Get all active staff members if no specific staff selected, including their preferences
      const { data: staffMembers, error: staffError } = await admin
        .from('staff')
        .select('user_id, first_name, last_name, notification_preferences')
        .eq('active', true);

      if (staffError) {
        console.error('Error fetching staff members:', staffError);
        return json({ error: "Failed to fetch staff members" }, 500);
      }

      // Filter staff by notification preferences - only notify staff who have appointment_alerts enabled
      const eligibleStaff = staffMembers?.filter((staff: any) => {
        const prefs = staff.notification_preferences || {};
        return prefs.appointment_alerts !== false; // Default to true if not set
      }) || [];

      targetStaffIds = eligibleStaff?.map((s: any) => s.user_id) || [];
    }

    if (targetStaffIds.length === 0) {
      return json({ error: "No staff members to notify" }, 400);
    }

    const title = isVirtual 
      ? `Virtual Appointment Request from ${patientName}`
      : `Appointment Request from ${patientName}`;

    const message = `${patientName} has requested an appointment${provider ? ` with ${provider}` : ''} on ${appointmentDate}${appointmentType ? ` (${appointmentType})` : ''}.`;

    // Create notifications for target staff members
    const notifications = targetStaffIds.map((staffUserId: string) => ({
      type: 'appointment' as const,
      title,
      message,
      patient_id: patientId,
      patient_name: patientName,
      staff_id: staffUserId,
      read: false,
      metadata: {
        appointment_id: appointmentId,
        appointment_type: appointmentType,
        provider: provider,
        is_virtual: isVirtual || false,
        priority: 'medium'
      }
    })) || [];

    if (notifications.length > 0) {
      const { error: insertError } = await admin
        .from('staff_notifications')
        .insert(notifications);

      if (insertError) {
        console.error('Error creating staff notifications for appointment:', insertError);
        return json({ error: "Failed to create notifications", details: insertError.message }, 500);
      }

      return json({ 
        success: true, 
        notificationsCreated: notifications.length 
      }, 200);
    }

    return json({ success: true, notificationsCreated: 0 }, 200);
  } catch (error: any) {
    console.error('Error in notify-staff API:', error);
    return json({ error: error?.message || "Internal server error" }, 500);
  }
}



