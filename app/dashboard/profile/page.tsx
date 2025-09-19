// /app/dashboard/profile/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar, Phone, Mail, MapPin, Activity, Award, Target, TrendingUp } from "lucide-react";

type Achievement = { id: number | string; title: string; description: string; icon: string; date: string };
type HealthMetric = { label: string; value: number; color: string };
type ActivityItem = { id: number | string; activity: string; time: string; type: "wellness" | "therapy" | "medical" | "assessment" };
type PatientInfo = {
  firstName: string; lastName: string; email: string; phone: string;
  dateOfBirth: string; address: string; emergencyContact: string;
  admissionDate: string; treatmentType: string; primaryPhysician: string; counselor: string;
};
type ProfilePayload = {
  patientInfo: PatientInfo;
  achievements: Achievement[];
  healthMetrics: HealthMetric[];
  recentActivity: ActivityItem[];
};

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  let token = data?.session?.access_token ?? null;
  if (!token) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    token = refreshed?.session?.access_token ?? null;
  }
  return token;
}

export default function ProfilePage() {
  const [payload, setPayload] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch("/api/profile", {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), Accept: "application/json" },
          credentials: "include",
          cache: "no-store",
          signal: ac.signal,
        });
        if (res.status === 401) { setErr("Session expired or not found."); return; }
        if (!res.ok) throw new Error((await res.text()) || res.statusText);
        const json = (await res.json()) as ProfilePayload;
        setPayload(json);
        setErr(null);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <p className="text-gray-600">Loading profile…</p>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center gap-3">
          <p className="text-red-600">Unable to load profile{err ? `: ${err}` : ""}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try { await supabase.auth.signOut(); } catch {}
              const next = encodeURIComponent("/dashboard/profile");
              window.location.href = `/login?next=${next}`;
            }}
          >
            Re-authenticate
          </Button>
        </div>
      </div>
    );
  }

  const { patientInfo, healthMetrics, achievements, recentActivity } = payload;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-2">View and manage your personal information and progress</p>
        {err && <p className="text-sm text-red-600 mt-2">Error: {err}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Overview (read-only) */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src="/patient-avatar.png" />
                  <AvatarFallback className="text-2xl">
                    {patientInfo.firstName?.[0]}{patientInfo.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle className="text-2xl">
                {patientInfo.firstName} {patientInfo.lastName}
              </CardTitle>
              <CardDescription>Patient ID: #PAT-2024-001</CardDescription>
              <div className="flex justify-center gap-2 mt-4">
                <Badge variant="secondary">{patientInfo.treatmentType || "Outpatient"}</Badge>
                <Badge variant="outline">Active</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-gray-500" /><span className="text-sm">{patientInfo.email}</span></div>
              <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-gray-500" /><span className="text-sm">{patientInfo.phone}</span></div>
              <div className="flex items-center gap-3"><Calendar className="h-4 w-4 text-gray-500" /><span className="text-sm">Born {patientInfo.dateOfBirth}</span></div>
              <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-gray-500" /><span className="text-sm">{patientInfo.address}</span></div>
            </CardContent>
          </Card>

          {/* Health Metrics */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Health Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {healthMetrics.length === 0 && <p className="text-sm text-gray-500">No metrics yet.</p>}
              {healthMetrics.map((m, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{m.label}</span><span>{m.value}%</span>
                  </div>
                  <Progress value={m.value} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main Content (read-only) */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="medical">Medical</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" /> Treatment Goals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between"><span className="text-sm">Complete 90-day program</span><Badge variant="secondary">In Progress</Badge></div>
                      <div className="flex items-center justify-between"><span className="text-sm">Daily meditation practice</span><Badge variant="secondary">Active</Badge></div>
                      <div className="flex items-center justify-between"><span className="text-sm">Weekly therapy sessions</span><Badge variant="secondary">On Track</Badge></div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" /> Progress Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between"><span className="text-sm">Days in treatment</span><span className="font-medium">{patientInfo.admissionDate ? `${Math.max(1, Math.ceil((Date.now() - new Date(patientInfo.admissionDate).getTime()) / 86400000))} days` : "—"}</span></div>
                      <div className="flex justify-between"><span className="text-sm">Sessions completed</span><span className="font-medium">—</span></div>
                      <div className="flex justify-between"><span className="text-sm">Goals achieved</span><span className="font-medium">—</span></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="medical">
              <Card>
                <CardHeader>
                  <CardTitle>Medical Information</CardTitle>
                  <CardDescription>Your medical history and current treatment details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 text-sm text-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="mb-2 font-medium">Basic Info</div>
                      <div className="space-y-1">
                        <div>Email: {patientInfo.email || "—"}</div>
                        <div>Phone: {patientInfo.phone || "—"}</div>
                        <div>Date of Birth: {patientInfo.dateOfBirth || "—"}</div>
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 font-medium">Additional</div>
                      <div className="space-y-1">
                        <div>Address: {patientInfo.address || "—"}</div>
                        <div>Emergency Contact: {patientInfo.emergencyContact || "—"}</div>
                        <div>Treatment Type: {patientInfo.treatmentType || "—"}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="achievements">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" /> Achievements & Milestones</CardTitle>
                  <CardDescription>Celebrate your progress and accomplishments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {achievements.length === 0 && <p className="text-sm text-gray-500">No achievements yet.</p>}
                    {achievements.map((a) => (
                      <div key={a.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="text-2xl">{a.icon}</div>
                        <div className="flex-1">
                          <h4 className="font-medium">{a.title}</h4>
                          <p className="text-sm text-gray-600">{a.description}</p>
                          <p className="text-xs text-gray-500 mt-1">Earned on {a.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your recent interactions and progress updates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.length === 0 && <p className="text-sm text-gray-500">No recent activity.</p>}
                    {recentActivity.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div className={`w-2 h-2 rounded-full ${
                          item.type === "wellness" ? "bg-green-500"
                            : item.type === "therapy" ? "bg-blue-500"
                            : item.type === "medical" ? "bg-red-500"
                            : "bg-purple-500"
                        }`} />
                        <div className="flex-1">
                          <p className="font-medium">{item.activity}</p>
                          <p className="text-sm text-gray-600">{item.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
