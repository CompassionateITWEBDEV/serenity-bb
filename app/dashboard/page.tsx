// app/dashboard/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useDashboardData } from "@/hooks/use-dashboard-data"; // ✅ fixed import

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { TreatmentProgress } from "@/components/dashboard/treatment-progress";
import { UpcomingAppointments } from "@/components/dashboard/upcoming-appointments";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { WellnessTracker } from "@/components/dashboard/wellness-tracker";
import { VideoRecording } from "@/components/dashboard/video-recording";
import { SubmissionHistory } from "@/components/dashboard/submission-history";
import { HealthcareMessaging } from "@/components/dashboard/healthcare-messaging";
import { GroupChat } from "@/components/dashboard/group-chat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

export default function DashboardPage() {
  const { isAuthenticated, loading, patient } = useAuth();
  const router = useRouter();
  const { data, error, loading: dataLoading } = useDashboardData({ refreshOnFocus: true });

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace("/login");
  }, [loading, isAuthenticated, router]);

  if (loading || (isAuthenticated && dataLoading && !data)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !patient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Redirecting to login…</p>
      </div>
    );
  }

  const firstName = patient.firstName || patient.first_name || "there";

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader patient={patient} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">Welcome back, {firstName}!</h1>
          <p className="text-gray-600">Here’s your recovery progress and upcoming activities.</p>
          {error && (
            <p className="mt-2 text-sm text-red-600">
              Couldn’t load some data. The page shows what it can for now. ({error})
            </p>
          )}
        </div>

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
              <div className="lg:col-span-2 space-y-8">
                <DashboardStats
                  sessions={data?.kpis.sessions ?? 0}
                  goals={data?.kpis.goals ?? 0}
                  tokens={data?.kpis.tokens ?? 0}
                  progressPercent={data?.kpis.progressPercent ?? 0}
                  unreadMessages={data?.kpis.unreadMessages ?? 0}
                />
                <TreatmentProgress items={data?.treatmentProgress ?? []} />
                <UpcomingAppointments items={data?.upcomingAppointments ?? []} />
              </div>

              <div className="space-y-8">
                <QuickActions
                  tokenTotal={data?.tokenStats.total ?? 0}
                  nextAppointmentAt={data?.upcomingAppointments?.[0]?.at ?? null}
                />
                <WellnessTracker snapshot={data?.wellness ?? null} />
                <RecentActivity items={data?.activity ?? []} />
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
      </main>
    </div>
  );
}
