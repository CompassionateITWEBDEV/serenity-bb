"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TestTube2, Calendar, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { supabase } from "@/lib/supabase/client";

interface DrugTest {
  id: string;
  status: "pending" | "completed" | "missed";
  scheduledFor: string | null;
  createdAt: string;
  updatedAt?: string | null;
  metadata: Record<string, any>;
  patient_id?: string;
}

export default function PatientDrugTestsPage() {
  const { isAuthenticated, loading: authLoading, patient } = useAuth();
  const router = useRouter();
  const [drugTests, setDrugTests] = useState<DrugTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
      return;
    }
  }, [authLoading, isAuthenticated, router]);

  const loadDrugTests = async () => {
    if (!patient?.id) return;

    try {
      setLoading(true);
      setError(null);
      
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
      
      // Get session token for authentication - refresh if needed
      let { data: { session } } = await supabase.auth.getSession();
      
      // If no session or session is expired, try to refresh
      if (!session || !session.access_token) {
        console.log('[Drug Tests Page] Session expired or missing, attempting refresh...');
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('[Drug Tests Page] Error refreshing session:', refreshError);
          throw new Error('Session expired. Please log in again.');
        }
        
        session = refreshedSession;
      }
      
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('No valid authentication token. Please log in again.');
      }
      
      let response: Response;
      try {
        // Add timeout to fetch request (30 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        response = await fetch("/api/patient/drug-tests", {
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
        console.error('[Drug Tests Page] Fetch failed (network error):', fetchError);
        
        // Check if it's an abort (timeout) or actual network error
        if (fetchError?.name === 'AbortError') {
          const devMessage = isDev
            ? "Request timeout: The development server took too long to respond.\n\n" +
              "Please check:\n" +
              "1. Is 'npm run dev' running in a terminal?\n" +
              "2. Check the terminal for errors\n" +
              "3. Try restarting the dev server"
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
              `Current URL: ${currentOrigin}`
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
            `4. Try restarting the dev server`
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
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load drug tests: ${response.status}`);
      }
      
      const data = await response.json();
      setDrugTests(data.drugTests || []);
    } catch (err: any) {
      console.error("Error loading drug tests:", err);
      
      // Provide more helpful error messages for development
      let errorMessage = err.message || "Failed to load drug tests";
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
      
      // Check for development server connection issues
      if (err.message?.includes("Development Server Not Running") || 
          err.message?.includes("Request timeout") ||
          (isDev && (err.message?.includes("Network error") || err.message?.includes("Failed to fetch")))) {
        // Keep the detailed development error message
        errorMessage = err.message;
      } else if (err.message?.includes("Network error") || err.message?.includes("Failed to fetch")) {
        // Production network error
        errorMessage = "Network error: Unable to connect to the server. Please check your internet connection and try again.";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patient?.id) {
      loadDrugTests();
    }
  }, [patient?.id]);

  // Real-time subscription for drug tests
  useEffect(() => {
    if (!patient?.id) return;

    const channel = supabase
      .channel(`patient-drug-tests:${patient.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "drug_tests",
          filter: `patient_id=eq.${patient.id}`,
        },
        () => {
          loadDrugTests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patient?.id]);

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
          <p className="text-gray-600">Loading your drug tests...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !patient) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2 flex items-center gap-3">
                <TestTube2 className="h-8 w-8 text-cyan-600" />
                Drug Tests
              </h1>
              <p className="text-gray-600">
                View and track your drug test assignments and results
              </p>
            </div>
            <Button onClick={loadDrugTests} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <Card className={`mb-6 ${error.includes('Development Server') || error.includes('development server') ? 'border-orange-200 bg-orange-50' : 'border-red-200 bg-red-50'}`}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className={`h-5 w-5 ${error.includes('Development Server') || error.includes('development server') ? 'text-orange-600' : 'text-red-600'} flex-shrink-0 mt-0.5`} />
                {error.includes('\n') ? (
                  <div className="flex-1">
                    <pre className="text-sm whitespace-pre-wrap font-sans">{error.includes('Development Server') || error.includes('development server') ? <span className="text-orange-800">{error}</span> : <span className="text-red-800">{error}</span>}</pre>
                  </div>
                ) : (
                  <p className={error.includes('Development Server') || error.includes('development server') ? 'text-orange-800' : 'text-red-800'}>{error}</p>
                )}
              </div>
              {(error.includes('Development Server') || error.includes('development server')) && (
                <div className="mt-4 p-3 bg-white rounded border border-orange-200">
                  <p className="text-xs text-orange-700 font-medium mb-1">Quick Fix:</p>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded block">npm run dev</code>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {drugTests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <TestTube2 className="h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Drug Tests</h3>
              <p className="text-gray-600 text-center max-w-md">
                You don't have any drug test assignments yet. When a drug test is assigned to you,
                it will appear here and you'll receive a notification.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {drugTests.map((test, index) => {
              // Mark the first (newest) test as "Latest"
              const isLatest = index === 0;
              const createdDate = new Date(test.createdAt);
              const isRecent = (Date.now() - createdDate.getTime()) < 24 * 60 * 60 * 1000; // Within last 24 hours
              
              return (
              <Card 
                key={test.id} 
                className={`hover:shadow-md transition-shadow cursor-pointer ${
                  isLatest && isRecent ? 'border-l-4 border-l-cyan-500' : ''
                }`}
                onClick={() => {
                  console.log('Navigating to drug test detail:', test.id);
                  router.push(`/dashboard/drug-tests/${test.id}`);
                }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="bg-yellow-100 p-3 rounded-lg">
                        <TestTube2 className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg">
                            Drug Test Assignment
                          </CardTitle>
                          {isLatest && isRecent && (
                            <Badge className="bg-cyan-100 text-cyan-800 hover:bg-cyan-100 text-xs">
                              Latest
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {test.scheduledFor
                                ? formatDate(test.scheduledFor)
                                : "Schedule to be determined"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Clock className="h-3 w-3" />
                            <span>
                              Created {formatDistanceToNow(new Date(test.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </CardDescription>
                      </div>
                    </div>
                    <div>{getStatusBadge(test.status)}</div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Test Type */}
                    {test.metadata?.test_type && (() => {
                      const testTypeMap: Record<string, string> = {
                        urine: "Urine Drug Test",
                        saliva: "Saliva Drug Test",
                        hair: "Hair Follicle Test",
                        blood: "Blood Drug Test",
                      };
                      const testTypeId = test.metadata.test_type;
                      const testTypeDisplay = testTypeMap[testTypeId] || testTypeId.charAt(0).toUpperCase() + testTypeId.slice(1) + " Test";
                      return (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Test Type:</span> {testTypeDisplay}
                        </div>
                      );
                    })()}
                    
                    {/* Collection Method */}
                    {test.metadata?.collection_method && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Collection Method:</span> {test.metadata.collection_method}
                      </div>
                    )}
                    
                    {/* Test ID */}
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">Test ID:</span> {test.id}
                    </div>
                    
                    {/* Last Updated */}
                    {test.updatedAt && test.updatedAt !== test.createdAt && (
                      <div className="text-xs text-gray-500">
                        <span className="font-medium">Last Updated:</span> {formatDistanceToNow(new Date(test.updatedAt), { addSuffix: true })}
                      </div>
                    )}
                    
                    {/* Action Required */}
                    {test.status === "pending" && !test.scheduledFor && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800">
                          <AlertCircle className="h-4 w-4 inline mr-2" />
                          Please contact the facility to schedule your test.
                        </p>
                      </div>
                    )}
                    
                    {/* Scheduled Test Reminder */}
                    {test.status === "pending" && test.scheduledFor && new Date(test.scheduledFor) > new Date() && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <Clock className="h-4 w-4 inline mr-2" />
                          Your test is scheduled. Please arrive on time.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

