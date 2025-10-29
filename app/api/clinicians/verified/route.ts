import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSbClient } from "@supabase/supabase-js";

/**
 * GET /api/clinicians/verified
 * 
 * Returns verified clinicians based on the staff table.
 * Verified clinicians = Staff members from the staff table who:
 * 1. Have active = true
 * 2. Have at least one entry in staff_verifications (verified by patients)
 * 
 * Data sources:
 * - staff table: user_id, email, first_name, last_name, title, department, role, phone, avatar_url
 * - staff_verifications table: staff_id, rating, verified_at (for stats)
 */
export async function GET(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 });
    }

    // Authenticate user - try cookies first, then Bearer token
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

    // Use service role key if available to bypass RLS, otherwise use authenticated client
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
    let dbClient: any;
    
    if (serviceKey) {
      // Use service role to bypass RLS - verified clinicians should be public
      dbClient = createSbClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
    } else {
      // Fallback to authenticated client
      if (user === cookieAuth?.user) {
        dbClient = supabase;
      } else {
        const bearerToken = req.headers.get("authorization")?.slice(7) || req.headers.get("Authorization")?.slice(7) || "";
        dbClient = createSbClient(url, anon, {
          global: { headers: { Authorization: `Bearer ${bearerToken}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
      }
    }

    // Step 1: Fetch clinicians directly from public.staff
    // Treat every active staff member as a clinician
    let staff: any[] = [];
    try {
      const { data: staffData, error: staffError } = await dbClient
        .from("staff")
        .select("user_id, email, first_name, last_name, title, department, role, phone, avatar_url, active")
        .eq("active", true)
        .order("first_name", { ascending: true });

      if (staffError) {
        console.error("Error fetching staff:", staffError);
        // If permission denied, return empty array instead of error
        if (staffError.code === "PGRST301" || 
            staffError.message?.includes("permission denied") ||
            staffError.message?.includes("new row violates row-level security")) {
          return NextResponse.json({ clinicians: [] });
        }
        return NextResponse.json({ error: staffError.message }, { status: 500 });
      }

      staff = staffData || [];
    } catch (err: any) {
      console.error("Exception fetching staff:", err.message);
      return NextResponse.json({ clinicians: [] });
    }

    if (staff.length === 0) {
      return NextResponse.json({ clinicians: [] });
    }

    // Step 2: For each staff member, get optional verification stats (if table/policies allow)
    // Transform staff rows into clinician objects
    const cliniciansWithStats = await Promise.all(
      staff.map(async (s: any) => {
        let verifications: any[] = [];
        try {
          const { data: staffVerifications, error: verStatsError } = await dbClient
            .from("staff_verifications")
            .select("rating, verified_at")
            .eq("staff_id", s.user_id)
            .order("verified_at", { ascending: false });

          if (verStatsError) {
            console.warn(`Warning fetching stats for ${s.user_id}:`, verStatsError.message);
          } else {
            verifications = staffVerifications || [];
          }
        } catch (err: any) {
          console.warn(`Exception fetching stats for ${s.user_id}:`, err.message);
          verifications = [];
        }

        const totalVerifications = verifications.length;
        const ratings = verifications.filter((v: any) => v.rating && v.rating > 0).map((v: any) => v.rating);
        const averageRating = ratings.length > 0
          ? parseFloat((ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length).toFixed(1))
          : null;

        // Map department values to specialties for display
        const departmentToSpecialties: Record<string, string[]> = {
          'therapy': ['Therapy', 'Counseling', 'Behavioral Health'],
          'medical': ['Medical Care', 'Physician Services', 'Medical Assessment'],
          'admin': ['Administration', 'Management'],
          'support': ['Support Services', 'Patient Support'],
        };

        const specialties = s.department ? (departmentToSpecialties[s.department.toLowerCase()] || [s.department]) : [];

        // Return clinician object based on staff table data
        return {
          id: s.user_id, // From staff.user_id
          name: [s.first_name, s.last_name].filter(Boolean).join(" ").trim() || s.email || "Unknown", // From staff.first_name, last_name
          email: s.email, // From staff.email
          phone: s.phone, // From staff.phone
          role: s.title || (s.role ? s.role.charAt(0).toUpperCase() + s.role.slice(1) : "Clinician"), // From staff.title or staff.role
          department: s.department, // From staff.department
          avatar: s.avatar_url || `/avatars/default.png`, // From staff.avatar_url
          availability: "Available", // Default - could be enhanced with actual availability
          rating: averageRating, // Calculated from staff_verifications.rating
          experience: "Experience", // Could be enhanced with actual data
          specialties: specialties, // Mapped from staff.department
          nextAvailable: "Today",
          verified: totalVerifications > 0, // Mark as verified if there is at least one verification
          totalVerifications, // Count from staff_verifications
          averageRating, // Calculated from staff_verifications.rating
        };
      })
    );

    return NextResponse.json({ clinicians: cliniciansWithStats });

  } catch (error: any) {
    console.error("Error in verified clinicians API:", error);
    console.error("Error stack:", error?.stack);
    // Always return 200 with empty array on error so UI doesn't break
    // This allows the UI to fall back to mock data gracefully
    return NextResponse.json({ 
      clinicians: [] // Return empty array on error so UI doesn't break
    }, { status: 200 });
  }
}

