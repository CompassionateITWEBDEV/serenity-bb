import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSbClient } from "@supabase/supabase-js";

function json(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}

// GET /api/staff/verifications - Get verification stats for a staff member or all verifications
export async function GET(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return json({ error: "Supabase configuration missing" }, 500);
  }

  try {
    // Authenticate
    const cookieStore = await cookies();
    const supabase = createServerClient(url, anon, {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: any) => {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {}
        },
        remove: (name: string, options: any) => {
          try {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 });
          } catch {}
        },
      },
    });

    const { data: cookieAuth, error: cookieErr } = await supabase.auth.getUser();
    
    // Fallback to Bearer token
    let user = cookieAuth?.user;
    if ((!user || cookieErr) && req.headers) {
      const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
      const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null;
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

    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get("staffId");

    // Use service role for queries to bypass RLS if needed
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
    const queryClient = serviceKey 
      ? createSbClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
      : supabase;

    // If staffId provided, get verifications for that staff member
    if (staffId) {
      const { data, error } = await queryClient
        .from("staff_verifications")
        .select(`
          id,
          staff_id,
          patient_id,
          verified_at,
          rating,
          comment
        `)
        .eq("staff_id", staffId)
        .order("verified_at", { ascending: false });

      if (error) {
        console.error("Error fetching staff verifications:", error);
        // If table doesn't exist or relationship issues, return empty stats
        if (error.code === "PGRST116" || error.code === "PGRST205" || error.code === "PGRST200" || error.message?.includes("does not exist") || error.message?.includes("relationship")) {
          return json({
            verifications: [],
            stats: {
              totalVerifications: 0,
              averageRating: null,
              ratingDistribution: []
            }
          }, 200);
        }
        return json({ error: error.message, code: error.code }, 500);
      }

      // Calculate stats
      const totalVerifications = data?.length || 0;
      const ratings = data?.filter(v => v.rating && v.rating > 0) || [];
      const averageRating = ratings.length > 0
        ? parseFloat((ratings.reduce((sum: number, v: any) => sum + (v.rating || 0), 0) / ratings.length).toFixed(1))
        : null;
      const ratingDistribution = [1, 2, 3, 4, 5].map(r => ({
        rating: r,
        count: data?.filter((v: any) => v.rating === r).length || 0
      }));

      // If needed, fetch patient names separately (since we can't join directly)
      const verificationsWithPatientNames = data ? await Promise.all(
        (data as any[]).map(async (v: any) => {
          try {
            const { data: patientData } = await queryClient
              .from("patients")
              .select("user_id, full_name, first_name, last_name")
              .eq("user_id", v.patient_id)
              .maybeSingle();
            
            return {
              ...v,
              patients: patientData || null
            };
          } catch {
            return { ...v, patients: null };
          }
        })
      ) : [];

      return json({
        verifications: verificationsWithPatientNames || [],
        stats: {
          totalVerifications,
          averageRating,
          ratingDistribution
        }
      }, 200);
    }

    // Otherwise, get current user's verifications (for staff viewing their own)
    const { data: staffData } = await queryClient
      .from("staff")
      .select("user_id")
      .eq("user_id", user.id)
      .single();

    if (!staffData) {
      return json({ error: "Not a staff member" }, 403);
    }

    const { data, error } = await queryClient
      .from("staff_verifications")
      .select(`
        id,
        staff_id,
        patient_id,
        verified_at,
        rating,
        comment
      `)
      .eq("staff_id", user.id)
      .order("verified_at", { ascending: false });

    if (error) {
      console.error("Error fetching verifications:", error);
      return json({ error: error.message }, 500);
    }

    // Calculate stats
    const totalVerifications = data?.length || 0;
    const ratings = data?.filter((v: any) => v.rating && v.rating > 0) || [];
    const averageRating = ratings.length > 0
      ? parseFloat((ratings.reduce((sum: number, v: any) => sum + (v.rating || 0), 0) / ratings.length).toFixed(1))
      : null;
    const ratingDistribution = [1, 2, 3, 4, 5].map(r => ({
      rating: r,
      count: data?.filter((v: any) => v.rating === r).length || 0
    }));

    // Fetch patient names separately (since patient_id references auth.users, not patients directly)
    const verificationsWithPatientNames = data ? await Promise.all(
      (data as any[]).map(async (v: any) => {
        try {
          const { data: patientData } = await queryClient
            .from("patients")
            .select("user_id, full_name, first_name, last_name")
            .eq("user_id", v.patient_id)
            .maybeSingle();
          
          return {
            ...v,
            patients: patientData || null
          };
        } catch {
          return { ...v, patients: null };
        }
      })
    ) : [];

    return json({
      verifications: verificationsWithPatientNames || [],
      stats: {
        totalVerifications,
        averageRating,
        ratingDistribution
      }
    }, 200);
  } catch (error: any) {
    console.error("Error in GET /api/staff/verifications:", error);
    return json({ error: error?.message || "Internal server error" }, 500);
  }
}

// POST /api/staff/verifications - Create a new verification (patient verifies a staff member)
export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return json({ error: "Supabase configuration missing" }, 500);
  }

  try {
    // Authenticate
    const cookieStore = await cookies();
    const supabase = createServerClient(url, anon, {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: any) => {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {}
        },
        remove: (name: string, options: any) => {
          try {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 });
          } catch {}
        },
      },
    });

    const { data: cookieAuth, error: cookieErr } = await supabase.auth.getUser();
    
    // Fallback to Bearer token
    let user = cookieAuth?.user;
    if ((!user || cookieErr) && req.headers) {
      const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
      const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null;
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

    // Verify patient
    const { data: patientData } = await supabase
      .from("patients")
      .select("user_id")
      .eq("user_id", user.id)
      .single();

    if (!patientData) {
      return json({ error: "Only patients can verify staff members" }, 403);
    }

    const body = await req.json();
    const { staffId, rating, comment } = body;

    if (!staffId) {
      return json({ error: "staffId is required" }, 400);
    }

    if (rating && (rating < 1 || rating > 5)) {
      return json({ error: "Rating must be between 1 and 5" }, 400);
    }

    // Insert or update verification (UPSERT)
    const { data, error } = await supabase
      .from("staff_verifications")
      .upsert({
        staff_id: staffId,
        patient_id: user.id,
        rating: rating || null,
        comment: comment || null,
        verified_at: new Date().toISOString(),
      }, {
        onConflict: "staff_id,patient_id"
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating verification:", error);
      return json({ error: error.message }, 500);
    }

    return json({ verification: data }, 201);
  } catch (error: any) {
    console.error("Error in POST /api/staff/verifications:", error);
    return json({ error: error?.message || "Internal server error" }, 500);
  }
}



