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
  metadata: Record<string, any>;
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
      
      // Get session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const response = await fetch("/api/patient/drug-tests", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load drug tests: ${response.status}`);
      }
      
      const data = await response.json();
      setDrugTests(data.drugTests || []);
    } catch (err: any) {
      console.error("Error loading drug tests:", err);
      setError(err.message || "Failed to load drug tests");
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
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-800">{error}</p>
              </div>
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
            {drugTests.map((test) => (
              <Card 
                key={test.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
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
                        <CardTitle className="text-lg mb-1">
                          Drug Test Assignment
                        </CardTitle>
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
                  <div className="space-y-2">
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
                          <span className="font-medium">Type:</span> {testTypeDisplay}
                        </div>
                      );
                    })()}
                    {test.status === "pending" && !test.scheduledFor && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800">
                          <AlertCircle className="h-4 w-4 inline mr-2" />
                          Please contact the facility to schedule your test.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

