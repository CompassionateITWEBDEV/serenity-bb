"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TestTube2, Calendar, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, ArrowLeft, User, FileText, MapPin } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { supabase } from "@/lib/supabase/client";

interface DrugTestDetail {
  id: string;
  status: "pending" | "completed" | "missed";
  scheduledFor: string | null;
  createdAt: string;
  updatedAt: string | null;
  metadata: Record<string, any>;
}

export default function DrugTestDetailPage() {
  const { isAuthenticated, loading: authLoading, patient } = useAuth();
  const router = useRouter();
  const params = useParams();
  const testId = params.id as string;
  
  // Log the test ID when component mounts or params change
  useEffect(() => {
    console.log('[Detail Page] Component mounted/updated with params:', {
      testId,
      allParams: params,
      pathname: window.location.pathname
    });
  }, [testId, params]);
  
  const [drugTest, setDrugTest] = useState<DrugTestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
      return;
    }
  }, [authLoading, isAuthenticated, router]);

  const loadDrugTest = async () => {
    if (!patient?.id || !testId) {
      console.log('[Detail Page] Missing patient.id or testId:', { patientId: patient?.id, testId });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('[Detail Page] Loading drug test:', { 
        testId, 
        patientId: patient.id,
        fullUrl: `/api/patient/drug-tests/${testId}`
      });
      
      // Get session token for authentication
      let token: string | undefined;
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('[Detail Page] Error getting session:', sessionError);
        }
        token = session?.access_token;
      } catch (sessionErr) {
        console.error('[Detail Page] Exception getting session:', sessionErr);
      }
      
      console.log('[Detail Page] Fetching from API:', {
        hasToken: !!token,
        tokenPrefix: token ? token.substring(0, 20) + '...' : 'none',
        url: `/api/patient/drug-tests/${testId}`,
        baseUrl: window.location.origin
      });
      
      // Build the full URL for better error handling
      const apiUrl = `/api/patient/drug-tests/${testId}`;
      const fullUrl = `${window.location.origin}${apiUrl}`;
      
      console.log('[Detail Page] Attempting fetch:', {
        apiUrl,
        fullUrl,
        origin: window.location.origin,
        protocol: window.location.protocol
      });
      
      // Helper function to detect development environment
      const isDevelopment = () => {
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost' || 
                           hostname === '127.0.0.1' || 
                           hostname === '[::1]' ||
                           hostname.startsWith('192.168.') ||
                           hostname.startsWith('10.') ||
                           hostname.endsWith('.local');
        const isLocalPort = window.location.port !== '' && 
                           parseInt(window.location.port) >= 3000 && 
                           parseInt(window.location.port) < 10000;
        return isLocalhost || (isLocalPort && hostname.includes('localhost'));
      };
      
      const isDev = isDevelopment();
      
      if (isDev) {
        console.log('[Detail Page] Development mode detected:', {
          hostname: window.location.hostname,
          port: window.location.port,
          origin: window.location.origin
        });
      }
      
      let response: Response;
      try {
        // Add timeout to fetch request (30 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        response = await fetch(apiUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        // Network error - fetch failed completely
        console.error('[Detail Page] Fetch failed (network error):', fetchError);
        console.error('[Detail Page] Error details:', {
          name: fetchError?.name,
          message: fetchError?.message,
          stack: fetchError?.stack,
          cause: fetchError?.cause
        });
        
        // Check if it's an abort (timeout) or actual network error
        if (fetchError?.name === 'AbortError') {
          const devMessage = isDev
            ? "Request timeout: The development server took too long to respond.\n\n" +
              "Please check:\n" +
              "1. Is 'npm run dev' running in a terminal?\n" +
              "2. Check the terminal for errors\n" +
              "3. Try restarting the dev server\n" +
              "4. Verify the server is responding by visiting http://localhost:" + (window.location.port || '3000')
            : "Request timeout: The server took too long to respond. Please try again.";
          throw new Error(devMessage);
        }
        
        // Check if server is reachable
        const errorMsg = fetchError?.message || String(fetchError) || 'Unknown network error';
        const isConnectionRefused = errorMsg.includes('Failed to fetch') || 
                                   errorMsg.includes('NetworkError') || 
                                   errorMsg.includes('ERR_') ||
                                   errorMsg.includes('ERR_CONNECTION_REFUSED') ||
                                   errorMsg.includes('ECONNREFUSED') ||
                                   errorMsg.includes('ENOTFOUND') ||
                                   errorMsg.includes('ETIMEDOUT') ||
                                   fetchError?.cause?.code === 'ECONNREFUSED' ||
                                   fetchError?.cause?.code === 'ENOTFOUND' ||
                                   fetchError?.cause?.code === 'ETIMEDOUT';
        
        if (isConnectionRefused) {
          if (isDev) {
            // Development-specific helpful error
            const currentOrigin = window.location.origin;
            const port = window.location.port || '3000';
            throw new Error(
              `🚨 Development Server Not Running\n\n` +
              `Unable to connect to the development server at ${currentOrigin}.\n\n` +
              `To fix this:\n` +
              `1. Open a terminal in your project directory\n` +
              `2. Run: npm run dev (or pnpm dev / yarn dev)\n` +
              `3. Wait for "Ready" message\n` +
              `4. Refresh this page\n\n` +
              `Expected server: http://localhost:${port}\n` +
              `Current URL: ${currentOrigin}\n\n` +
              `If the server is running, check:\n` +
              `- Is the port correct? (check terminal output)\n` +
              `- Are there any errors in the terminal?\n` +
              `- Try restarting the dev server`
            );
          } else {
            // Production error with helpful troubleshooting
            const isVercel = window.location.hostname.includes('vercel.app') || 
                           window.location.hostname.includes('src.health');
            const troubleshooting = isVercel
              ? `\n\nThis may be due to:\n` +
                `1. Vercel serverless function timeout or error\n` +
                `2. Missing environment variables (NEXT_PUBLIC_SUPABASE_URL, etc.)\n` +
                `3. API route error - check Vercel Function logs\n` +
                `4. Database connection issue\n\n` +
                `Please contact support or check Vercel deployment logs.`
              : `\n\nPlease check:\n` +
                `1. Your internet connection\n` +
                `2. Server status\n` +
                `3. Try refreshing the page\n` +
                `4. Contact support if the issue persists`;
            
            throw new Error(
              `Network error: Unable to connect to the server at ${window.location.origin}.` +
              troubleshooting
            );
          }
        }
        
        // Generic network error
        if (isDev) {
          throw new Error(
            `Network error in development: ${errorMsg}\n\n` +
            `Please ensure:\n` +
            `1. The development server is running (npm run dev)\n` +
            `2. The server is accessible on ${window.location.origin}\n` +
            `3. Check the terminal for any errors\n` +
            `4. Try restarting the dev server\n` +
            `5. Verify firewall/antivirus isn't blocking the connection`
          );
        }
        
        // Production generic network error
        const isVercel = window.location.hostname.includes('vercel.app') || 
                        window.location.hostname.includes('src.health');
        const prodTroubleshooting = isVercel
          ? `\n\nPossible causes:\n` +
            `• Vercel serverless function error (check deployment logs)\n` +
            `• Missing environment variables\n` +
            `• Function timeout (max 10s on Hobby, 60s on Pro)\n` +
            `• Database connection issue\n\n` +
            `Please check Vercel Function logs or contact support.`
          : `\n\nPlease check your internet connection and try again. If the issue persists, contact support.`;
        
        throw new Error(
          `Network error: ${errorMsg}${prodTroubleshooting}`
        );
      }
      
      console.log('[Detail Page] API response:', { 
        status: response.status, 
        ok: response.ok,
        statusText: response.statusText,
        url: response.url
      });
      
      if (!response.ok) {
        // Try to get response as text first
        const errorText = await response.text().catch((e) => {
          console.error('[Detail Page] Error reading response text:', e);
          return '';
        });
        
        console.log('[Detail Page] Raw error response text:', {
          text: errorText,
          textLength: errorText.length,
          isEmpty: errorText === '',
          isWhitespace: errorText.trim() === '',
          isEmptyObject: errorText.trim() === '{}',
          charCodes: errorText.length > 0 ? Array.from(errorText).map(c => c.charCodeAt(0)) : []
        });
        
        let errorData: any = {};
        if (errorText && errorText.trim()) {
          // Check if response is literally "{}"
          if (errorText.trim() === '{}') {
            console.warn('[Detail Page] Response is empty object "{}", server may not be returning proper error');
            errorData = { 
              error: 'Drug test not found', 
              details: 'Server returned empty response. Check server logs for details.',
              status: response.status
            };
          } else {
            try {
              errorData = JSON.parse(errorText);
              console.log('[Detail Page] Parsed error JSON successfully:', errorData);
              // If parsed object is empty, add default error
              if (Object.keys(errorData).length === 0) {
                console.warn('[Detail Page] Parsed JSON is empty object, adding default error');
                errorData = { 
                  error: `HTTP ${response.status}`, 
                  details: 'Server returned empty error object',
                  status: response.status
                };
              }
            } catch (parseError) {
              console.error('[Detail Page] Failed to parse error JSON:', parseError, 'Text was:', errorText);
              errorData = { error: errorText || `HTTP ${response.status}`, details: 'Failed to parse server response' };
            }
          }
        } else {
          console.warn('[Detail Page] Empty error response text, using default error');
          errorData = { 
            error: `HTTP ${response.status}`, 
            details: 'Empty response from server. Check server terminal logs for API errors.',
            status: response.status
          };
        }
        
        // Log the actual raw text first, before any processing
        console.error('[Detail Page] ====== API ERROR RESPONSE ======');
        console.error('[Detail Page] Status:', response.status);
        console.error('[Detail Page] Status Text:', response.statusText);
        console.error('[Detail Page] Raw Text Type:', typeof errorText);
        console.error('[Detail Page] Raw Text Value:', errorText);
        console.error('[Detail Page] Raw Text Length:', errorText?.length || 0);
        if (errorText && typeof errorText === 'string' && errorText.length > 0) {
          console.error('[Detail Page] Raw Text (first 200 chars):', errorText.substring(0, 200));
          console.error('[Detail Page] Raw Text (JSON.stringify):', JSON.stringify(errorText));
        } else {
          console.error('[Detail Page] Raw Text is empty or not a string');
        }
        console.error('[Detail Page] Parsed errorData:', errorData);
        console.error('[Detail Page] errorData keys:', Object.keys(errorData || {}));
        try {
          console.error('[Detail Page] Response Headers:', Object.fromEntries(response.headers.entries()));
        } catch (e) {
          console.error('[Detail Page] Could not read response headers:', e);
        }
        console.error('[Detail Page] Response URL:', response.url);
        console.error('[Detail Page] ================================');
        
        if (response.status === 404) {
          throw new Error(errorData.error || errorData.details || "Drug test not found");
        }
        throw new Error(errorData.error || errorData.details || `Failed to load drug test: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[Detail Page] Drug test data received:', !!data.drugTest);
      setDrugTest(data.drugTest);
    } catch (err: any) {
      console.error("[Detail Page] Error loading drug test:", err);
      console.error("[Detail Page] Error details:", {
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
        cause: err?.cause
      });
      
      // Helper function to detect development environment
      const isDevelopment = () => {
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost' || 
                           hostname === '127.0.0.1' || 
                           hostname === '[::1]' ||
                           hostname.startsWith('192.168.') ||
                           hostname.startsWith('10.') ||
                           hostname.endsWith('.local');
        const isLocalPort = window.location.port !== '' && 
                           parseInt(window.location.port) >= 3000 && 
                           parseInt(window.location.port) < 10000;
        return isLocalhost || (isLocalPort && hostname.includes('localhost'));
      };
      
      // Provide more helpful error messages
      let errorMessage = err.message || "Failed to load drug test";
      const isDev = isDevelopment();
      
      // Check for development server connection issues
      if (err.message?.includes("Development Server Not Running") || 
          err.message?.includes("Request timeout") ||
          (isDev && (err.message?.includes("Network error") || err.message?.includes("Failed to fetch")))) {
        // Keep the detailed development error message
        errorMessage = err.message;
      } else if (err.message?.includes("Network error") || err.message?.includes("Failed to fetch")) {
        // Production network error
        errorMessage = "Network error: Unable to connect to the server. Please check your internet connection and try again.";
      } else if (err.message?.includes("Unauthorized") || err.message?.includes("401")) {
        errorMessage = "Authentication error: Please log in again to view this drug test.";
      } else if (err.message?.includes("Drug test not found") || err.message?.includes("404")) {
        if (isDev) {
          errorMessage = "Drug test not found.\n\nThis may be due to:\n1. Row Level Security (RLS) policies - check Supabase\n2. The drug test doesn't exist\n3. Server-side error - check terminal logs";
        } else {
          errorMessage = "Drug test not found. This may be due to Row Level Security (RLS) policies. Please contact support if this persists.";
        }
      } else if (err.message?.includes("500") || err.message?.includes("Internal server")) {
        if (isDev) {
          errorMessage = "Server error occurred.\n\nPlease check:\n1. Terminal logs for detailed error messages\n2. Supabase connection\n3. Environment variables (.env.local)";
        } else {
          errorMessage = "Server error: Please try again later. If the problem persists, contact support.";
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patient?.id && testId) {
      loadDrugTest();
    }
  }, [patient?.id, testId]);

  // Real-time subscription for this specific drug test
  useEffect(() => {
    if (!patient?.id || !testId) return;

    const channel = supabase
      .channel(`patient-drug-test-detail:${testId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "drug_tests",
          filter: `id=eq.${testId}`,
        },
        () => {
          loadDrugTest();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patient?.id, testId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "missed":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Missed
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not scheduled";
    try {
      return format(new Date(dateString), "EEEE, MMMM d, yyyy 'at' h:mm a");
    } catch {
      return dateString;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-cyan-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading drug test details...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !patient) {
    return null;
  }

  if (error) {
    // Check if error contains newlines (development error messages)
    const isMultiLine = error.includes('\n');
    const isDevError = error.includes('Development Server') || error.includes('development server');
    
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard/drug-tests")}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Drug Tests
          </Button>
          <Card className={isDevError ? "border-orange-200 bg-orange-50" : "border-red-200 bg-red-50"}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className={`h-5 w-5 ${isDevError ? 'text-orange-600' : 'text-red-600'} flex-shrink-0 mt-0.5`} />
                {isMultiLine ? (
                  <div className="flex-1">
                    <pre className="text-sm text-red-800 whitespace-pre-wrap font-sans">{error}</pre>
                  </div>
                ) : (
                  <p className={`text-sm ${isDevError ? 'text-orange-800' : 'text-red-800'}`}>{error}</p>
                )}
              </div>
              {isDevError && (
                <div className="mt-4 p-3 bg-white rounded border border-orange-200">
                  <p className="text-xs text-orange-700 font-medium mb-1">Quick Fix:</p>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded block">npm run dev</code>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!drugTest) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard/drug-tests")}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Drug Tests
          </Button>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <TestTube2 className="h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Drug Test Not Found</h3>
              <p className="text-gray-600 text-center max-w-md">
                The drug test you're looking for doesn't exist or you don't have permission to view it.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/drug-tests")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Drug Tests
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="bg-yellow-100 p-4 rounded-lg">
                  <TestTube2 className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-2xl mb-2">Drug Test Details</CardTitle>
                  <CardDescription className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        Created {formatDistanceToNow(new Date(drugTest.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    {drugTest.updatedAt && drugTest.createdAt !== drugTest.updatedAt && (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        <span>
                          Updated {formatDistanceToNow(new Date(drugTest.updatedAt), { addSuffix: true })}
                        </span>
                      </div>
                    )}
                  </CardDescription>
                </div>
              </div>
              <div>{getStatusBadge(drugTest.status)}</div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Scheduled Date & Time</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {drugTest.scheduledFor
                    ? formatDate(drugTest.scheduledFor)
                    : "Not scheduled"}
                </p>
                {drugTest.scheduledFor && (
                  <p className="text-sm text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(drugTest.scheduledFor), { addSuffix: true })}
                  </p>
                )}
              </div>

              <div className="p-4 rounded-lg border bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <TestTube2 className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Test Type</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {(() => {
                    const testTypeMap: Record<string, string> = {
                      urine: "Urine Drug Test",
                      saliva: "Saliva Drug Test",
                      hair: "Hair Follicle Test",
                      blood: "Blood Drug Test",
                    };
                    const testTypeId = drugTest.metadata?.test_type || "urine";
                    return testTypeMap[testTypeId] || testTypeId.charAt(0).toUpperCase() + testTypeId.slice(1) + " Test";
                  })()}
                </p>
              </div>
            </div>

            {/* Important Information */}
            {drugTest.status === "pending" && (
              <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900 mb-1">Important Reminders</h4>
                    <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                      {drugTest.scheduledFor ? (
                        <>
                          <li>Please arrive on time for your scheduled test</li>
                          <li>Bring a valid photo ID</li>
                          <li>Follow any pre-test instructions provided by the facility</li>
                        </>
                      ) : (
                        <li>Please contact the facility to schedule your test as soon as possible</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Additional Details */}
            {drugTest.metadata && Object.keys(drugTest.metadata).length > 0 && (
              <div className="p-4 rounded-lg border bg-gray-50">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Additional Information
                </h4>
                <dl className="space-y-2">
                  {drugTest.metadata.created_by && (
                    <div>
                      <dt className="text-sm text-gray-600">Created By</dt>
                      <dd className="text-sm font-medium text-gray-900">Staff Member</dd>
                    </div>
                  )}
                  {drugTest.metadata.drug_test_id && (
                    <div>
                      <dt className="text-sm text-gray-600">Test ID</dt>
                      <dd className="text-sm font-medium text-gray-900 font-mono">{drugTest.metadata.drug_test_id}</dd>
                    </div>
                  )}
                  {Object.entries(drugTest.metadata)
                    .filter(([key]) => !['created_by', 'drug_test_id', 'test_type', 'scheduled_for'].includes(key))
                    .map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</dt>
                        <dd className="text-sm font-medium text-gray-900">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </dd>
                      </div>
                    ))}
                </dl>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/drug-tests")}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to All Tests
              </Button>
              <Button
                variant="outline"
                onClick={loadDrugTest}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

