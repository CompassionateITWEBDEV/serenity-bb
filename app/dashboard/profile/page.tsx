// app/dashboard/profile/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client'; // singleton client
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Phone, Mail, MapPin, Heart, Activity, Award, Clock, Target, TrendingUp, Edit } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type UUID = string;

interface Profile {
  id: UUID;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  date_of_birth?: string | null;
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  admission_date?: string | null;
  treatment_type?: 'Outpatient' | 'Inpatient' | 'IOP' | string | null;
  primary_physician?: string | null;
  counselor?: string | null;
  status?: 'Active' | 'Inactive' | string | null;
  avatar_url?: string | null;
  sessions_completed?: number | null;
  sessions_target?: number | null;
}
interface HealthMetrics {
  user_id: UUID;
  overall_progress?: number | null;
  treatment_adherence?: number | null;
  wellness_score?: number | null;
  goal_completion?: number | null;
}
interface Achievement { id: number; user_id: UUID; title: string; description?: string | null; icon?: string | null; date?: string | null; }
type ActivityType = 'wellness' | 'therapy' | 'medical' | 'assessment' | string;
interface RecentActivity { id: number; user_id: UUID; activity: string; created_at: string; type: ActivityType; }
interface Appointment { id: number; user_id: UUID; title: string; date_time: string; status?: 'Scheduled' | 'Completed' | 'Canceled' | string | null; }
interface Medication { id: number; user_id: UUID; name: string; dosage?: string | null; schedule?: string | null; status?: 'Active' | 'Paused' | 'Discontinued' | string | null; }
interface Goal { id: number; user_id: UUID; title: string; status: 'In Progress' | 'Active' | 'On Track' | 'Completed' | string; }

function formatShortDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}
function formatRelative(iso: string) {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = Math.max(1, Math.round((now - t) / 1000));
  if (diff < 60) return `${diff}s ago`;
  const m = Math.round(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}
function nextLabel(iso: string) {
  const d = new Date(iso);
  const sameDay =
    d.toDateString() === new Date().toDateString()
      ? 'Today'
      : d.toDateString() === new Date(Date.now() + 86400000).toDateString()
        ? 'Tomorrow'
        : d.toLocaleDateString(undefined, { weekday: 'long' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${sameDay}, ${time}`;
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [authMissing, setAuthMissing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState<Profile | null>(null);

  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  const uidRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setErrorMsg(null);

        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id || null;
        uidRef.current = uid;

        if (!uid) {
          if (mounted) {
            setAuthMissing(true);
            setLoading(false);
          }
          return;
        }

        // 1) Profile – create minimal row if missing (requires RLS insert policy)
        const prof = await ensureProfile(uid, auth.user?.email ?? '', auth.user?.user_metadata ?? {});
        if (mounted) {
          setProfile(prof);
          setFormData(prof);
        }

        // 2) Safely load other tables (errors → defaults)
        const [m, ach, act, appts, meds, gs] = await Promise.all([
          selectMaybeSingle<HealthMetrics>('health_metrics', 'user_id', uid),
          selectArray<Achievement>('achievements', 'user_id', uid, q => q.order('date', { ascending: false })),
          selectArray<RecentActivity>('activities', 'user_id', uid, q => q.order('created_at', { ascending: false }).limit(20)),
          selectArray<Appointment>('appointments', 'user_id', uid, q => q
            .gte('date_time', new Date(Date.now() - 7 * 86400000).toISOString())
            .order('date_time', { ascending: true })
            .limit(5)),
          selectArray<Medication>('medications', 'user_id', uid, q => q.order('name')),
          selectArray<Goal>('goals', 'user_id', uid, q => q.order('id')),
        ]);

        if (mounted) {
          setMetrics(m);
          setAchievements(ach);
          setActivities(act);
          setAppointments(appts);
          setMedications(meds);
          setGoals(gs);
        }
      } catch (err: any) {
        if (mounted) setErrorMsg(err?.message ?? 'Failed to load your profile');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  const sessionsTarget = profile?.sessions_target ?? 40;
  const sessionsCompleted = profile?.sessions_completed ?? activities.filter(a => a.type === 'therapy').length;

  function clampPct(n: number) { if (Number.isNaN(n)) return 0; return Math.max(0, Math.min(100, Math.round(n))); }
  function estimateGoalCompletion(gs: Goal[]) { if (!gs.length) return 0; const done = gs.filter(g => g.status === 'Completed').length; return Math.round((done / gs.length) * 100); }
  function estimateOverallProgress(gs: Goal[]) {
    const gc = estimateGoalCompletion(gs);
    const sessionsPct = sessionsTarget ? Math.round(((sessionsCompleted || 0) / sessionsTarget) * 100) : 0;
    return Math.round(0.6 * gc + 0.4 * clampPct(sessionsPct || 50));
  }

  const healthMetrics = [
    { label: 'Overall Progress', value: clampPct(metrics?.overall_progress ?? estimateOverallProgress(goals)) },
    { label: 'Treatment Adherence', value: clampPct(metrics?.treatment_adherence ?? 90) },
    { label: 'Wellness Score', value: clampPct(metrics?.wellness_score ?? 80) },
    { label: 'Goal Completion', value: clampPct(metrics?.goal_completion ?? estimateGoalCompletion(goals)) },
  ];

  async function handleSave() {
    if (!formData || !uidRef.current) return;
    try {
      const payload: Partial<Profile> = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone ?? null,
        date_of_birth: formData.date_of_birth ?? null,
        address: formData.address ?? null,
        emergency_contact_name: formData.emergency_contact_name ?? null,
        emergency_contact_phone: formData.emergency_contact_phone ?? null,
        treatment_type: formData.treatment_type ?? null,
        primary_physician: formData.primary_physician ?? null,
        counselor: formData.counselor ?? null,
        avatar_url: formData.avatar_url ?? null,
        admission_date: formData.admission_date ?? null,
      };
      const { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', uidRef.current)
        .select('*')
        .single();
      if (error) throw error;
      setProfile(data as Profile);
      setFormData(data as Profile);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save profile', err);
      setErrorMsg('Could not save profile changes.');
    }
  }

  if (authMissing) {
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>Please sign in to view your profile.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}>
              Sign in with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading || !profile || !formData) {
    return (
      <div className="container mx-auto p-6 max-w-6xl animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 bg-gray-100 rounded" />
          <div className="lg:col-span-2 h-[600px] bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  const name = `${profile.first_name} ${profile.last_name}`;
  const status = profile.status ?? 'Active';
  const daysInTreatment = profile.admission_date
    ? Math.max(0, Math.floor((Date.now() - new Date(profile.admission_date).getTime()) / 86400000))
    : 0;
  const nextTwo = appointments.slice(0, 2);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-2">View and manage your personal information and progress</p>
          {errorMsg && <p className="mt-2 text-sm text-rose-600">{errorMsg}</p>}
        </div>
        <Button onClick={() => (isEditing ? handleSave() : setIsEditing(true))} variant={isEditing ? 'default' : 'outline'}>
          <Edit className="h-4 w-4 mr-2" />
          {isEditing ? 'Save Changes' : 'Edit Profile'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Overview */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile.avatar_url ?? '/patient-avatar.png'} />
                  <AvatarFallback className="text-2xl">
                    {profile.first_name?.[0]}
                    {profile.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle className="text-2xl">{name}</CardTitle>
              <CardDescription>Patient ID: #{profile.id.slice(0, 8).toUpperCase()}</CardDescription>
              <div className="flex justify-center gap-2 mt-4">
                <Badge variant="secondary">{profile.treatment_type ?? 'Outpatient'}</Badge>
                <Badge variant="outline">{status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field icon={<Mail className="h-4 w-4 text-gray-500" />} label="Email">{profile.email}</Field>
              <Field icon={<Phone className="h-4 w-4 text-gray-500" />} label="Phone">{profile.phone ?? '—'}</Field>
              <Field icon={<Calendar className="h-4 w-4 text-gray-500" />} label="Born">{formatShortDate(profile.date_of_birth)}</Field>
              <Field icon={<MapPin className="h-4 w-4 text-gray-500" />} label="Address">{profile.address ?? '—'}</Field>

              {isEditing && (
                <div className="grid grid-cols-1 gap-3 pt-2">
                  <div className="grid gap-1 text-left">
                    <Label>First name</Label>
                    <Input value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} />
                  </div>
                  <div className="grid gap-1 text-left">
                    <Label>Last name</Label>
                    <Input value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} />
                  </div>
                  <div className="grid gap-1 text-left">
                    <Label>Phone</Label>
                    <Input value={formData.phone ?? ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                  </div>
                  <div className="grid gap-1 text-left">
                    <Label>Date of birth</Label>
                    <Input type="date" value={formData.date_of_birth ?? ''} onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} />
                  </div>
                  <div className="grid gap-1 text-left">
                    <Label>Address</Label>
                    <Input value={formData.address ?? ''} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Health Metrics */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />Health Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {healthMetrics.map((metric, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1"><span>{metric.label}</span><span>{metric.value}%</span></div>
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
                  <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Treatment Goals</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {goals.length ? goals.slice(0, 3).map((g) => (
                        <div key={g.id} className="flex items-center justify-between">
                          <span className="text-sm">{g.title}</span>
                          <Badge variant="secondary">{g.status}</Badge>
                        </div>
                      )) : <p className="text-sm text-gray-600">No goals yet.</p>}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Progress Summary</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between"><span className="text-sm">Days in treatment</span><span className="font-medium">{daysInTreatment} days</span></div>
                      <div className="flex justify-between"><span className="text-sm">Sessions completed</span><span className="font-medium">{sessionsCompleted}/{sessionsTarget}</span></div>
                      <div className="flex justify-between"><span className="text-sm">Goals achieved</span><span className="font-medium">{goals.filter(g => g.status === 'Completed').length}/{goals.length || 0}</span></div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Heart className="h-5 w-5" />Care Team</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8"><AvatarImage src="/caring-doctor.png" /><AvatarFallback>MD</AvatarFallback></Avatar>
                        <div><p className="text-sm font-medium">{profile.primary_physician ?? '—'}</p><p className="text-xs text-gray-600">Primary Physician</p></div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8"><AvatarImage src="/counselor.png" /><AvatarFallback>CO</AvatarFallback></Avatar>
                        <div><p className="text-sm font-medium">{profile.counselor ?? '—'}</p><p className="text-xs text-gray-600">Counselor</p></div>
                      </div>

                      {isEditing && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                          <div className="grid gap-1 text-left"><Label>Primary physician</Label><Input value={formData.primary_physician ?? ''} onChange={(e) => setFormData({ ...formData, primary_physician: e.target.value })} /></div>
                          <div className="grid gap-1 text-left"><Label>Counselor</Label><Input value={formData.counselor ?? ''} onChange={(e) => setFormData({ ...formData, counselor: e.target.value })} /></div>
                          <div className="grid gap-1 text-left"><Label>Treatment type</Label><Input value={formData.treatment_type ?? ''} onChange={(e) => setFormData({ ...formData, treatment_type: e.target.value })} /></div>
                          <div className="grid gap-1 text-left"><Label>Emergency contact (name)</Label><Input value={formData.emergency_contact_name ?? ''} onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })} /></div>
                          <div className="grid gap-1 text-left"><Label>Emergency contact (phone)</Label><Input value={formData.emergency_contact_phone ?? ''} onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })} /></div>
                          <div className="grid gap-1 text-left"><Label>Admission date</Label><Input type="date" value={formData.admission_date ?? ''} onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })} /></div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Next Appointments</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {nextTwo.length ? nextTwo.map((a) => (
                        <div key={a.id} className="flex justify-between">
                          <div><p className="text-sm font-medium">{a.title}</p><p className="text-xs text-gray-600">{nextLabel(a.date_time)}</p></div>
                          <Badge variant="outline">{a.status ?? 'Scheduled'}</Badge>
                        </div>
                      )) : <p className="text-sm text-gray-600">No upcoming appointments.</p>}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Treatment Information</h4>
                      <div className="space-y-2 text-sm">
                        <KV label="Admission Date" value={formatShortDate(profile.admission_date)} />
                        <KV label="Treatment Type" value={profile.treatment_type ?? '—'} />
                        <KV label="Program Duration" value="90 days" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Emergency Contact</h4>
                      <div className="space-y-2 text-sm">
                        <KV label="Contact" value={`${profile.emergency_contact_name ?? '—'}${profile.emergency_contact_phone ? ` - ${profile.emergency_contact_phone}` : ''}`} />
                        <KV label="Relationship" value="Spouse" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Current Medications</h4>
                    <div className="space-y-2">
                      {medications.length ? medications.map((m) => (
                        <div key={m.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{m.name}</p>
                            <p className="text-sm text-gray-600">{m.dosage ?? ''}{m.schedule ? ` - ${m.schedule}` : ''}</p>
                          </div>
                          <Badge variant="secondary">{m.status ?? 'Active'}</Badge>
                        </div>
                      )) : <p className="text-sm text-gray-600">No active medications.</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="achievements">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" />Achievements & Milestones</CardTitle><CardDescription>Celebrate your progress and accomplishments</CardDescription></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {achievements.length ? achievements.map((a) => (
                      <div key={a.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="text-2xl">{a.icon ?? '🏆'}</div>
                        <div className="flex-1">
                          <h4 className="font-medium">{a.title}</h4>
                          {a.description && <p className="text-sm text-gray-600">{a.description}</p>}
                          <p className="text-xs text-gray-500 mt-1">{a.date ? `Earned on ${formatShortDate(a.date)}` : ''}</p>
                        </div>
                      </div>
                    )) : <p className="text-sm text-gray-600">No achievements yet.</p>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardHeader><CardTitle>Recent Activity</CardTitle><CardDescription>Your recent interactions and progress updates</CardDescription></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activities.length ? activities.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div className={`w-2 h-2 rounded-full ${
                          item.type === 'wellness' ? 'bg-green-500' :
                          item.type === 'therapy' ? 'bg-blue-500' :
                          item.type === 'medical' ? 'bg-red-500' : 'bg-purple-500'
                        }`} />
                        <div className="flex-1">
                          <p className="font-medium">{item.activity}</p>
                          <p className="text-sm text-gray-600">{formatRelative(item.created_at)}</p>
                        </div>
                      </div>
                    )) : <p className="text-sm text-gray-600">No recent activity.</p>}
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

/* ---------- Helpers ---------- */
// why: create profile if missing so dashboard always works after signup
async function ensureProfile(uid: string, email: string, meta: any): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
  if (data) return data as Profile;

  const insertRow: Profile = {
    id: uid,
    email,
    first_name: String(meta?.first_name ?? ''),
    last_name: String(meta?.last_name ?? ''),
    phone: null,
    date_of_birth: null,
    address: null,
    emergency_contact_name: null,
    emergency_contact_phone: null,
    admission_date: null,
    treatment_type: null,
    primary_physician: null,
    counselor: null,
    status: 'Active',
    avatar_url: null,
    sessions_completed: 0,
    sessions_target: 40,
  };
  const { data: up, error: upErr } = await supabase.from('profiles').upsert(insertRow).select('*').single();
  if (upErr) throw upErr;
  return up as Profile;
}

// why: avoid breaking the page when optional tables are empty/missing
async function selectMaybeSingle<T>(table: string, col: string, val: string) {
  const { data, error } = await supabase.from(table).select('*').eq(col, val).maybeSingle();
  return error ? null : (data as T | null);
}
async function selectArray<T>(
  table: string,
  col: string,
  val: string,
  mutate?: (q: ReturnType<typeof supabase.from> extends infer F ? any : never) => any
) {
  let q: any = supabase.from(table).select('*').eq(col, val);
  if (mutate) q = mutate(q);
  const { data, error } = await q;
  return error ? ([] as T[]) : ((data ?? []) as T[]);
}

// ---------- Presentational bits ----------
function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <span className="text-sm" aria-label={label}>{children}</span>
    </div>
  );
}
function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}:</span>
      <span>{value}</span>
    </div>
  );
}
