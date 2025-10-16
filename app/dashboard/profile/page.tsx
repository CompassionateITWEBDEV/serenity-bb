"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ProfileEditor from "@/components/profile/ProfileEditor";
import {
  Calendar, Phone, Mail, MapPin, Activity, Award, Target, TrendingUp,
  Edit, Save, X, CheckCircle, ArrowLeft
} from "lucide-react";
import Link from "next/link";

type PatientInfo = {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  phoneNumber?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  emergencyContact?: { name?: string; phone?: string; relationship?: string } | null;
  admissionDate?: string | null;
  treatmentType?: string | null;
  treatmentPlan?: string | null;
  primaryPhysician?: string | null;
  counselor?: string | null;
  avatar?: string | null;
  joinDate?: string | null;
};

type Achievement = { id: string; title: string; description: string; icon: string; date: string };
type HealthMetric = { label: string; value: number };
type ActivityItem = { id: string; activity: string; time: string; type: "wellness" | "therapy" | "medical" | "assessment" };

type ProfilePayload = {
  patientInfo: PatientInfo | null;
  achievements: Achievement[];
  healthMetrics: HealthMetric[];
  recentActivity: ActivityItem[];
};

const EditSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  phoneNumber: z.string().min(3, "Too short"),
  dateOfBirth: z.string().optional(),
});

function makeEmptyPatient(): PatientInfo {
  return {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    address: "",
    emergencyContact: null,
    treatmentType: "Outpatient",
  };
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<"overview" | "medical" | "achievements" | "activity">("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [authExpired, setAuthExpired] = useState(false);

  const [patient, setPatient] = useState<PatientInfo>(makeEmptyPatient());
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", phoneNumber: "", dateOfBirth: "" });
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  async function getAccessToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    let token = data?.session?.access_token ?? null;
    if (!token) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      token = refreshed?.session?.access_token ?? null;
    }
    return token;
  }

  async function fetchProfile(signal?: AbortSignal) {
    const token = await getAccessToken();
    const res = await fetch("/api/profile", {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: "include",
      cache: "no-store",
      signal,
    });
    if (res.status === 401) {
      setAuthExpired(true);
      setPatient(makeEmptyPatient());
      return;
    }
    if (!res.ok) throw new Error((await res.text()) || res.statusText);
    const json = (await res.json()) as ProfilePayload;
    setPatient(json.patientInfo || makeEmptyPatient());
    setAchievements(json.achievements || []);
    setHealthMetrics(json.healthMetrics || []);
    setRecentActivity(json.recentActivity || []);
    setStatus(null);
  }

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        await fetchProfile(ac.signal);
      } catch (e) {
        setPatient((p) => p || makeEmptyPatient());
        setStatus({ type: "error", message: e instanceof Error ? e.message : "Failed to load profile." });
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime subscription
  useEffect(() => {
    if (!patient?.id) return;
    const channel = supabase
      .channel(`patient-${patient.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "patients", filter: `id=eq.${patient.id}` }, () => fetchProfile())
      .on("postgres_changes", { event: "*", schema: "public", table: "patient_achievements", filter: `patient_id=eq.${patient.id}` }, () => fetchProfile())
      .on("postgres_changes", { event: "*", schema: "public", table: "patient_health_metrics", filter: `patient_id=eq.${patient.id}` }, () => fetchProfile())
      .on("postgres_changes", { event: "*", schema: "public", table: "patient_activity", filter: `patient_id=eq.${patient.id}` }, () => fetchProfile())
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // no-op
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.id]);

  function startEdit() {
    setEditForm({
      firstName: patient.firstName || "",
      lastName: patient.lastName || "",
      phoneNumber: patient.phone || patient.phoneNumber || "",
      dateOfBirth: patient.dateOfBirth || "",
    });
    setIsEditing(true);
    setActiveTab("medical");
    setTimeout(() => firstInputRef.current?.focus(), 0);
  }

  const isValid = useMemo(() => EditSchema.safeParse(editForm).success, [editForm]);

  const isDirty = useMemo(() => {
    return (
      editForm.firstName !== (patient.firstName || "") ||
      editForm.lastName !== (patient.lastName || "") ||
      editForm.phoneNumber !== (patient.phone || patient.phoneNumber || "") ||
      (editForm.dateOfBirth || "") !== (patient.dateOfBirth || "")
    );
  }, [editForm, patient]);

  async function save() {
    if (!isValid || !isDirty) return;
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: "include",
        body: JSON.stringify({
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          phone: editForm.phoneNumber,
          dateOfBirth: editForm.dateOfBirth,
        }),
      });

      if (res.status === 401) {
        setAuthExpired(true);
        return;
      }
      if (!res.ok) throw new Error((await res.text()) || res.statusText);

      setPatient((prev) => ({
        ...prev,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        phone: editForm.phoneNumber,
        dateOfBirth: editForm.dateOfBirth,
      }));
      setIsEditing(false);
      setStatus({ type: "success", message: "Profile updated successfully!" });
      setTimeout(() => setStatus(null), 2500);
    } catch (e) {
      setStatus({ type: "error", message: e instanceof Error ? e.message : "Failed to update profile." });
    }
  }

  function cancel() {
    setIsEditing(false);
    setStatus(null);
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <p className="text-gray-600">Loading profile…</p>
      </div>
    );
  }

  const demoAchievements: Achievement[] = [
    { id: "1", title: "30 Days Clean", description: "Completed 30 consecutive days", icon: "🏆", date: "2024-04-01" },
    { id: "2", title: "Mindfulness Master", description: "Completed 50 meditation sessions", icon: "🧘", date: "2024-03-15" },
  ];
  const demoMetrics: HealthMetric[] = healthMetrics?.length ? healthMetrics : [{ label: "Overall Progress", value: 78 }];
  const demoActivity: ActivityItem[] =
    recentActivity?.length ? recentActivity : [{ id: "1", activity: "Completed mindfulness session", time: "2 hours ago", type: "wellness" }];

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        {/* Back Navigation */}
        <div className="mb-4">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600 mt-2">View and manage your personal information and progress</p>
          </div>
          {/* removed New Patient + Delete buttons */}
        </div>
      </div>

      {(status || authExpired) && (
        <Alert className={`mb-6 ${authExpired ? "border-amber-200 bg-amber-50" : status?.type === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
          {status?.type === "success" && <CheckCircle className="h-4 w-4 text-green-600" />}
          <div className="flex items-center gap-3">
            <AlertDescription className={status?.type === "success" ? "text-green-800" : authExpired ? "text-amber-800" : "text-red-800"}>
              {authExpired ? "Session expired or not found. Please sign in again." : status?.message}
            </AlertDescription>
            {authExpired && (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try { await supabase.auth.signOut(); } catch {}
                  const next = encodeURIComponent("/dashboard/profile");
                  window.location.href = `/login?next=${next}`;
                }}
              >
                Re-authenticate
              </Button>
            )}
          </div>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={patient.avatar || "/patient-avatar.png"} />
                  <AvatarFallback className="text-2xl">
                    {(patient.firstName || "?")[0]}
                    {(patient.lastName || "?")[0]}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle className="text-2xl">
                {patient.firstName} {patient.lastName}
              </CardTitle>
              <CardDescription>Patient ID: #{patient.id || "—"}</CardDescription>
              <div className="flex justify-center gap-2 mt-4">
                <Badge variant="secondary">{patient.treatmentType || patient.treatmentPlan || "Outpatient"}</Badge>
                <Badge variant="outline">Active</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{patient.email || "—"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{patient.phone || patient.phoneNumber || "—"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm">Born {patient.dateOfBirth || "—"}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-sm">Emergency: {patient.emergencyContact?.name || "—"}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={startEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </CardFooter>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Health Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(healthMetrics?.length ? healthMetrics : demoMetrics).map((m, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{m.label}</span>
                    <span>{m.value}%</span>
                  </div>
                  <Progress value={m.value} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="medical">Medical</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              {isEditing ? (
                <ProfileEditor
                  initialData={{
                    firstName: patient.firstName,
                    lastName: patient.lastName,
                    email: patient.email,
                    phone: patient.phone || "",
                    dateOfBirth: patient.dateOfBirth || "",
                    address: patient.address || "",
                    emergencyContactName: patient.emergencyContact?.name || "",
                    emergencyContactPhone: patient.emergencyContact?.phone || "",
                    emergencyContactRelationship: patient.emergencyContact?.relationship || "",
                    treatmentType: patient.treatmentType || "Outpatient",
                    bio: patient.bio || "",
                  }}
                  isEditing={isEditing}
                  onEditToggle={() => setIsEditing(false)}
                  onSave={async (data) => {
                    // Update local state
                    setPatient(prev => ({
                      ...prev,
                      firstName: data.firstName,
                      lastName: data.lastName,
                      email: data.email,
                      phone: data.phone,
                      dateOfBirth: data.dateOfBirth,
                      address: data.address,
                      emergencyContact: {
                        name: data.emergencyContactName,
                        phone: data.emergencyContactPhone,
                        relationship: data.emergencyContactRelationship,
                      },
                      treatmentType: data.treatmentType,
                      bio: data.bio,
                    }));
                    setIsEditing(false);
                  }}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Treatment Goals
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
                        <TrendingUp className="h-5 w-5" />
                        Progress Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm">Days in treatment</span>
                          <span className="font-medium">
                            {patient.admissionDate
                              ? `${Math.max(1, Math.ceil((Date.now() - new Date(patient.admissionDate).getTime()) / 86400000))} days`
                              : "—"}
                          </span>
                        </div>
                        <div className="flex justify-between"><span className="text-sm">Sessions completed</span><span className="font-medium">—</span></div>
                        <div className="flex justify-between"><span className="text-sm">Goals achieved</span><span className="font-medium">—</span></div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="medical">
              <Card>
                <CardHeader>
                  <CardTitle>Medical Information</CardTitle>
                  <CardDescription>Your medical history and current treatment details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Basic Info</h4>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="fn">First Name</Label>
                          <Input
                            id="fn"
                            ref={firstInputRef}
                            value={isEditing ? editForm.firstName : patient.firstName}
                            onChange={(e) => isEditing && setEditForm((p) => ({ ...p, firstName: e.target.value }))}
                            disabled={!isEditing}
                          />
                        </div>
                        <div>
                          <Label htmlFor="ln">Last Name</Label>
                          <Input
                            id="ln"
                            value={isEditing ? editForm.lastName : patient.lastName}
                            onChange={(e) => isEditing && setEditForm((p) => ({ ...p, lastName: e.target.value }))}
                            disabled={!isEditing}
                          />
                        </div>
                        <div>
                          <Label htmlFor="em">Email</Label>
                          <Input id="em" type="email" value={patient.email} disabled />
                        </div>
                        <div>
                          <Label htmlFor="ph">Phone</Label>
                          <Input
                            id="ph"
                            value={isEditing ? editForm.phoneNumber : (patient.phone || patient.phoneNumber || "")}
                            onChange={(e) => isEditing && setEditForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                            disabled={!isEditing}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Additional</h4>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="dob">Date of Birth</Label>
                          <Input
                            id="dob"
                            type="date"
                            value={isEditing ? editForm.dateOfBirth : (patient.dateOfBirth || "")}
                            onChange={(e) => isEditing && setEditForm((p) => ({ ...p, dateOfBirth: e.target.value }))}
                            disabled={!isEditing}
                          />
                        </div>
                        <div>
                          <Label>Emergency Contact</Label>
                          <Input value={patient.emergencyContact?.name || ""} disabled />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>

                {isEditing ? (
                  <CardFooter className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={cancel}><X className="h-4 w-4 mr-2" />Cancel</Button>
                    <Button onClick={save} disabled={!isValid || !isDirty}><Save className="h-4 w-4 mr-2" />Save</Button>
                  </CardFooter>
                ) : (
                  <CardFooter className="justify-end">
                    <Button variant="secondary" onClick={startEdit}><Edit className="h-4 w-4 mr-2" />Edit These Details</Button>
                  </CardFooter>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="achievements">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" />Achievements & Milestones</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(achievements.length ? achievements : demoAchievements).map((a) => (
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
                    {(recentActivity.length ? recentActivity : demoActivity).map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div className={`w-2 h-2 rounded-full ${
                          item.type === "wellness" ? "bg-green-500" :
                          item.type === "therapy" ? "bg-blue-500" :
                          item.type === "medical" ? "bg-red-500" : "bg-purple-500"
                        }`} />
                        <div className="flex-1">
                          <p className="font-medium">{item.activity}</p>
                          <p className="text-sm text-gray-600">
                            {typeof item.time === "string" ? item.time : new Date(item.time).toLocaleString()}
                          </p>
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
