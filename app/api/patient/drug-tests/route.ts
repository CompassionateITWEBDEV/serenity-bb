import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";
// Increase timeout for Vercel Pro plan (60s) or Hobby plan (10s)
// This route may need more time due to database queries and RLS fallback
export const maxDuration = 60; // Maximum for Pro plan, will be capped at 10s for Hobby

/**
 * GET /api/patient/drug-tests
 * Fetches drug tests for the authenticated patient
 */
export async function GET(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      console.error("[API] ❌ CRITICAL: Supabase environment variables missing");
      console.error("[API] NEXT_PUBLIC_SUPABASE_URL:", url ? "SET" : "MISSING");
      console.error("[API] NEXT_PUBLIC_SUPABASE_ANON_KEY:", anon ? "SET" : "MISSING");
      return NextResponse.json({ 
        error: "Server configuration error",
        details: "Supabase configuration missing. Please check environment variables.",
        hint: "Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in Vercel"
      }, { status: 500 });
    }

    const store = await cookies();
    const supabase = createServerClient(url, anon, {
      cookies: {
        get: (k) => store.get(k)?.value,
        set: (k, v, o) => store.set(k, v, o),
        remove: (k, o) => store.set(k, "", { ...o, maxAge: 0 }),
      },
    });

    // Auth - try cookie-based first, fallback to Bearer token
    const { data: cookieAuth, error: cookieErr } = await supabase.auth.getUser();
    let user = cookieAuth?.user;
    let authError = cookieErr;

    // Fallback to Bearer token if cookie auth fails
    if ((!user || cookieErr) && req.headers) {
      const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
      const bearer = authHeader.toLowerCase().startsWith("bearer ")
        ? authHeader.slice(7).trim()
        : null;

      if (bearer) {
        const { createClient: createSbClient } = await import("@supabase/supabase-js");
        const supabaseBearer = createSbClient(url, anon, {
          global: { headers: { Authorization: `Bearer ${bearer}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: bearerAuth, error: bearerErr } = await supabaseBearer.auth.getUser();
        if (bearerErr) {
          authError = bearerErr;
        } else {
          user = bearerAuth?.user;
          authError = null;
        }
      }
    }

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[API] Fetching drug tests for user: ${user.id}`);

    // Query with explicit patient_id filter (RLS might require this)
    const startTime = Date.now();
    let { data: drugTests, error: drugTestsError } = await supabase
      .from("drug_tests")
      .select("id, status, scheduled_for, created_at, metadata, patient_id")
      .eq("patient_id", user.id)
      .order("created_at", { ascending: false });
    
    const queryTime = Date.now() - startTime;
    console.log(`[API] Initial query completed in ${queryTime}ms`);

    console.log(`[API] Query result - Count: ${drugTests?.length || 0}, Error:`, drugTestsError?.message || 'none');

    // If RLS is blocking and we got no results, use service role as fallback
    if ((!drugTests || drugTests.length === 0) && !drugTestsError) {
      console.log(`[API] No results from regular query, trying with service role client (RLS may be blocking)`);
      
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
      if (serviceKey) {
        try {
          const { createClient: createSbClient } = await import("@supabase/supabase-js");
          const adminClient = createSbClient(url, serviceKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          
          // Query with service role (bypasses RLS)
          const { data: adminTests, error: adminError } = await adminClient
            .from("drug_tests")
            .select("id, status, scheduled_for, created_at, metadata, patient_id")
            .eq("patient_id", user.id) // Verify ownership
            .order("created_at", { ascending: false });
          
          if (adminError) {
            console.error(`[API] Service role query error:`, adminError);
          } else if (adminTests && adminTests.length > 0) {
            // Drug tests exist and belong to this patient - use service role result
            console.log(`[API] Using service role result (RLS workaround): Found ${adminTests.length} drug tests for patient ${user.id}`);
            drugTests = adminTests;
            drugTestsError = null;
          } else {
            console.log(`[API] No drug tests found for patient ${user.id}`);
          }
        } catch (adminCheckError) {
          console.error(`[API] Error in service role check:`, adminCheckError);
        }
      } else {
        console.warn(`[API] Service role key not available - cannot bypass RLS. Please add RLS policies or set SUPABASE_SERVICE_ROLE_KEY.`);
      }
    }

    if (drugTestsError) {
      console.error("[API] Error fetching drug tests:", {
        code: drugTestsError.code,
        message: drugTestsError.message,
        details: drugTestsError.details,
        hint: drugTestsError.hint
      });
      
      // If it's an RLS error, provide more helpful message
      if (drugTestsError.message?.includes("row-level security") || drugTestsError.message?.includes("policy")) {
        console.error("[API] RLS policy may be blocking access to drug_tests");
        return NextResponse.json(
          { 
            error: "Failed to fetch drug tests", 
            details: "Row-level security policy may be blocking access. Please check RLS policies.",
            hint: "Ensure there's a policy allowing patients to SELECT their own drug tests"
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: "Failed to fetch drug tests", details: drugTestsError.message },
        { status: 500 }
      );
    }

    console.log(`[API] Returning ${drugTests?.length || 0} drug tests for patient ${user.id}`);

    // Format the data for the frontend
    const formattedTests = (drugTests || []).map((test: any) => ({
      id: test.id,
      status: test.status || "pending",
      scheduledFor: test.scheduled_for,
      createdAt: test.created_at,
      metadata: test.metadata || {},
    }));

    return NextResponse.json({ drugTests: formattedTests });
  } catch (error: any) {
    console.error("Error in GET /api/patient/drug-tests:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}

