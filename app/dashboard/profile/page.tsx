"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import type { Profile } from "@/types/profile";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Calendar, Phone, Mail, MapPin, Heart, Activity, Award, Clock, Target, TrendingUp, Edit, LogIn, Save, X
} from "lucide-react";

export const revalidate = 0;                 // why: serve fresh profile
export const dynamic = "force-dynamic";      // why: avoid static caching

type FormState = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  address: string;
  emergency_contact: string;
  admission_date: string;
  treatment_type: string;
  primary_physician: string;
  counselor: string;
};

function toForm(p?: Partial<Profile>): FormState {
  return {
    first_name: p?.first_name ?? "",
    last_name: p?.last_name ?? "",
    email: p?.email ?? "",
    phone: p?.phone ?? "",
    date_of_birth: p?.date_of_birth ?? "",
    address: p?.address ?? "",
    emergency_contact: p?.emergency_contact ?? "",
    admission_date: p?.admission_date ?? "",
    treatment_type: p?.treatment_type ?? "",
    primary_physician: p?.primary_physician ?? "",
    counselor: p?.counselor ?? "",
  };
}

async function ensureProfileExists(user: { id: string; email?: string | null; user_metadata?: any }) {
  // why: create minimal row on first login so the profile page always has data
  const names = (user.user_metadata?.full_name as string | undefined)?.split(" ") ?? [];
  const [first, ...rest] = names;
  const last = rest.join(" ").trim();

  await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      first_name: first || null,
      last_name: last || null,
    },
    { onConflict: "id" }
  );
}

async function fetchProfile(userId: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;
  return data as Profile;
}

async function updateProfile(userId: string, patch: Partial<Profile>) {
  patch.updated_at = new Date().toISOString();
  const { data, error } = await supabase.from("profiles").update(patch).eq("id", userId).select().single();
  if (error) throw error;
  return data as Profile;
}

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<FormState>(toForm());

  // load session/profile; create on first login
  useEffect(() => {
    let unsub = supabase.auth.onAuthStateChange(async (_evt, session) => {
      if (!session?.user) {
        setUserId(null);
        setProfile(null);
        setForm(toForm());
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setUserId(session.user.id);
        await ensureProfileExists(session.user);
        const p = await fetchProfile(session.user.id);
        setProfile(p);
        setForm(toForm(p));
      } finally {
        setLoading(false);
      }
    }).data.subscription;

    // initial fetch
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session?.user) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setUserId(session.user.id);
        await ensureProfileExists(session.user);
        const p = await fetchProfile(session.user.id);
        setProfile(p);
        setForm(toForm(p));
      } finally {
        setLoading(false);
      }
    })();

    return () => unsub?.unsubscribe();
  }, []);

  const initials = useMemo(() => {
    const f = form.first_name?.[0] ?? "U";
    const l = form.last_name?.[0] ?? "";
    return `${f}${l}`.toUpperCase();
  }, [form.first_name, form.last_name]);

  const healthMetrics = [
    { label: "Overall Progress", value: 78 },
    { label: "Treatment Adherence", value: 92 },
    { label: "Wellness Score", value: 85 },
    { label: "Goal Completion", value: 67 },
  ];

  const achievements = [
    { id: 1, title: "30 Days Clean", description: "Completed 30 consecutive days", icon: "🏆", date: "2024-04-01" },
    { id: 2, title: "Mindfulness Master", description: "Completed 50 meditation sessions", icon: "🧘", date: "2024-03-15" },
    { id: 3, title: "Perfect Attendance", description: "Attended all scheduled appointments", icon: "📅", date: "2024-03-01" },
    { id: 4, title: "Peer Support", description: "Helped 5 fellow patients", icon: "🤝", date: "2024-02-20" },
  ];

  const recentActivity = [
    { id: 1, activity: "Completed mindfulness session", time: "2 hours ago", type: "wellness" },
    { id: 2, activity: "Attended group therapy", time: "1 day ago", type: "therapy" },
    { id: 3, activity: "Medication check-in", time: "2 days ago", type: "medical" },
    { id: 4, activity: "Progress assessment", time: "3 days ago", type: "assessment" },
  ];

  async function onSave() {
    if (!userId) return;
    setSaving(true);
    try {
      const updated = await updateProfile(userId, {
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        email: form.email || null,
        phone: form.phone || null,
        date_of_birth: form.date_of_birth || null,
        address: form.address || null,
        emergency_contact: form.emergency_contact || null,
        admission_date: form.admission_date || null,
        treatment_type: form.treatment_type || null,
        primary_physician: form.primary_physician || null,
        counselor: form.counselor || null,
      });
      setProfile(updated);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function onCancel() {
    setForm(toForm(profile ?? undefined));
    setIsEditing(false);
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <p className="text-sm text-gray-600">Loading profile…</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <Card>
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl">Please log in to view your profile</CardTitle>
            <CardDescription>After login, we’ll create your profile automatically.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => supabase.auth.signInWithOAuth({ provider: "google" })}>
              <LogIn className="h-4 w-4 mr-2" /> Login with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-2">View and manage your personal information and progress</p>
        </div>
        {isEditing ? (
          <div className="flex gap-2">
            <Button onClick={onSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving…" : "Save Changes"}
            </Button>
            <Button variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        ) : (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Overview */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src="/patient-avatar.png" />
                  <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                </Avatar>
              </div>
              <CardTitle className="text-2xl">
                {form.first_name || "First"} {form.last_name || "Last"}
              </CardTitle>
              <CardDescription>Patient ID: #{userId.slice(0, 8).toUpperCase()}</CardDescription>
              <div className="flex justify-center gap-2 mt-4">
                <Badge variant="secondary">{form.treatment_type || "N/A"}</Badge>
                <Badge variant="outline">Active</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{form.email || "—"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{form.phone || "—"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{form.date_of_birth ? `Born ${form.date_of_birth}` : "DOB —"}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{form.address || "—"}</span>
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
              {healthMetrics.map((metric, i) => (
                <div key={i}>
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

            {/* OVERVIEW */}
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
                          <p className="text-sm font-medium">{form.primary_physician || "—"}</p>
                          <p className="text-xs text-gray-600">Primary Physician</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="/counselor.png" />
                          <AvatarFallback>CO</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{form.counselor || "—"}</p>
                          <p className="text-xs text-gray-600">Counselor</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
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

            {/* MEDICAL */}
            <TabsContent value="medical">
              <Card>
                <CardHeader>
                  <CardTitle>Medical Information</CardTitle>
                  <CardDescription>Your medical history and current treatment details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!isEditing ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium mb-2">Treatment Information</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span>Admission Date:</span><span>{form.admission_date || "—"}</span></div>
                            <div className="flex justify-between"><span>Treatment Type:</span><span>{form.treatment_type || "—"}</span></div>
                            <div className="flex justify-between"><span>Program Duration:</span><span>90 days</span></div>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Emergency Contact</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span>Contact:</span><span>{form.emergency_contact || "—"}</span></div>
                            <div className="flex justify-between"><span>Relationship:</span><span>Spouse</span></div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Current Medications</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">Methadone</p>
                              <p className="text-sm text-gray-600">40mg daily - Morning</p>
                            </div>
                            <Badge variant="secondary">Active</Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">Multivitamin</p>
                              <p className="text-sm text-gray-600">1 tablet daily - Morning</p>
                            </div>
                            <Badge variant="secondary">Active</Badge>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>First name</Label>
                        <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                        <Label>Last name</Label>
                        <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                        <Label>Email</Label>
                        <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                        <Label>Phone</Label>
                        <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                        <Label>Date of Birth</Label>
                        <Input placeholder="YYYY-MM-DD or Jan 1, 1990" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Address</Label>
                        <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                        <Label>Emergency Contact</Label>
                        <Input value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} />
                        <Label>Admission Date</Label>
                        <Input value={form.admission_date} onChange={(e) => setForm({ ...form, admission_date: e.target.value })} />
                        <Label>Treatment Type</Label>
                        <Input value={form.treatment_type} onChange={(e) => setForm({ ...form, treatment_type: e.target.value })} />
                        <Label>Primary Physician</Label>
                        <Input value={form.primary_physician} onChange={(e) => setForm({ ...form, primary_physician: e.target.value })} />
                        <Label>Counselor</Label>
                        <Input value={form.counselor} onChange={(e) => setForm({ ...form, counselor: e.target.value })} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ACHIEVEMENTS */}
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

            {/* ACTIVITY */}
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
