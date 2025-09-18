// FILE: app/dashboard/page.tsx
"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/use-auth";
import { PatientOverviewProvider } from "@/context/patient-overview-context";

// Widgets (ensure these paths match your files)
import { LiveDashboardStats as DashboardStats } from "@/components/dashboard/live-dashboard-stats";
import { TreatmentProgress } from "@/components/dashboard/live-treatment-progress";
import { UpcomingAppointments } from "@/components/dashboard/upcoming-appointments";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { WellnessTracker } from "@/components/dashboard/wellness-tracker";
import { VideoRecording } from "@/components/dashboard/video-recording";
import { SubmissionHistory } from "@/components/dashboard/submission-history";
import { HealthcareMessaging } from "@/components/dashboard/healthcare-messaging";
import { GroupChat } from "@/components/dashboard/group-chat";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DashboardPage() {
  const { isAuthenticated, loading, patient } = useAuth();
  const router = useRouter();

  // Why: client-side redirect avoids showing protected UI flashes.
  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace("/login");
  }, [loading, isAuthenticated, router]);

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

  if (!isAuthenticated || !patient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header rendered by app/dashboard/layout.tsx to prevent duplicates */}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">
            Welcome back, {patient.firstName ?? patient.name ?? "there"}!
          </h1>
          <p className="text-gray-600">Here&apos;s your recovery progress and upcoming activities.</p>
        </div>

        {/* Provide live overview to all widgets */}
        <PatientOverviewProvider patientId={patient.id}>
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tracking">Tracking</TabsTrigger>
              <TabsTrigger value="recording">Recording</TabsTrigger>
              <TabsTrigger value="messages">Messages</TabsTrigger>
              <TabsTrigger value="groups">Groups</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-8">
                  <DashboardStats />
                  <TreatmentProgress />
                  <UpcomingAppointments />
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                  <QuickActions />
                  <WellnessTracker />
                  <RecentActivity />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tracking" className="space-y-8">
              <SubmissionHistory />
            </TabsContent>

            <TabsContent value="recording" className="space-y-8">
              <VideoRecording />
            </TabsContent>

            <TabsContent value="messages" className="space-y-8">
              <HealthcareMessaging />
            </TabsContent>

            <TabsContent value="groups" className="space-y-8">
              <GroupChat />
            </TabsContent>
          </Tabs>
        </PatientOverviewProvider>
      </main>
    </div>
  );
}
