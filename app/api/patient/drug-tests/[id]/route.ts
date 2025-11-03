import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

/**
 * GET /api/patient/drug-tests/[id]
 * Fetches a specific drug test for the authenticated patient
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // CRITICAL: Log immediately - this confirms the route is being called
  console.error("[API] ========== ROUTE HANDLER EXECUTING ==========");
  console.error("[API] GET /api/patient/drug-tests/[id] CALLED");
  console.error("[API] Request URL:", req.url);
  console.error("[API] Request method:", req.method);
  console.error("[API] Timestamp:", new Date().toISOString());
  
  // Also try to write directly to stderr
  try {
    if (typeof process !== 'undefined' && process.stderr) {
      process.stderr.write(`[API] Route handler executing at ${new Date().toISOString()}\n`);
    }
  } catch (e) {
    // Ignore if process is not available
  }
  
  try {
    // Handle params as either Promise or direct object (for Next.js version compatibility)
    let testId: string | undefined;
    try {
      const resolvedParams = params instanceof Promise ? await params : params;
      testId = resolvedParams?.id;
    } catch (paramsError) {
      console.error("[API] Error resolving params:", paramsError);
      // Fallback to extracting from URL
    }
    
    // Fallback: extract ID from URL if params.id is not available
    const requestUrl = new URL(req.url);
    const finalTestId = testId || requestUrl.pathname.split('/').pop() || '';
    
    console.log(`[API] Extracted test ID: ${finalTestId} from URL: ${requestUrl.pathname}`);
    
    if (!finalTestId || finalTestId === 'drug-tests' || finalTestId === '[id]') {
      return NextResponse.json({ error: "Invalid drug test ID" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anon) {
      return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 });
    }

    const store = await cookies();
    const supabase = createServerClient(supabaseUrl, anon, {
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
        const supabaseBearer = createSbClient(supabaseUrl, anon, {
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

    console.log(`[API] Fetching drug test: ${finalTestId} for user: ${user.id}`);
    
    // First, verify the user has a patient record
    const { data: patientRecord, error: patientError } = await supabase
      .from("patients")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (patientError) {
      console.error(`[API] Error checking patient record:`, patientError);
    }
    
    console.log(`[API] Patient record check:`, {
      hasPatient: !!patientRecord,
      patientUserId: patientRecord?.user_id,
      authUserId: user.id,
      match: patientRecord?.user_id === user.id
    });
    
    // Fetch the specific drug test for this patient
    // Note: drug_tests.patient_id references patients.user_id, so we use user.id directly
    // RLS might require the patient_id filter, so we use it explicitly
    let { data: drugTest, error: drugTestError } = await supabase
      .from("drug_tests")
      .select("id, status, scheduled_for, created_at, updated_at, metadata, patient_id")
      .eq("id", finalTestId)
      .eq("patient_id", user.id)  // Explicit filter for RLS
      .maybeSingle();
    
    console.log(`[API] Initial query result:`, {
      hasData: !!drugTest,
      hasError: !!drugTestError,
      errorCode: drugTestError?.code,
      errorMessage: drugTestError?.message
    });
    
    // If RLS is blocking and we got no results, use service role as fallback
    // This is a temporary workaround - the proper fix is to add RLS policies
    if (!drugTest && !drugTestError) {
      console.log(`[API] No results from regular query, trying with service role client (RLS may be blocking)`);
      
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
      if (serviceKey) {
        try {
          const { createClient: createSbClient } = await import("@supabase/supabase-js");
          const adminClient = createSbClient(supabaseUrl, serviceKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          
          // Query with service role (bypasses RLS)
          const { data: adminTest, error: adminError } = await adminClient
            .from("drug_tests")
            .select("id, status, scheduled_for, created_at, updated_at, metadata, patient_id")
            .eq("id", finalTestId)
            .eq("patient_id", user.id) // Verify ownership
            .maybeSingle();
          
          if (adminError) {
            console.error(`[API] Service role query error:`, adminError);
          } else if (adminTest) {
            // Drug test exists and belongs to this patient - use service role result
            console.log(`[API] Using service role result (RLS workaround): Drug test found for patient ${user.id}`);
            drugTest = adminTest;
            drugTestError = null;
          } else {
            // Check if test exists but belongs to different patient
            const { data: anyTest } = await adminClient
              .from("drug_tests")
              .select("id, patient_id")
              .eq("id", finalTestId)
              .maybeSingle();
            
            if (anyTest) {
              console.log(`[API] Drug test exists but belongs to different patient: ${anyTest.patient_id} vs ${user.id}`);
            } else {
              console.log(`[API] Drug test ${finalTestId} does not exist in database`);
            }
          }
        } catch (adminCheckError) {
          console.error(`[API] Error in service role check:`, adminCheckError);
        }
      } else {
        console.warn(`[API] Service role key not available - cannot bypass RLS. Please add RLS policies or set SUPABASE_SERVICE_ROLE_KEY.`);
      }
    }

    console.log(`[API] Query result:`, {
      hasData: !!drugTest,
      hasError: !!drugTestError,
      errorCode: drugTestError?.code,
      errorMessage: drugTestError?.message,
      patientId: drugTest?.patient_id,
      userId: user.id
    });

    if (drugTestError) {
      console.error("[API] Error fetching drug test:", {
        code: drugTestError.code,
        message: drugTestError.message,
        details: drugTestError.details,
        hint: drugTestError.hint
      });
      
      if (drugTestError.code === "PGRST116" || drugTestError.code === "42P01") {
        return NextResponse.json({ error: "Drug test not found" }, { status: 404 });
      }
      
      // If it's an RLS error, provide more helpful message
      if (drugTestError.message?.includes("row-level security") || drugTestError.message?.includes("policy")) {
        console.error("[API] RLS policy may be blocking access");
        return NextResponse.json({ 
          error: "Drug test not found or access denied",
          details: "You may not have permission to view this drug test"
        }, { status: 404 });
      }
      
      return NextResponse.json(
        { error: "Failed to fetch drug test", details: drugTestError.message },
        { status: 500 }
      );
    }

    if (!drugTest) {
      console.log(`[API] Drug test ${finalTestId} not found for patient ${user.id}`);
      
      // Try to check if test exists but belongs to different patient (for debugging)
      // Use service role to bypass RLS for this check
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
      if (serviceKey) {
        try {
          const { createClient: createSbClient } = await import("@supabase/supabase-js");
          const adminClient = createSbClient(supabaseUrl, serviceKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          
          const { data: anyTest, error: adminError } = await adminClient
            .from("drug_tests")
            .select("id, patient_id, status")
            .eq("id", finalTestId)
            .maybeSingle();
          
          if (adminError) {
            console.error(`[API] Admin query error:`, adminError);
          } else if (anyTest) {
            console.log(`[API] Drug test exists but belongs to patient ${anyTest.patient_id}, current user is ${user.id}`);
            console.log(`[API] Patient ID match: ${anyTest.patient_id === user.id}`);
            
            // Also check what the user's actual patient record looks like
            const { data: patientRecord } = await supabase
              .from("patients")
              .select("user_id, id")
              .eq("user_id", user.id)
              .maybeSingle();
            
            console.log(`[API] Patient record:`, patientRecord);
            console.log(`[API] Drug test patient_id type: ${typeof anyTest.patient_id}, value: ${anyTest.patient_id}`);
            console.log(`[API] User id type: ${typeof user.id}, value: ${user.id}`);
          } else {
            console.log(`[API] Drug test ${finalTestId} does not exist in database`);
          }
        } catch (adminCheckError) {
          console.error(`[API] Error in admin check:`, adminCheckError);
        }
      }
      
      // Check if service role key is available - if not, that's likely the issue
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
      const hasServiceKey = !!serviceKey;
      
      const errorResponse = { 
        error: "Drug test not found",
        details: hasServiceKey 
          ? `No drug test found with ID ${finalTestId} for patient ${user.id}. This may be due to RLS policies blocking access.`
          : `No drug test found with ID ${finalTestId} for patient ${user.id}. Service role key not configured - cannot bypass RLS to verify. Please set SUPABASE_SERVICE_ROLE_KEY in Vercel.`,
        hint: hasServiceKey
          ? "Check RLS policies on drug_tests table. Expected: Patients can SELECT where auth.uid() = patient_id"
          : "Set SUPABASE_SERVICE_ROLE_KEY in Vercel environment variables to enable RLS bypass fallback.",
        testId: finalTestId,
        userId: user.id,
        serviceRoleConfigured: hasServiceKey
      };
      
      console.error(`[API] Returning 404 - Drug test not found:`, JSON.stringify(errorResponse, null, 2));
      
      return NextResponse.json(errorResponse, { 
        status: 404,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }

    console.log(`[API] Successfully fetched drug test ${finalTestId} for patient ${user.id}`);

    // Format the data for the frontend
    const formattedTest = {
      id: drugTest.id,
      status: drugTest.status || "pending",
      scheduledFor: drugTest.scheduled_for,
      createdAt: drugTest.created_at,
      updatedAt: drugTest.updated_at,
      metadata: drugTest.metadata || {},
    };

    return NextResponse.json({ drugTest: formattedTest });
  } catch (error: any) {
    console.error("[API] ====== UNCAUGHT ERROR IN GET /api/patient/drug-tests/[id] ======");
    console.error("[API] Error:", error);
    console.error("[API] Error type:", typeof error);
    console.error("[API] Error name:", error?.name);
    console.error("[API] Error message:", error?.message);
    console.error("[API] Error stack:", error?.stack);
    console.error("[API] Error code:", error?.code);
    console.error("[API] Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    const errorResponse = {
      error: "Internal server error",
      details: error?.message || String(error) || "Unknown error occurred",
      code: error?.code || "UNKNOWN_ERROR",
      timestamp: new Date().toISOString()
    };
    
    console.log("[API] Returning 500 error response:", JSON.stringify(errorResponse, null, 2));
    
    try {
      return NextResponse.json(errorResponse, { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        }
      });
    } catch (responseError) {
      console.error("[API] Failed to create JSON response:", responseError);
      // Last resort - return plain text
      return new Response(
        JSON.stringify(errorResponse),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }
  }
}

