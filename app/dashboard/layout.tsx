"use client";

import type React from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { SmartAlertProvider } from "@/components/alerts/smart-alert-provider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PatientOverviewProvider } from "@/context/patient-overview-context";

function TabsNav() {
  const router = useRouter();
  const pathname = usePathname();

  const current = useMemo(() => {
    const seg = pathname?.split("/")[2] || "overview";
    return ["overview", "tracking", "recording", "messages", "groups"].includes(seg)
      ? seg
      : "overview";
  }, [pathname]);

  return (
    // Keep Tabs visual while routing each change to a real URL
    <Tabs value={current} onValueChange={(v) => router.push(`/dashboard/${v}`)} className="space-y-6">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="tracking">Tracking</TabsTrigger>
        <TabsTrigger value="recording">Recording</TabsTrigger>
        <TabsTrigger value="messages">Messages</TabsTrigger>
        <TabsTrigger value="groups">Groups</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { patient, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <SmartAlertProvider>
        <div className="min-h-screen bg-gray-50">
          {/* Header is rendered globally in app/layout.tsx; no header here */}

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {patient && (
              <>
                <div className="mb-8">
                  <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">
                    Welcome back, {patient.firstName}!
                  </h1>
                  <p className="text-gray-600">
                    Here's your recovery progress and upcoming activities.
                  </p>
                </div>

                <TabsNav />

                {/* Single source of truth for live overview across all tabs */}
                <PatientOverviewProvider patientId={patient.id}>
                  <div className="mt-6">{children}</div>
                </PatientOverviewProvider>
              </>
            )}
          </main>
        </div>
      </SmartAlertProvider>
    </ProtectedRoute>
  );
}
