// app/dashboard/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useDashboardData } from "@/hooks/use-dashboard-data";

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

/* SweetAlert2 */
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

/* Minimal, self-contained notice (dev-only) */
function DevOnlyNotice({ text }: { text: string }) {
  if (process.env.NODE_ENV === "production") return null;
  return (
    <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <span className="font-medium">Note (dev):</span>
      <span>{text}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { isAuthenticated, loading, patient } = useAuth();
  const router = useRouter();
  const { data, error, loading: dataLoading } = useDashboardData({ refreshOnFocus: true });

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace("/login");
  }, [loading, isAuthenticated, router]);

  // Welcome SweetAlert (runs once per session)
  useEffect(() => {
    if (loading || dataLoading) return;
    if (!isAuthenticated || !patient) return;

    const key = "welcomed_v1";
    if (sessionStorage.getItem(key)) return;

    const sessions = data?.kpis?.sessions ?? 0;
    const joinDate = patient.joinDate || patient.join_date || null;
    const isRecentJoin =
      joinDate ? (Date.now() - new Date(joinDate).getTime()) / 86400000 < 3 : false;

    const isNewPatient = sessions === 0 || isRecentJoin;

    const firstName =
      patient.firstName || patient.first_name || "there";

    const title = isNewPatient
      ? `Welcome, ${firstName}!`
      : `Welcome back, ${firstName}!`;

    const text = isNewPatient
      ? "You're all set. Want a quick tour of your dashboard and profile?"
      : "Great to see you again. Pick up right where you left off.";

    (async () => {
      sessionStorage.setItem(key, "1"); // prevent duplicates in this tab session
      const res = await Swal.fire({
        icon: "success",
        title,
        text,
        confirmButtonText: isNewPatient ? "Take a tour" : "Let’s go",
        showCancelButton: true,
        cancelButtonText: "Maybe later",
        confirmButtonColor: "#06b6d4", // cyan-500
        reverseButtons: true,
      });
      if (res.isConfirmed) {
        // quick tour: go to profile for first-time users; else stay
        if (isNewPatient) router.push("/dashboard/profile");
      }
    })();
  }, [isAuthenticated, loading, dataLoading, data, patient, router]);

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
          <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">
            Welcome back, {firstName}!
          </h1>
          <p className="text-gray-600">Here’s your recovery progress and upcoming activities.</p>
          {error && <DevOnlyNotice text="Some data couldn’t be loaded. Page continues with partial content." />}
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
