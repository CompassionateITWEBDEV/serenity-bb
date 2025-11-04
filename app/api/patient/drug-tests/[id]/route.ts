import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // Ensure Node.js runtime for Vercel (not Edge)
// Increase timeout for Vercel Pro plan (60s) or Hobby plan (10s)
// This route may need more time due to multiple database queries and RLS fallback
export const maxDuration = 60; // Maximum for Pro plan, will be capped at 10s for Hobby

/**
 * GET /api/patient/drug-tests/[id]
 * Fetches a specific drug test for the authenticated patient
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // CRITICAL: Log immediately - this confirms the route is being called
  // Generate requestId outside try block so it's available in catch
  const requestId = Math.random().toString(36).substring(7);
  
  // Log to multiple outputs to ensure visibility
  const logMessage = `[API] [${requestId}] Route handler executing at ${new Date().toISOString()}`;
  console.error(`[API] [${requestId}] ========== ROUTE HANDLER EXECUTING ==========`);
  console.error(`[API] [${requestId}] GET /api/patient/drug-tests/[id] CALLED`);
  console.error(`[API] [${requestId}] Request URL:`, req.url);
  console.error(`[API] [${requestId}] Request method:`, req.method);
  console.error(`[API] [${requestId}] Timestamp:`, new Date().toISOString());
  console.error(`[API] [${requestId}] Runtime: nodejs`);
  
  // Try to write to stderr as well (for Vercel logs)
  try {
    if (typeof process !== 'undefined' && process.stderr && process.stderr.write) {
      process.stderr.write(`${logMessage}\n`);
    }
  } catch (e) {
    // Ignore if stderr is not available
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
    let requestUrl: URL;
    try {
      requestUrl = new URL(req.url);
    } catch (urlError) {
      console.error("[API] Error parsing request URL:", urlError);
      return NextResponse.json({ error: "Invalid request URL" }, { status: 400 });
    }
    
    const finalTestId = testId || requestUrl.pathname.split('/').pop() || '';
    
    console.log(`[API] [${requestId}] Extracted test ID: ${finalTestId} from URL: ${requestUrl.pathname}`);
    
    if (!finalTestId || finalTestId === 'drug-tests' || finalTestId === '[id]') {
      return NextResponse.json({ 
        error: "Invalid drug test ID",
        details: `Could not extract valid test ID from URL: ${requestUrl.pathname}`
      }, { status: 400 });
    }
    
    // Validate UUID format (basic check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(finalTestId)) {
      return NextResponse.json({ 
        error: "Invalid drug test ID format",
        details: `Test ID must be a valid UUID. Received: ${finalTestId}`
      }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    // Log environment variable status for debugging
    console.log(`[API] [${requestId}] Environment variable check:`, {
      urlExists: !!supabaseUrl,
      urlLength: supabaseUrl?.length || 0,
      urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : "MISSING",
      anonExists: !!anon,
      anonLength: anon?.length || 0,
      anonPrefix: anon ? `${anon.substring(0, 20)}...` : "MISSING",
      allEnvKeys: Object.keys(process.env).filter(k => k.includes("SUPABASE")).join(", ")
    });
    
    if (!supabaseUrl || !anon) {
      console.error(`[API] [${requestId}] ❌ CRITICAL: Supabase environment variables missing`);
      console.error(`[API] [${requestId}] NEXT_PUBLIC_SUPABASE_URL:`, supabaseUrl ? "SET" : "MISSING");
      console.error(`[API] [${requestId}] NEXT_PUBLIC_SUPABASE_ANON_KEY:`, anon ? "SET" : "MISSING");
      console.error(`[API] [${requestId}] Available env vars with SUPABASE:`, Object.keys(process.env).filter(k => k.includes("SUPABASE")));
      return NextResponse.json({ 
        error: "Server configuration error",
        details: "Supabase configuration missing. Please check environment variables.",
        hint: "Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in Vercel",
        debug: {
          urlExists: !!supabaseUrl,
          anonExists: !!anon,
          availableEnvVars: Object.keys(process.env).filter(k => k.includes("SUPABASE")),
          requestId: requestId
        }
      }, { status: 500 });
    }
    
    // Validate API key format (basic check)
    if (anon.length < 100 || !anon.startsWith("eyJ")) {
      console.error(`[API] [${requestId}] ❌ CRITICAL: Supabase API key format appears invalid`);
      console.error(`[API] [${requestId}] API key length:`, anon.length, "starts with:", anon.substring(0, 10));
      console.error(`[API] [${requestId}] Full key (first 50 chars):`, anon.substring(0, 50));
      return NextResponse.json({ 
        error: "Server configuration error",
        details: "Invalid API key format detected. Please verify NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.",
        hint: "The API key should be a JWT token starting with 'eyJ'. Get it from your Supabase project settings.",
        debug: {
          keyLength: anon.length,
          keyPrefix: anon.substring(0, 50),
          keyStartsWithEyJ: anon.startsWith("eyJ"),
          requestId: requestId
        }
      }, { status: 500 });
    }
    
    // Log API key info for debugging (without exposing the full key)
    const keyInfo = {
      url: supabaseUrl,
      keyLength: anon.length,
      keyPrefix: anon.substring(0, 20) + "...",
      keyEnd: "..." + anon.substring(anon.length - 10),
      urlMatches: supabaseUrl.includes("supabase.co"),
      keyStartsWithEyJ: anon.startsWith("eyJ"),
      keyContainsCorrectRef: anon.includes("cycakdfxcsjknxkqpasp") || supabaseUrl.includes("cycakdfxcsjknxkqpasp")
    };
    console.log(`[API] [${requestId}] Supabase configuration check:`, keyInfo);
    
    // Additional validation: Check if URL and key match
    if (!supabaseUrl.includes("supabase.co")) {
      console.error(`[API] [${requestId}] ❌ Invalid Supabase URL format`);
      return NextResponse.json({ 
        error: "Server configuration error",
        details: "Invalid Supabase URL format. Should be https://[project-ref].supabase.co",
        hint: "Check NEXT_PUBLIC_SUPABASE_URL in Vercel environment variables"
      }, { status: 500 });
    }
    
    // Check if the key appears to be for the correct project
    const expectedProjectRef = "cycakdfxcsjknxkqpasp"; // From the working client-side URL
    if (!supabaseUrl.includes(expectedProjectRef)) {
      console.warn(`[API] [${requestId}] ⚠️ Supabase URL doesn't match expected project ref: ${expectedProjectRef}`);
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, anon, {
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

    // Auth - try cookie-based first, fallback to Bearer token
    console.log(`[API] [${requestId}] Attempting authentication...`);
    
    // Check for cookies
    const cookieNames = cookieStore.getAll().map(c => c.name);
    const supabaseCookies = cookieNames.filter(name => name.includes('supabase') || name.includes('sb-'));
    console.log(`[API] [${requestId}] Found cookies: ${cookieNames.length} total, ${supabaseCookies.length} Supabase-related`);
    console.log(`[API] [${requestId}] Supabase cookie names:`, supabaseCookies);
    
    const { data: cookieAuth, error: cookieErr } = await supabase.auth.getUser();
    let user = cookieAuth?.user;
    let authError = cookieErr;

    console.log(`[API] [${requestId}] Cookie auth result:`, {
      hasUser: !!user,
      userId: user?.id,
      errorCode: cookieErr?.code,
      errorMessage: cookieErr?.message,
    });

    // Fallback to Bearer token if cookie auth fails
    if ((!user || cookieErr) && req.headers) {
      const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
      const hasAuthHeader = !!authHeader;
      const bearer = authHeader.toLowerCase().startsWith("bearer ")
        ? authHeader.slice(7).trim()
        : null;

      console.log(`[API] [${requestId}] Bearer token check:`, {
        hasAuthHeader,
        headerLength: authHeader.length,
        hasBearer: !!bearer,
        bearerPrefix: bearer ? bearer.substring(0, 20) + '...' : null,
      });

      if (bearer) {
        const { createClient: createSbClient } = await import("@supabase/supabase-js");
        const supabaseBearer = createSbClient(supabaseUrl, anon, {
          global: { headers: { Authorization: `Bearer ${bearer}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: bearerAuth, error: bearerErr } = await supabaseBearer.auth.getUser();
        
        console.log(`[API] [${requestId}] Bearer auth result:`, {
          hasUser: !!bearerAuth?.user,
          userId: bearerAuth?.user?.id,
          errorCode: bearerErr?.code,
          errorMessage: bearerErr?.message,
        });
        
        if (bearerErr) {
          authError = bearerErr;
        } else {
          user = bearerAuth?.user;
          authError = null;
        }
      }
    }

    if (authError || !user) {
      console.error(`[API] [${requestId}] ❌ Authentication failed:`, {
        cookieAuthError: cookieErr?.message,
        bearerAuthError: authError?.message,
        hasUser: !!user,
        cookieCount: cookieNames.length,
        supabaseCookieCount: supabaseCookies.length,
      });
      
      return NextResponse.json({ 
        error: "Unauthorized",
        details: "Please log in again to view this drug test.",
        hint: authError?.message || "Your session may have expired. Please refresh the page or log in again.",
        debug: {
          requestId: requestId,
          cookieCount: cookieNames.length,
          supabaseCookieCount: supabaseCookies.length,
          authErrorCode: authError?.code,
          authErrorMessage: authError?.message,
        }
      }, { status: 401 });
    }

    console.log(`[API] [${requestId}] ✅ Authentication successful for user: ${user.id}`);

    console.log(`[API] Fetching drug test: ${finalTestId} for user: ${user.id}`);
    
    // Fetch the specific drug test for this patient
    // Note: drug_tests.patient_id references patients.user_id, so we use user.id directly
    // RLS might require the patient_id filter, so we use it explicitly
    // We'll check patient record only if needed for debugging
    const startTime = Date.now();
    
    // Skip connection test since we've already authenticated successfully
    // If the API key was invalid, auth.getUser() would have failed
    // This test query can fail due to RLS even with valid API key, so we skip it
    console.log(`[API] [${requestId}] Skipping connection test - authentication already successful`);
    let connectionTestPassed = true;
    
    // Only run connection test if you really need to verify API key before query
    // Since we've already authenticated, the API key is valid
    // Uncomment below if you want to test anyway:
    /*
    console.log(`[API] [${requestId}] Testing Supabase connection with configured key...`);
    try {
      // Try a simple query that should work even with RLS (if authenticated)
      const { data: testConnection, error: testError } = await supabase
        .from("drug_tests")
        .select("id")
        .limit(1);
      
      if (testError) {
        // Log the full error for debugging
        const fullError = {
          code: testError.code,
          message: testError.message,
          details: testError.details,
          hint: testError.hint,
          status: (testError as any).status,
          statusCode: (testError as any).statusCode,
        };
        console.error(`[API] [${requestId}] ❌ Supabase connection test failed:`, JSON.stringify(fullError, null, 2));
        
        // Only return error if it's specifically an API key authentication error
        // RLS errors (PGRST301) or other errors might be acceptable at this stage
        const isApiKeyError = 
          testError.message?.includes("Invalid API key") || 
          testError.message?.includes("JWT") ||
          testError.message?.toLowerCase().includes("invalid api key") ||
          testError.message?.toLowerCase().includes("authentication failed") ||
          testError.message?.toLowerCase().includes("invalid") && testError.message?.toLowerCase().includes("key") ||
          testError.code === "PGRST302" || // Invalid API key
          testError.code === "PGRST401" || // Unauthorized
          testError.code === "PGRST301" || // Some 301s are API key issues
          testError.code === "bad_jwt" || // JWT parsing error
          testError.code === "invalid_token"; // Token validation error
        
        if (isApiKeyError) {
          console.error(`[API] [${requestId}] ❌ CRITICAL: API key authentication failed`);
          console.error(`[API] [${requestId}] Expected Supabase URL: https://cycakdfxcsjknxkqpasp.supabase.co`);
          console.error(`[API] [${requestId}] Actual Supabase URL: ${supabaseUrl}`);
          console.error(`[API] [${requestId}] Key length: ${anon.length}, starts with: ${anon.substring(0, 10)}`);
          console.error(`[API] [${requestId}] Full error object:`, JSON.stringify(testError, Object.getOwnPropertyNames(testError)));
          
          // Log the full Supabase error for debugging
          console.error(`[API] [${requestId}] ========== FULL SUPABASE ERROR OBJECT ==========`);
          console.error(`[API] [${requestId}] Error Code:`, testError.code);
          console.error(`[API] [${requestId}] Error Message:`, testError.message);
          console.error(`[API] [${requestId}] Error Details:`, testError.details);
          console.error(`[API] [${requestId}] Error Hint:`, testError.hint);
          console.error(`[API] [${requestId}] Full Error (JSON):`, JSON.stringify(testError, Object.getOwnPropertyNames(testError)));
          console.error(`[API] [${requestId}] ================================================`);
          
          return NextResponse.json({ 
            error: "Server configuration error",
            details: "Invalid API key detected. The Supabase API key in Vercel environment variables is incorrect, expired, or doesn't match the Supabase project.",
            hint: "1. Go to Supabase Dashboard → Settings → API → Copy the 'anon/public' key\n2. Go to Vercel → Settings → Environment Variables\n3. Update NEXT_PUBLIC_SUPABASE_ANON_KEY with the correct value\n4. Make sure it's set for 'Production' environment\n5. Redeploy the application\n6. Check for hidden characters (spaces, newlines) in the key\n7. Make sure the key matches the project ref: cycakdfxcsjknxkqpasp",
            debug: {
              errorCode: testError.code,
              errorMessage: testError.message,
              errorDetails: testError.details,
              errorHint: testError.hint,
              supabaseUrl: supabaseUrl,
              keyLength: anon.length,
              keyPrefix: anon.substring(0, 20),
              keySuffix: anon.substring(anon.length - 10),
              keyHasSpaces: anon.includes(' '),
              keyHasNewlines: anon.includes('\n') || anon.includes('\r'),
              keyStartsWithEyJ: anon.startsWith('eyJ'),
              urlMatchesProject: supabaseUrl.includes("cycakdfxcsjknxkqpasp"),
              expectedProjectRef: "cycakdfxcsjknxkqpasp",
              requestId: requestId
            }
          }, { status: 500 });
        } else {
          // Not an API key error - might be RLS or other issue, continue
          console.log(`[API] [${requestId}] ⚠️ Connection test failed but not due to API key (likely RLS): ${testError.code} - ${testError.message}`);
          connectionTestPassed = true; // We'll continue, the actual query will handle the error
        }
      } else {
        connectionTestPassed = true;
        console.log(`[API] [${requestId}] ✅ Supabase connection test passed`);
      }
    } catch (testConnErr: any) {
      console.error(`[API] [${requestId}] ❌ Exception testing Supabase connection:`, testConnErr);
      console.error(`[API] [${requestId}] Exception details:`, {
        name: testConnErr?.name,
        message: testConnErr?.message,
        code: testConnErr?.code,
        stack: testConnErr?.stack?.substring(0, 500)
      });
      
      // If it's a network error, that's different from an API key error
      if (testConnErr.message?.includes("ECONNREFUSED") || testConnErr.message?.includes("ENOTFOUND")) {
        return NextResponse.json({ 
          error: "Network error",
          details: "Unable to connect to Supabase. Please check your internet connection and Supabase project status.",
          hint: "Check if your Supabase project is active and accessible"
        }, { status: 503 });
      }
      
      // For other exceptions, log but continue - the actual query will provide better error info
      console.warn(`[API] [${requestId}] ⚠️ Connection test exception, but continuing with actual query...`);
    }
    */
    
    let { data: drugTest, error: drugTestError } = await supabase
      .from("drug_tests")
      .select("id, status, scheduled_for, created_at, updated_at, metadata, patient_id")
      .eq("id", finalTestId)
      .eq("patient_id", user.id)  // Explicit filter for RLS
      .maybeSingle();
    
    const queryTime = Date.now() - startTime;
    console.log(`[API] Initial query completed in ${queryTime}ms`);
    
    // Track if we had to bypass RLS (for logging and response headers)
    let rlsBypassed = false;
    
    console.log(`[API] Initial query result:`, {
      hasData: !!drugTest,
      hasError: !!drugTestError,
      errorCode: drugTestError?.code,
      errorMessage: drugTestError?.message,
      patientId: user.id,
      testId: finalTestId
    });
    
    // If RLS is blocking and we got no results (no error but no data), use service role as fallback
    // This handles cases where RLS silently blocks access
    if (!drugTest && !drugTestError) {
      console.warn(`[API] ⚠️ RLS BLOCKING DETECTED: No results from regular query (RLS may be silently blocking)`);
      console.warn(`[API] Attempting service role fallback to verify if test exists...`);
      
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
      if (serviceKey) {
        try {
          const { createClient: createSbClient } = await import("@supabase/supabase-js");
          const adminClient = createSbClient(supabaseUrl, serviceKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          
          // Query with service role (bypasses RLS) to verify if test exists and belongs to patient
          // Add timeout to prevent hanging
          const adminStartTime = Date.now();
          
          let adminTest: any = null;
          let adminError: any = null;
          
          try {
            // Set a timeout of 5 seconds for the admin query
            const queryPromise = adminClient
              .from("drug_tests")
              .select("id, status, scheduled_for, created_at, updated_at, metadata, patient_id")
              .eq("id", finalTestId)
              .eq("patient_id", user.id) // Verify ownership
              .maybeSingle();
            
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error("Service role query timeout")), 5000)
            );
            
            const result = await Promise.race([queryPromise, timeoutPromise]) as { data: any; error: any } | Error;
            
            if (result instanceof Error) {
              // Timeout occurred
              console.error(`[API] Service role query timed out after 5 seconds`);
              adminError = { message: "Query timeout", code: "TIMEOUT" };
            } else {
              // Query completed
              adminTest = result.data || null;
              adminError = result.error || null;
            }
          } catch (timeoutError: any) {
            console.error(`[API] Error in service role query:`, timeoutError);
            adminError = timeoutError?.message?.includes("timeout") 
              ? { message: "Query timeout", code: "TIMEOUT" }
              : timeoutError;
          }
          
          const adminQueryTime = Date.now() - adminStartTime;
          console.log(`[API] Service role query completed in ${adminQueryTime}ms`);
          
          if (adminError) {
            console.error(`[API] Service role query error:`, adminError);
            // If service role also fails, use the error
            drugTestError = adminError;
          } else if (adminTest) {
            // Drug test exists and belongs to this patient - use service role result
            console.warn(`[API] ⚠️ RLS WORKAROUND ACTIVE: Using service role result (bypassing RLS)`);
            console.warn(`[API] ⚠️ FIX REQUIRED: Run scripts/SIMPLE_FIX_DRUG_TESTS_RLS.sql in Supabase SQL Editor`);
            console.warn(`[API] ⚠️ The RLS policy should be: USING (patient_id = auth.uid())`);
            console.log(`[API] Drug test found for patient ${user.id} via service role fallback`);
            drugTest = adminTest;
            drugTestError = null;
            rlsBypassed = true; // Mark that we bypassed RLS
          } else {
            // Check if test exists but belongs to different patient (for better error message)
            const { data: anyTest } = await adminClient
              .from("drug_tests")
              .select("id, patient_id")
              .eq("id", finalTestId)
              .maybeSingle();
            
            if (anyTest) {
              console.log(`[API] Drug test exists but belongs to different patient: ${anyTest.patient_id} vs ${user.id}`);
              // Return 403 Forbidden instead of 404 Not Found
              return NextResponse.json({ 
                error: "Access denied",
                details: `Drug test exists but belongs to a different patient. Expected patient_id: ${user.id}, Found: ${anyTest.patient_id}`,
                testId: finalTestId,
                userId: user.id
              }, { status: 403 });
            } else {
              console.log(`[API] Drug test ${finalTestId} does not exist in database`);
            }
          }
        } catch (adminCheckError: any) {
          console.error(`[API] Error in service role check:`, adminCheckError);
          // If it's a timeout, log it but continue
          if (adminCheckError?.message?.includes("timeout")) {
            console.warn(`[API] ⚠️ Service role query timed out - this may indicate a slow database connection`);
          }
        }
      } else {
        console.error(`[API] ❌ CRITICAL: Service role key not available and RLS is blocking access`);
        console.error(`[API] ❌ FIX REQUIRED: Either:`);
        console.error(`[API]   1. Run scripts/SIMPLE_FIX_DRUG_TESTS_RLS.sql in Supabase SQL Editor (RECOMMENDED)`);
        console.error(`[API]   2. Set SUPABASE_SERVICE_ROLE_KEY environment variable (temporary workaround)`);
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
      
      // Check for API key errors - be VERY strict since we've already authenticated
      // If auth.getUser() succeeded, the API key is valid, so this is almost certainly NOT an API key error
      // Only treat it as API key error if we get the SPECIFIC error code PGRST302
      const isApiKeyError = drugTestError.code === "PGRST302"; // Only this specific code
      
      // Log the actual error for debugging
      console.error(`[API] [${requestId}] Query error details:`, {
        code: drugTestError.code,
        message: drugTestError.message,
        details: drugTestError.details,
        hint: drugTestError.hint,
        fullError: JSON.stringify(drugTestError, Object.getOwnPropertyNames(drugTestError))
      });
      
      if (isApiKeyError) {
        // Only if we get the specific PGRST302 error code
        console.error(`[API] [${requestId}] ❌ CRITICAL: Invalid Supabase API key detected in query`);
        console.error(`[API] [${requestId}] ⚠️ NOTE: This is VERY unusual since authentication succeeded`);
        console.error(`[API] [${requestId}] Error code: ${drugTestError.code}`);
        console.error(`[API] [${requestId}] Error message: ${drugTestError.message}`);
        console.error(`[API] [${requestId}] Full error:`, JSON.stringify(drugTestError, Object.getOwnPropertyNames(drugTestError)));
        console.error(`[API] [${requestId}] Supabase URL: ${supabaseUrl}`);
        console.error(`[API] [${requestId}] API key length: ${anon.length}, prefix: ${anon.substring(0, 20)}`);
        
        return NextResponse.json({ 
          error: "Server configuration error",
          details: "Invalid API key detected in query (VERY unusual since authentication succeeded). The Supabase API key in Vercel environment variables may be incorrect or doesn't match the Supabase project.",
          hint: "1. Go to Supabase Dashboard → Settings → API → Copy the 'anon/public' key\n2. Go to Vercel → Settings → Environment Variables\n3. Update NEXT_PUBLIC_SUPABASE_ANON_KEY with the correct value\n4. Make sure it's set for 'Production' environment\n5. Redeploy the application\n6. Check Vercel Function logs for detailed error information",
          debug: {
            errorCode: drugTestError.code,
            errorMessage: drugTestError.message,
            errorDetails: drugTestError.details,
            supabaseUrl: supabaseUrl,
            keyLength: anon.length,
            keyPrefix: anon.substring(0, 20),
            requestId: requestId,
            note: "Authentication succeeded, but query failed with PGRST302 - this is very unusual"
          }
        }, { status: 500 });
      }
      
      // If it's not PGRST302, it's NOT an API key error
      // It's likely RLS, query syntax, or another issue
      // Log the actual error code and message for debugging
      
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
      
      // Check if service role key is available - if not, that's likely the issue
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
      const hasServiceKey = !!serviceKey;
      
      // Try to check if test exists but belongs to different patient (for debugging)
      // Use service role to bypass RLS for this check
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

    // Add warning header if RLS was bypassed (for monitoring)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (rlsBypassed) {
      headers['X-RLS-Bypassed'] = 'true';
      headers['X-RLS-Warning'] = 'RLS policy may be misconfigured. See logs for details.';
    }

    return NextResponse.json({ drugTest: formattedTest }, { headers });
  } catch (error: any) {
    // requestId is available from outer scope
    console.error(`[API] [${requestId}] ====== UNCAUGHT ERROR IN GET /api/patient/drug-tests/[id] ======`);
    console.error(`[API] [${requestId}] Error:`, error);
    console.error(`[API] [${requestId}] Error type:`, typeof error);
    console.error(`[API] [${requestId}] Error name:`, error?.name);
    console.error(`[API] [${requestId}] Error message:`, error?.message);
    console.error(`[API] [${requestId}] Error stack:`, error?.stack);
    console.error(`[API] [${requestId}] Error code:`, error?.code);
    
    // Try to stringify error safely
    let errorString = "Unknown error occurred";
    try {
      errorString = JSON.stringify(error, Object.getOwnPropertyNames(error));
    } catch (e) {
      errorString = String(error) || error?.message || "Unknown error occurred";
    }
    console.error(`[API] [${requestId}] Full error:`, errorString);
    
    const errorResponse = {
      error: "Internal server error",
      details: error?.message || String(error) || "Unknown error occurred",
      code: error?.code || "UNKNOWN_ERROR",
      timestamp: new Date().toISOString(),
      requestId: requestId
    };
    
    console.log(`[API] [${requestId}] Returning 500 error response`);
    
    // Always try to return a response
    try {
      return NextResponse.json(errorResponse, { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          'X-Request-ID': requestId
        }
      });
    } catch (responseError) {
      console.error(`[API] [${requestId}] Failed to create JSON response:`, responseError);
      // Last resort - return plain text response that will definitely work
      try {
        return new Response(
          JSON.stringify(errorResponse),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': requestId
            }
          }
        );
      } catch (finalError) {
        // Absolute last resort - return a simple text response
        console.error(`[API] [${requestId}] Complete failure to create response`);
        return new Response(
          "Internal Server Error",
          {
            status: 500,
            headers: {
              'Content-Type': 'text/plain',
              'X-Request-ID': requestId
            }
          }
        );
      }
    }
  }
}

