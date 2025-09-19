// /app/(dashboard)/profile/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Calendar, Phone, Mail, MapPin, Heart, Activity, Award, Clock, Target, TrendingUp, Edit, Save, X
} from "lucide-react";

type Achievement = { id: number | string; title: string; description: string; icon: string; date: string };
type HealthMetric = { label: string; value: number; color: string };
type ActivityItem = { id: number | string; activity: string; time: string; type: "wellness" | "therapy" | "medical" | "assessment" };

type PatientInfo = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string; // keep as string to match UI
  address: string;
  emergencyContact: string;
  admissionDate: string;
  treatmentType: string;
  primaryPhysician: string;
  counselor: string;
};

type ProfilePayload = {
  patientInfo: PatientInfo;
  achievements: Achievement[];
  healthMetrics: HealthMetric[];
  recentActivity: ActivityItem[];
};

const EditSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(3, "Phone is too short"),
  dateOfBirth: z.string().optional(), // optional free-form for now
  address: z.string().min(3, "Address is too short"),
  emergencyContact: z.string().min(3, "Emergency contact is too short"),
});

function shallowEqual<T extends Record<string, any>>(a: T, b: T) {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [draft, setDraft] = useState<PatientInfo | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof PatientInfo, string>>>({});

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const { data: sessionRes } = await supabase.auth.getSession();
        const token = sessionRes.session?.access_token;
        const res = await fetch("/api/profile", {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            Accept: "application/json",
          },
          cache: "no-store",
          signal: ac.signal,
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error((text || res.statusText).slice(0, 160));
        }
        const json = (await res.json()) as ProfilePayload;
        setPatientInfo(json.patientInfo);
        setDraft(json.patientInfo);
        setAchievements(json.achievements);
        setHealthMetrics(json.healthMetrics);
        setRecentActivity(json.recentActivity);
        setErr(null);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  const isDirty = useMemo(() => {
    if (!patientInfo || !draft) return false;
    return !shallowEqual(
      {
        firstName: patientInfo.firstName,
        lastName: patientInfo.lastName,
        email: patientInfo.email,
        phone: patientInfo.phone,
        dateOfBirth: patientInfo.dateOfBirth,
        address: patientInfo.address,
        emergencyContact: patientInfo.emergencyContact,
      },
      {
        firstName: draft.firstName,
        lastName: draft.lastName,
        email: draft.email,
        phone: draft.phone,
        dateOfBirth: draft.dateOfBirth,
        address: draft.address,
        emergencyContact: draft.emergencyContact,
      }
    );
  }, [patientInfo, draft]);

  function setDraftField<K extends keyof PatientInfo>(key: K, value: PatientInfo[K]) {
    if (!draft) return;
    setDraft({ ...draft, [key]: value });
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function saveProfile() {
    if (!draft) return;
    setMsg(null);
    setErr(null);

    const parsed = EditSchema.safeParse({
      firstName: draft.firstName,
      lastName: draft.lastName,
      email: draft.email,
      phone: draft.phone,
      dateOfBirth: draft.dateOfBirth,
      address: draft.address,
      emergencyContact: draft.emergencyContact,
    });

    if (!parsed.success) {
      const fe: Partial<Record<keyof PatientInfo, string>> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof PatientInfo;
        fe[k] = issue.message;
      }
      setFieldErrors(fe);
      setErr("Please fix the highlighted fields.");
      return;
    }

    // Optimistic update
    const prev = patientInfo;
    setSaving(true);
    setPatientInfo(draft);

    try {
      const { data: sessionRes } = await supabase.auth.getSession();
      const token = sessionRes.session?.access_token;
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          firstName: draft.firstName,
          lastName: draft.lastName,
          email: draft.email,
          phone: draft.phone,
          address: draft.address,
          dateOfBirth: draft.dateOfBirth,
          emergencyContact: draft.emergencyContact,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error((text || res.statusText).slice(0, 160));
      }
      setMsg("Profile saved.");
      setIsEditing(false);
    } catch (e) {
      // Rollback
      if (prev) setPatientInfo(prev);
      setErr(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    if (patientInfo) setDraft(patientInfo);
    setFieldErrors({});
    setIsEditing(false);
    setMsg(null);
    setErr(null);
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <p className="text-gray-600">Loading profile…</p>
      </div>
    );
  }

  if (!patientInfo || !draft) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <p className="text-red-600">Unable to load profile{err ? `: ${err}` : ""}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-2">View and manage your personal information and progress</p>
        {err && <p className="text-sm text-red-600 mt-2">Error: {err}</p>}
        {msg && <p className="text-sm text-green-600 mt-2">{msg}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Overview */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src="/patient-avatar.png" />
                  <AvatarFallback className="text-2xl">
                    {patientInfo.firstName?.[0]}
                    {patientInfo.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle className="text-2xl">
                {patientInfo.firstName} {patientInfo.lastName}
              </CardTitle>
              <CardDescription>Patient ID: #PAT-2024-001</CardDescription>
              <div className="flex justify-center gap-2 mt-4">
                <Badge variant="secondary">{patientInfo.treatmentType}</Badge>
                <Badge variant="outline">Active</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{patientInfo.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{patientInfo.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm">Born {patientInfo.dateOfBirth}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{patientInfo.address}</span>
              </div>

              <div className="flex gap-2 mt-4">
                {!isEditing ? (
                  <Button className="w-full" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button className="w-full" variant="secondary" onClick={cancelEdit} disabled={saving}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button className="w-full" onClick={saveProfile} disabled={!isDirty || saving}>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? "Saving…" : "Save"}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Health Metrics */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Health Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {healthMetrics.map((metric, index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{metric.label}</span>
                    <span>{metric.value}%</span>
                  </div>
                  <Progress value={metric.value} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
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
                      <Target className="h-5 w-5" />
                      Treatment Goals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Complete 90-day program</span>
                        <Badge variant="secondary">In Progress</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Daily meditation practice</span>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Weekly therapy sessions</span>
                        <Badge variant="secondary">On Track</Badge>
                      </div>
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
                        <span className="font-medium">45 days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Sessions completed</span>
                        <span className="font-medium">32/40</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Goals achieved</span>
                        <span className="font-medium">8/12</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5" />
                      Care Team
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="/caring-doctor.png" />
                          <AvatarFallback>DS</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{patientInfo.primaryPhysician}</p>
                          <p className="text-xs text-gray-600">Primary Physician</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="/counselor.png" />
                          <AvatarFallback>MW</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{patientInfo.counselor}</p>
                          <p className="text-xs text-gray-600">Counselor</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Next Appointments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <div>
                          <p className="text-sm font-medium">Group Therapy</p>
                          <p className="text-xs text-gray-600">Tomorrow, 2:00 PM</p>
                        </div>
                        <Badge variant="outline">Scheduled</Badge>
                      </div>
                      <div className="flex justify-between">
                        <div>
                          <p className="text-sm font-medium">Dr. Smith Check-in</p>
                          <p className="text-xs text-gray-600">Friday, 10:00 AM</p>
                        </div>
                        <Badge variant="outline">Scheduled</Badge>
                      </div>
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
                <CardContent className="space-y-6">
                  {/* Editable Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Basic Info</h4>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            value={draft.firstName}
                            onChange={(e) => setDraftField("firstName", e.target.value)}
                            disabled={!isEditing}
                            aria-invalid={!!fieldErrors.firstName}
                          />
                          {fieldErrors.firstName && <p className="text-xs text-red-600">{fieldErrors.firstName}</p>}
                        </div>
                        <div>
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            value={draft.lastName}
                            onChange={(e) => setDraftField("lastName", e.target.value)}
                            disabled={!isEditing}
                            aria-invalid={!!fieldErrors.lastName}
                          />
                          {fieldErrors.lastName && <p className="text-xs text-red-600">{fieldErrors.lastName}</p>}
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={draft.email}
                            onChange={(e) => setDraftField("email", e.target.value)}
                            disabled={!isEditing}
                            aria-invalid={!!fieldErrors.email}
                          />
                          {fieldErrors.email && <p className="text-xs text-red-600">{fieldErrors.email}</p>}
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={draft.phone}
                            onChange={(e) => setDraftField("phone", e.target.value)}
                            disabled={!isEditing}
                            aria-invalid={!!fieldErrors.phone}
                          />
                          {fieldErrors.phone && <p className="text-xs text-red-600">{fieldErrors.phone}</p>}
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
                            placeholder="January 15, 1990"
                            value={draft.dateOfBirth}
                            onChange={(e) => setDraftField("dateOfBirth", e.target.value)}
                            disabled={!isEditing}
                          />
                        </div>
                        <div>
                          <Label htmlFor="address">Address</Label>
                          <Input
                            id="address"
                            value={draft.address}
                            onChange={(e) => setDraftField("address", e.target.value)}
                            disabled={!isEditing}
                            aria-invalid={!!fieldErrors.address}
                          />
                          {fieldErrors.address && <p className="text-xs text-red-600">{fieldErrors.address}</p>}
                        </div>
                        <div>
                          <Label htmlFor="emergency">Emergency Contact</Label>
                          <Input
                            id="emergency"
                            placeholder="Name - Phone"
                            value={draft.emergencyContact}
                            onChange={(e) => setDraftField("emergencyContact", e.target.value)}
                            disabled={!isEditing}
                            aria-invalid={!!fieldErrors.emergencyContact}
                          />
                          {fieldErrors.emergencyContact && (
                            <p className="text-xs text-red-600">{fieldErrors.emergencyContact}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="achievements">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Achievements & Milestones
                  </CardTitle>
                  <CardDescription>Celebrate your progress and accomplishments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {achievements.map((achievement) => (
                      <div key={achievement.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="text-2xl">{achievement.icon}</div>
                        <div className="flex-1">
                          <h4 className="font-medium">{achievement.title}</h4>
                          <p className="text-sm text-gray-600">{achievement.description}</p>
                          <p className="text-xs text-gray-500 mt-1">Earned on {achievement.date}</p>
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
                    {recentActivity.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            item.type === "wellness"
                              ? "bg-green-500"
                              : item.type === "therapy"
                              ? "bg-blue-500"
                              : item.type === "medical"
                              ? "bg-red-500"
                              : "bg-purple-500"
                          }`}
                        />
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
