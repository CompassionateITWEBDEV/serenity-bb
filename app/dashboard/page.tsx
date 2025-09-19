// FILE: app/dashboard/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

// If page.tsx is in app/dashboard/, this goes up one level into app/components/...
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
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Why: protect the route client-side while server-side auth hydrates
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-sm text-gray-500">Loading your dashboard…</span>
      </div>
    );
  }

  if (!user) {
    router.replace("/login");
    return null;
  }

  const patient = {
    id: user.id,
    firstName: user.firstName ?? "Friend",
    lastName: user.lastName ?? "",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* If your layout already renders the header, remove the next line */}
      <DashboardHeader patient={patient} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">
            Welcome back, {patient.firstName}!
          </h1>
          <p className="text-gray-600">Here's your recovery progress and upcoming activities.</p>
        </div>

        {/* Quick Actions Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <QuickActions />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <VideoRecording />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <WellnessTracker />
            </CardContent>
          </Card>
        </div>

        {/* Stats */}
        <div className="mb-8">
          <DashboardStats />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardContent className="p-6">
                  <UpcomingAppointments />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <RecentActivity />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="progress" className="space-y-8">
            <TreatmentProgress />
            <SubmissionHistory />
          </TabsContent>

          <TabsContent value="messages" className="space-y-8">
            <HealthcareMessaging />
          </TabsContent>

          <TabsContent value="groups" className="space-y-8">
            <GroupChat />
          </TabsContent>
        </Tabs>

        {/* CTA */}
        <div className="mt-10 flex items-center justify-center">
          <Button onClick={() => router.push("/dashboard/appointments")}>
            Book a new appointment
          </Button>
        </div>
      </main>
    </div>
  );
}
