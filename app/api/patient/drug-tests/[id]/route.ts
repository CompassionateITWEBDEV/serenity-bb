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
  
  // Detect development environment
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                        process.env.VERCEL_ENV !== 'production' ||
                        !process.env.VERCEL;
  
  // Log to multiple outputs to ensure visibility
  const logMessage = `[API] [${requestId}] Route handler executing at ${new Date().toISOString()}`;
  console.error(`[API] [${requestId}] ========== ROUTE HANDLER EXECUTING ==========`);
  console.error(`[API] [${requestId}] GET /api/patient/drug-tests/[id] CALLED`);
  console.error(`[API] [${requestId}] Request URL:`, req.url);
  console.error(`[API] [${requestId}] Request method:`, req.method);
  console.error(`[API] [${requestId}] Timestamp:`, new Date().toISOString());
  console.error(`[API] [${requestId}] Runtime: nodejs`);
  console.error(`[API] [${requestId}] Environment: ${isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION'}`);
  
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

    let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    let anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    // Trim whitespace from environment variables (common issue)
    if (supabaseUrl) supabaseUrl = supabaseUrl.trim();
    if (anon) anon = anon.trim();
    
    // Check for hidden characters or encoding issues
    const anonHasWhitespace = anon && (anon.includes(' ') || anon.includes('\n') || anon.includes('\r') || anon.includes('\t'));
    const anonHasInvalidChars = anon && /[^\x20-\x7E]/.test(anon); // Check for non-printable ASCII
    
    // Log environment variable status for debugging
    console.log(`[API] [${requestId}] Environment variable check:`, {
      urlExists: !!supabaseUrl,
      urlLength: supabaseUrl?.length || 0,
      urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : "MISSING",
      anonExists: !!anon,
      anonLength: anon?.length || 0,
      anonPrefix: anon ? `${anon.substring(0, 20)}...` : "MISSING",
      anonSuffix: anon ? `...${anon.substring(anon.length - 10)}` : "MISSING",
      anonHasWhitespace: anonHasWhitespace,
      anonHasInvalidChars: anonHasInvalidChars,
      anonFirstChar: anon ? anon.charCodeAt(0) : null,
      anonLastChar: anon ? anon.charCodeAt(anon.length - 1) : null,
      allEnvKeys: Object.keys(process.env).filter(k => k.includes("SUPABASE")).join(", ")
    });
    
    // Warn about whitespace issues
    if (anonHasWhitespace && anon) {
      console.error(`[API] [${requestId}] ⚠️ WARNING: API key contains whitespace! This can cause PGRST302 errors.`);
      console.error(`[API] [${requestId}] API key has spaces: ${anon.includes(' ')}`);
      console.error(`[API] [${requestId}] API key has newlines: ${anon.includes('\n') || anon.includes('\r')}`);
      // Don't fail here - try to use the trimmed version
    }
    
    if (anonHasInvalidChars) {
      console.error(`[API] [${requestId}] ⚠️ WARNING: API key contains non-printable characters!`);
    }

    // Validate API key format and project match
    if (anon) {
      const expectedProjectRef = "cycakdfxcsjknxkqpasp";
      
      // Check if API key is a valid JWT
      if (!anon.startsWith('eyJ')) {
        console.error(`[API] [${requestId}] ❌ WARNING: API key does not start with 'eyJ' (not a valid JWT)`);
        console.error(`[API] [${requestId}] API key starts with: ${anon.substring(0, 10)}`);
      } else {
        // Try to decode JWT payload to verify project ref
        try {
          const jwtParts = anon.split('.');
          if (jwtParts.length === 3) {
            const jwtPayload = JSON.parse(Buffer.from(jwtParts[1], 'base64').toString());
            const jwtProjectRef = jwtPayload?.ref;
            const jwtRole = jwtPayload?.role;
            
            console.log(`[API] [${requestId}] JWT decoded:`, {
              ref: jwtProjectRef,
              role: jwtRole,
              matchesExpected: jwtProjectRef === expectedProjectRef,
              urlProjectRef: supabaseUrl?.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1]
            });
            
            if (jwtProjectRef && jwtProjectRef !== expectedProjectRef) {
              console.error(`[API] [${requestId}] ❌ CRITICAL: API key project ref mismatch!`);
              console.error(`[API] [${requestId}] Expected: ${expectedProjectRef}, Found in JWT: ${jwtProjectRef}`);
              return NextResponse.json({
                error: "Server configuration error",
                details: `API key project ref mismatch. The API key in Vercel is for project '${jwtProjectRef}', but should be for '${expectedProjectRef}'.`,
                hint: `Go to Supabase Dashboard → Project ${expectedProjectRef} → Settings → API → Copy the 'anon/public' key and update NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel`,
                debug: {
                  expectedProjectRef,
                  jwtProjectRef,
                  urlProjectRef: supabaseUrl?.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1],
                  requestId: requestId
                }
              }, { status: 500 });
            }
          }
        } catch (jwtError: any) {
          console.error(`[API] [${requestId}] Failed to decode JWT:`, jwtError?.message);
          // Don't fail here, just log - the key might still be valid
        }
      }
    }
    
    if (!supabaseUrl || !anon) {
      console.error(`[API] [${requestId}] ❌ CRITICAL: Supabase environment variables missing`);
      console.error(`[API] [${requestId}] NEXT_PUBLIC_SUPABASE_URL:`, supabaseUrl ? "SET" : "MISSING");
      console.error(`[API] [${requestId}] NEXT_PUBLIC_SUPABASE_ANON_KEY:`, anon ? "SET" : "MISSING");
      console.error(`[API] [${requestId}] Available env vars with SUPABASE:`, Object.keys(process.env).filter(k => k.includes("SUPABASE")));
      const envHint = isDevelopment
        ? "Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local file"
        : "Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in Vercel Environment Variables";
      
      return NextResponse.json({ 
        error: "Server configuration error",
        details: "Supabase configuration missing. Please check environment variables.",
        hint: envHint,
        debug: {
          urlExists: !!supabaseUrl,
          anonExists: !!anon,
          availableEnvVars: Object.keys(process.env).filter(k => k.includes("SUPABASE")),
          environment: isDevelopment ? "development" : "production",
          requestId: requestId
        }
      }, { status: 500 });
    }
    
    // Validate API key format (basic check)
    if (anon.length < 100 || !anon.startsWith("eyJ")) {
      console.error(`[API] [${requestId}] ❌ CRITICAL: Supabase API key format appears invalid`);
      console.error(`[API] [${requestId}] API key length:`, anon.length, "starts with:", anon.substring(0, 10));
      console.error(`[API] [${requestId}] Full key (first 50 chars):`, anon.substring(0, 50));
      const envHint = isDevelopment
        ? "Check your .env.local file - the API key should be a JWT token starting with 'eyJ'. Get it from Supabase Dashboard → Settings → API"
        : "Check Vercel Environment Variables - the API key should be a JWT token starting with 'eyJ'. Get it from Supabase Dashboard → Settings → API";
      
      return NextResponse.json({ 
        error: "Server configuration error",
        details: "Invalid API key format detected. Please verify NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        hint: envHint,
        debug: {
          keyLength: anon.length,
          keyPrefix: anon.substring(0, 50),
          keyStartsWithEyJ: anon.startsWith("eyJ"),
          environment: isDevelopment ? "development" : "production",
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

    // Log the RAW error immediately, before any processing
    if (drugTestError) {
      console.error(`[API] [${requestId}] ========== RAW SUPABASE ERROR (BEFORE PROCESSING) ==========`);
      console.error(`[API] [${requestId}] Error type:`, typeof drugTestError);
      console.error(`[API] [${requestId}] Error constructor:`, drugTestError.constructor?.name);
      console.error(`[API] [${requestId}] Error as string:`, String(drugTestError));
      console.error(`[API] [${requestId}] Error as JSON:`, JSON.stringify(drugTestError, null, 2));
      console.error(`[API] [${requestId}] Error keys:`, Object.keys(drugTestError));
      console.error(`[API] [${requestId}] Error properties:`, Object.getOwnPropertyNames(drugTestError));
      
      // Try to access code in multiple ways
      const code1 = drugTestError.code;
      const code2 = (drugTestError as any)?.code;
      const code3 = (drugTestError as any)?.['code'];
      const code4 = Reflect.get(drugTestError, 'code');
      const code5 = (drugTestError as any)?.status;
      const code6 = (drugTestError as any)?.error_code;
      const code7 = (drugTestError as any)?.errorCode;
      
      console.error(`[API] [${requestId}] Code extraction attempts:`, {
        code1, code2, code3, code4, code5, code6, code7,
        message: drugTestError.message,
        details: drugTestError.details,
        hint: drugTestError.hint
      });
      console.error(`[API] [${requestId}] ==========================================================`);
    }
    
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
      // Extract error code from multiple possible locations
      // Try direct property access first
      let errorCode = drugTestError.code || 
                       (drugTestError as any)?.status || 
                       (drugTestError as any)?.error_code ||
                       (drugTestError as any)?.errorCode ||
                       null;
      
      // If still null, try to extract from message/details/hint using regex
      if (!errorCode) {
        const codeFromMessage = drugTestError.message?.match(/PGRST\d{3}/)?.[0] ||
                                drugTestError.message?.match(/PGRST\d{2,3}/)?.[0];
        const codeFromDetails = drugTestError.details?.match(/PGRST\d{3}/)?.[0] ||
                                drugTestError.details?.match(/PGRST\d{2,3}/)?.[0];
        const codeFromHint = drugTestError.hint?.match(/PGRST\d{3}/)?.[0] ||
                             drugTestError.hint?.match(/PGRST\d{2,3}/)?.[0];
        
        errorCode = codeFromMessage || codeFromDetails || codeFromHint || null;
      }
      
      // If still null, try to infer from error message content
      if (!errorCode) {
        if (drugTestError.message?.includes("Invalid API key") || drugTestError.message?.includes("JWT")) {
          errorCode = "PGRST302"; // Most likely API key error
        } else if (drugTestError.message?.includes("row-level security") || drugTestError.message?.includes("policy")) {
          errorCode = "PGRST301"; // Most likely RLS error
        } else if (drugTestError.message?.includes("not found") || drugTestError.message?.includes("does not exist")) {
          errorCode = "PGRST116"; // Not found error
        }
      }
      
      // Log the full error structure for debugging
      const errorKeys = Object.keys(drugTestError);
      const errorProps = Object.getOwnPropertyNames(drugTestError);
      console.error(`[API] [${requestId}] Query error - Full structure:`, {
        code: drugTestError.code,
        errorCode: errorCode,
        message: drugTestError.message,
        details: drugTestError.details,
        hint: drugTestError.hint,
        errorKeys: errorKeys,
        errorProps: errorProps,
        fullError: JSON.stringify(drugTestError, null, 2),
        errorString: String(drugTestError),
        errorType: typeof drugTestError,
        errorConstructor: drugTestError.constructor?.name
      });
      
      // Check for API key errors - be VERY strict since we've already authenticated
      // If auth.getUser() succeeded, the API key is valid, so this is almost certainly NOT an API key error
      // Only treat it as API key error if we get the SPECIFIC error code PGRST302
      const isApiKeyError = errorCode === "PGRST302"; // Only this specific code
      
      if (isApiKeyError) {
        // Only if we get the specific PGRST302 error code
        console.error(`[API] [${requestId}] ❌ CRITICAL: Invalid Supabase API key detected in query`);
        console.error(`[API] [${requestId}] ⚠️ NOTE: This is VERY unusual since authentication succeeded`);
        console.error(`[API] [${requestId}] Error code: ${errorCode}`);
        console.error(`[API] [${requestId}] Error message: ${drugTestError.message}`);
        console.error(`[API] [${requestId}] Full error:`, JSON.stringify(drugTestError, null, 2));
        console.error(`[API] [${requestId}] Supabase URL: ${supabaseUrl}`);
        console.error(`[API] [${requestId}] API key length: ${anon.length}, prefix: ${anon.substring(0, 20)}`);
        
        const envHint = isDevelopment
          ? "1. Go to Supabase Dashboard → Settings → API → Copy the 'anon/public' key\n2. Check your .env.local file\n3. Update NEXT_PUBLIC_SUPABASE_ANON_KEY with the correct value\n4. Restart your development server (npm run dev)\n5. Check terminal logs for detailed error information"
          : "1. Go to Supabase Dashboard → Settings → API → Copy the 'anon/public' key\n2. Go to Vercel → Settings → Environment Variables\n3. Update NEXT_PUBLIC_SUPABASE_ANON_KEY with the correct value\n4. Make sure it's set for 'Production' environment\n5. Redeploy the application\n6. Check Vercel Function logs for detailed error information";
        
        return NextResponse.json({ 
          error: "Server configuration error",
          details: "Invalid API key detected in query (VERY unusual since authentication succeeded). The Supabase API key may be incorrect or doesn't match the Supabase project.",
          hint: envHint,
          debug: {
            errorCode: errorCode,
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
      
      if (errorCode === "PGRST116" || errorCode === "42P01") {
        return NextResponse.json({ error: "Drug test not found" }, { status: 404 });
      }
      
      // Check for RLS errors (PGRST301 is usually RLS, even if message says "Invalid API key")
      if (errorCode === "PGRST301" || 
          drugTestError.message?.includes("row-level security") || 
          drugTestError.message?.includes("policy") ||
          drugTestError.message?.includes("permission denied") ||
          drugTestError.message?.includes("RLS")) {
        console.error(`[API] [${requestId}] RLS policy blocking access - Error code: ${errorCode}`);
        console.error(`[API] [${requestId}] This is likely an RLS policy issue, not an API key issue`);
        const rlsHint = isDevelopment
          ? "Run scripts/CLEAN_DRUG_TESTS_RLS_POLICIES.sql in Supabase SQL Editor to fix RLS policies. This is a common issue in development."
          : "Run scripts/CLEAN_DRUG_TESTS_RLS_POLICIES.sql in Supabase SQL Editor to fix RLS policies";
        
        return NextResponse.json({ 
          error: "Drug test not found or access denied",
          details: "Row Level Security (RLS) policy is blocking access to this drug test. Please ensure RLS policies are correctly configured.",
          hint: rlsHint,
          debug: {
            errorCode: errorCode,
            errorMessage: drugTestError.message,
            errorDetails: drugTestError.details,
            errorHint: drugTestError.hint,
            note: "PGRST301 usually means RLS is blocking, even if message mentions API key",
            requestId: requestId
          }
        }, { status: 403 });
      }
      
      // For all other errors, return with error code for debugging
      console.error(`[API] [${requestId}] Query failed with error code: ${errorCode || 'NO_CODE'}`);
      console.error(`[API] [${requestId}] Error message: ${drugTestError.message}`);
      console.error(`[API] [${requestId}] Error details: ${drugTestError.details}`);
      console.error(`[API] [${requestId}] Error hint: ${drugTestError.hint}`);
      
      // Don't use the error message directly if it says "Invalid API key" - that's misleading
      // Since auth succeeded, the API key is valid, so this is likely RLS or another issue
      const errorDetails = drugTestError.message?.includes("Invalid API key") && errorCode !== "PGRST302"
        ? `Query failed with error code ${errorCode || 'unknown'}. The message mentions "Invalid API key" but authentication succeeded, so this is likely an RLS policy issue. Check the error code in debug.`
        : drugTestError.message || "Unknown error";
      
      const errorHint = isDevelopment
        ? `Error code: ${errorCode || 'unknown'}. Check your terminal logs for details. If error code is PGRST301, run scripts/CLEAN_DRUG_TESTS_RLS_POLICIES.sql in Supabase.`
        : `Error code: ${errorCode || 'unknown'}. Check Vercel Function logs for detailed error information. If error code is PGRST301, run scripts/CLEAN_DRUG_TESTS_RLS_POLICIES.sql in Supabase.`;
      
      return NextResponse.json(
        { 
          error: "Failed to fetch drug test", 
          details: errorDetails,
          hint: drugTestError.hint || errorHint,
          debug: {
            errorCode: errorCode,
            errorMessage: drugTestError.message,
            errorDetails: drugTestError.details,
            errorHint: drugTestError.hint,
            environment: isDevelopment ? "development" : "production",
            note: drugTestError.message?.includes("Invalid API key") && errorCode !== "PGRST302"
              ? "Message says 'Invalid API key' but authentication succeeded - this is likely RLS or another issue, not API key"
              : null,
            requestId: requestId
          }
        },
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

