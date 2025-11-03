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
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      console.log('[Detail Page] Fetching from API:', {
        hasToken: !!token,
        tokenPrefix: token ? token.substring(0, 20) + '...' : 'none',
        url: `/api/patient/drug-tests/${testId}`
      });
      
      const response = await fetch(`/api/patient/drug-tests/${testId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      
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
      setError(err.message || "Failed to load drug test");
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
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-800">{error}</p>
              </div>
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

