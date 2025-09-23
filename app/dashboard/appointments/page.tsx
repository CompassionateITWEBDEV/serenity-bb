"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase/client";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Plus, Video, MapPin, User, CheckCircle, XCircle, AlertCircle, Edit, Trash2 } from "lucide-react";

type Appt = {
  id: string;
  patient_id: string;
  appointment_time: string; // ISO
  status: "scheduled" | "confirmed" | "pending" | "cancelled" | "completed";
  title: string | null;
  provider: string | null;
  duration_min: number | null;
  type: "therapy" | "group" | "medical" | "family" | "assessment" | null;
  location: string | null;
  is_virtual: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export default function AppointmentsPage() {
  const { isAuthenticated, loading, patient, user } = useAuth();
  const router = useRouter();

  const patientId = isAuthenticated ? (patient?.user_id || patient?.id || user?.id) : null;

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [items, setItems] = useState<Appt[]>([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<{
    type: NonNullable<Appt["type"]> | "";
    provider: string;
    date: string;   // yyyy-mm-dd
    time: string;   // HH:mm
    duration: string; // minutes
    location: string;
    isVirtual: boolean;
    title: string;
    notes: string;
  }>({
    type: "",
    provider: "",
    date: "",
    time: "",
    duration: "60",
    location: "",
    isVirtual: false,
    title: "",
    notes: "",
  });

  // Redirect if not authed
  useEffect(() => {
    if (!loading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, loading, router]);

  // Load + realtime
  useEffect(() => {
    if (!patientId) return;
    let mounted = true;

    const load = async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("patient_id", patientId)
        .order("appointment_time", { ascending: true });
      if (!error && mounted) setItems((data as Appt[]) || []);
    };
    load();

    const ch = supabase
      .channel(`appt_${patientId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments", filter: `patient_id=eq.${patientId}` },
        load,
      )
      .subscribe();

    return () => {
      mounted = false;
      ch.unsubscribe();
    };
  }, [patientId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading appointments...</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated || !patientId || !patient) return null;

  // Derived
  const now = new Date();
  const upcoming = items.filter((a) => new Date(a.appointment_time) >= now && a.status !== "cancelled");
  const history = items.filter((a) => new Date(a.appointment_time) < now || a.status === "completed" || a.status === "cancelled");
  const thisWeekCount = items.filter((a) => {
    const d = new Date(a.appointment_time);
    const start = new Date(); start.setHours(0,0,0,0);
    const day = start.getDay(); const diff = (day === 0 ? -6 : 1) - day; // Monday start
    start.setDate(start.getDate() + diff);
    const end = new Date(start); end.setDate(start.getDate() + 7);
    return d >= start && d < end;
  }).length;
  const virtualCount = items.filter((a) => !!a.is_virtual).length;
  const attendancePct = (() => {
    const total = items.length || 1;
    const attended = items.filter((a) => a.status === "completed").length;
    return Math.round((attended / total) * 100);
  })();

  // Helpers
  function getStatusColor(status: Appt["status"]) {
    switch (status) {
      case "confirmed": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "cancelled": return "bg-red-100 text-red-800";
      case "completed": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  }
  function getStatusIcon(status: Appt["status"]) {
    return status === "confirmed" || status === "completed" ? CheckCircle
      : status === "pending" ? AlertCircle
      : status === "cancelled" ? XCircle : Clock;
  }
  function getTypeColor(t?: string | null) {
    switch (t) {
      case "therapy": return "bg-purple-100 text-purple-600";
      case "group": return "bg-blue-100 text-blue-600";
      case "medical": return "bg-red-100 text-red-600";
      case "family": return "bg-green-100 text-green-600";
      case "assessment": return "bg-orange-100 text-orange-600";
      default: return "bg-gray-100 text-gray-600";
    }
  }
  function fmtDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  }
  function fmtTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // CRUD
  async function createAppt() {
    if (!form.type || !form.date || !form.time) return;
    setBusy(true);
    try {
      const iso = new Date(`${form.date}T${form.time}:00`).toISOString();
      const { error } = await supabase.from("appointments").insert({
        patient_id: patientId,
        appointment_time: iso,
        status: "pending",
        title: form.title || null,
        provider: form.provider || null,
        duration_min: Number(form.duration) || null,
        type: form.type,
        location: form.isVirtual ? "Virtual Meeting" : form.location || null,
        is_virtual: form.isVirtual,
        notes: form.notes || null,
      });
      if (!error) {
        setIsBookingOpen(false);
        setForm({ type: "", provider: "", date: "", time: "", duration: "60", location: "", isVirtual: false, title: "", notes: "" });
      }
    } finally { setBusy(false); }
  }

  async function deleteAppt(id: string) {
    await supabase.from("appointments").delete().eq("id", id).eq("patient_id", patientId);
  }

  async function updateStatus(id: string, status: Appt["status"]) {
    await supabase.from("appointments").update({ status }).eq("id", id).eq("patient_id", patientId);
  }

  // Render
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader patient={patient} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-serif font-bold text-gray-900">Appointments</h1>
                <p className="text-gray-600">Manage your therapy sessions and medical appointments</p>
              </div>
            </div>

            <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Book Appointment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Book New Appointment</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g., Individual Therapy Session" />
                  </div>
                  <div className="space-y-2">
                    <Label>Appointment Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as any }))}>
                      <SelectTrigger><SelectValue placeholder="Select appointment type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="therapy">Individual Therapy</SelectItem>
                        <SelectItem value="group">Group Counseling</SelectItem>
                        <SelectItem value="medical">Medical Check-up</SelectItem>
                        <SelectItem value="family">Family Therapy</SelectItem>
                        <SelectItem value="assessment">Assessment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Input value={form.provider} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))} placeholder="e.g., Dr. Sarah Johnson" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Time</Label>
                      <Input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Duration (min)</Label>
                      <Input type="number" min={5} value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Room 205 / Virtual Meeting" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input id="isVirtual" type="checkbox" checked={form.isVirtual} onChange={(e) => setForm((f) => ({ ...f, isVirtual: e.target.checked }))} />
                    <Label htmlFor="isVirtual">Virtual</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Any specific concerns or requests..." />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button className="flex-1" onClick={createAppt} disabled={busy || !form.type || !form.date || !form.time}>
                      Request Appointment
                    </Button>
                    <Button variant="outline" onClick={() => setIsBookingOpen(false)}>Cancel</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card><CardContent className="p-6"><div className="flex items-center justify-between">
            <div><div className="text-2xl font-bold text-gray-900">{upcoming.length}</div><div className="text-sm text-gray-600">Upcoming</div></div>
            <div className="bg-blue-100 p-3 rounded-lg"><Calendar className="h-6 w-6 text-blue-600" /></div>
          </div></CardContent></Card>

          <Card><CardContent className="p-6"><div className="flex items-center justify-between">
            <div><div className="text-2xl font-bold text-gray-900">{thisWeekCount}</div><div className="text-sm text-gray-600">This Week</div></div>
            <div className="bg-green-100 p-3 rounded-lg"><Clock className="h-6 w-6 text-green-600" /></div>
          </div></CardContent></Card>

          <Card><CardContent className="p-6"><div className="flex items-center justify-between">
            <div><div className="text-2xl font-bold text-gray-900">{virtualCount}</div><div className="text-sm text-gray-600">Virtual</div></div>
            <div className="bg-purple-100 p-3 rounded-lg"><Video className="h-6 w-6 text-purple-600" /></div>
          </div></CardContent></Card>

          <Card><CardContent className="p-6"><div className="flex items-center justify-between">
            <div><div className="text-2xl font-bold text-gray-900">{attendancePct}%</div><div className="text-sm text-gray-600">Attendance</div></div>
            <div className="bg-yellow-100 p-3 rounded-lg"><CheckCircle className="h-6 w-6 text-yellow-600" /></div>
          </div></CardContent></Card>
        </div>

        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upcoming">Upcoming Appointments</TabsTrigger>
            <TabsTrigger value="history">Appointment History</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-6">
            <div className="space-y-4">
              {upcoming.map((a) => {
                const StatusIcon = getStatusIcon(a.status);
                return (
                  <Card key={a.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{a.title || "Appointment"}</h3>
                            <Badge className={getTypeColor(a.type || undefined)}>{a.type || "other"}</Badge>
                            <Badge variant="outline" className={getStatusColor(a.status)}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {a.status}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2"><User className="h-4 w-4" />{a.provider || "—"}</div>
                            <div className="flex items-center gap-2"><Calendar className="h-4 w-4" />{fmtDate(a.appointment_time)}</div>
                            <div className="flex items-center gap-2"><Clock className="h-4 w-4" />{fmtTime(a.appointment_time)} ({a.duration_min ?? 0} min)</div>
                            <div className="flex items-center gap-2">
                              {a.is_virtual ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                              {a.location || (a.is_virtual ? "Virtual Meeting" : "—")}
                            </div>
                          </div>

                          {a.notes && <div className="mt-3 p-3 bg-gray-50 rounded-lg"><p className="text-sm text-gray-700">{a.notes}</p></div>}
                        </div>

                        <div className="flex gap-2 ml-4">
                          {a.is_virtual && <Button size="sm" className="bg-purple-600 hover:bg-purple-700"><Video className="h-4 w-4 mr-2" />Join</Button>}
                          <Button size="sm" variant="outline" onClick={() => updateStatus(a.id, "cancelled")}><XCircle className="h-4 w-4" /></Button>
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 bg-transparent" onClick={() => deleteAppt(a.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {upcoming.length === 0 && <div className="text-sm text-gray-500">No upcoming appointments.</div>}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <div className="space-y-4">
              {history.map((a) => {
                const StatusIcon = getStatusIcon(a.status);
                return (
                  <Card key={a.id} className="opacity-90">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{a.title || "Appointment"}</h3>
                            <Badge className={getTypeColor(a.type || undefined)}>{a.type || "other"}</Badge>
                            <Badge variant="outline" className={getStatusColor(a.status)}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {a.status}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2"><User className="h-4 w-4" />{a.provider || "—"}</div>
                            <div className="flex items-center gap-2"><Calendar className="h-4 w-4" />{fmtDate(a.appointment_time)}</div>
                            <div className="flex items-center gap-2"><Clock className="h-4 w-4" />{fmtTime(a.appointment_time)} ({a.duration_min ?? 0} min)</div>
                            <div className="flex items-center gap-2"><MapPin className="h-4 w-4" />{a.location || "—"}</div>
                          </div>

                          {a.notes && <div className="mt-3 p-3 bg-gray-50 rounded-lg"><p className="text-sm text-gray-700">{a.notes}</p></div>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {history.length === 0 && <div className="text-sm text-gray-500">No appointment history.</div>}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
