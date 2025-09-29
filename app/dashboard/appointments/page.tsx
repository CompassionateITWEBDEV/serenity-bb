"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase/client";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Calendar as CalendarIcon, Clock, Plus, Video, MapPin, User,
  CheckCircle, XCircle, AlertCircle, Edit, Trash2,
  Bell, AlertTriangle, Info, CheckCircle2
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

const TYPES: NonNullable<Appt["type"]>[] = ["therapy", "group", "medical", "family", "assessment"];

// --- local date utils (why: consistent YYYY-MM-DD handling) ---
const todayStart = (() => { const t = new Date(); t.setHours(0,0,0,0); return t; })();
function formatYmd(d?: Date) { return d ? new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10) : ""; }
function parseYmd(s: string) { if (!s) return undefined; const [y,m,dd] = s.split("-").map(Number); return new Date(y, (m||1)-1, dd||1); }

// --- smart alert helpers ---
type SmartAlert = {
  id: string;
  variant: "default" | "destructive";
  tone: "info" | "warn" | "ok";
  title: string;
  desc: string;
  action?: JSX.Element;
};

function toISO(date: string, time: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const local = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
  return local.toISOString();
}

// Compute end time using duration (defaults to 60min if null/0)
function endTime(a: Appt) {
  const start = new Date(a.appointment_time);
  const dur = Math.max(0, a.duration_min ?? 60);
  return new Date(start.getTime() + dur * 60000);
}
function minutesBetween(a: Date, b: Date) { return Math.round((b.getTime() - a.getTime()) / 60000); }
function isOverlap(a: Appt, b: Appt) {
  const aStart = new Date(a.appointment_time);
  const aEnd = endTime(a);
  const bStart = new Date(b.appointment_time);
  const bEnd = endTime(b);
  return aStart < bEnd && bStart < aEnd;
}

export default function AppointmentsPage() {
  const { isAuthenticated, loading, patient, user } = useAuth();
  const router = useRouter();
  const patientId = isAuthenticated ? (patient?.user_id || patient?.id || user?.id) : null;

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [items, setItems] = useState<Appt[]>([]);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    type: "" as NonNullable<Appt["type"]> | "",
    provider: "",
    date: "",
    time: "",
    duration: "60",
    location: "",
    isVirtual: false,
    title: "",
    notes: "",
  });
  const [editForm, setEditForm] = useState({
    id: "" as string,
    type: "" as NonNullable<Appt["type"]> | "",
    provider: "",
    date: "",
    time: "",
    duration: "60",
    location: "",
    isVirtual: false,
    title: "",
    notes: "",
    status: "scheduled" as Appt["status"],
  });

  // calendar dropdown state
  const [openCreateCal, setOpenCreateCal] = useState(false);
  const [openEditCal, setOpenEditCal] = useState(false);

  // --- Smart Alert state (snooze/dismiss) ---
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [snoozes, setSnoozes] = useState<Record<string, string>>({}); // id -> ISO until

  useEffect(() => {
    try {
      const raw = localStorage.getItem("appt_alert_snoozes");
      if (raw) setSnoozes(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem("appt_alert_snoozes", JSON.stringify(snoozes)); } catch { /* ignore */ }
  }, [snoozes]);

  // Guard: must be logged in
  useEffect(() => { if (!loading && !isAuthenticated) router.push("/login"); }, [isAuthenticated, loading, router]);

  // Fetch appointments (reusable)
  const loadAppointments = useCallback(async () => {
    if (!patientId) return;
    const { data, error } = await supabase
      .from("appointments").select("*")
      .eq("patient_id", patientId)
      .order("appointment_time", { ascending: true });
    if (!error) setItems((data as Appt[]) || []);
  }, [patientId]);

  // Initial load + realtime refresh
  useEffect(() => {
    if (!patientId) return;
    void loadAppointments();
    const ch = supabase
      .channel(`appt_${patientId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "appointments", filter: `patient_id=eq.${patientId}` },
        () => loadAppointments()
      )
      .subscribe();
    return () => ch.unsubscribe();
  }, [patientId, loadAppointments]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading appointments...</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated || !patientId || !patient) return null;

  // Derived lists
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

  // UI helpers
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

  // === Smart detection ===
  const overlaps = useMemo(() => {
    const list: { a: Appt; b: Appt }[] = [];
    const sorted = [...upcoming].sort((x,y)=>+new Date(x.appointment_time)-+new Date(y.appointment_time));
    for (let i=0;i<sorted.length;i++){
      for (let j=i+1;j<sorted.length;j++){
        if (isOverlap(sorted[i], sorted[j])) list.push({ a: sorted[i], b: sorted[j] });
        else {
          // once no overlap with j, further j might start even later; break if start past end
          const end = endTime(sorted[i]);
          const nextStart = new Date(sorted[j].appointment_time);
          if (nextStart >= end) break;
        }
      }
    }
    return list;
  }, [upcoming]);

  const tightGaps = useMemo(() => {
    const MIN_GAP = 10; // minutes
    const list: { prev: Appt; next: Appt; gap: number }[] = [];
    const s = [...upcoming].sort((x,y)=>+new Date(x.appointment_time)-+new Date(y.appointment_time));
    for (let i=0;i<s.length-1;i++){
      const a = s[i], b = s[i+1];
      const gap = minutesBetween(endTime(a), new Date(b.appointment_time));
      if (gap >= 0 && gap < MIN_GAP) list.push({ prev: a, next: b, gap });
    }
    return list;
  }, [upcoming]);

  const longPending = useMemo(() => {
    const HOURS = 48;
    const cutoff = new Date(Date.now() - HOURS*3600*1000);
    return upcoming.filter(a => a.status === "pending" && new Date(a.created_at) < cutoff);
  }, [upcoming]);

  const heavyDays = useMemo(() => {
    const MAX_PER_DAY = 3;
    const byDay = new Map<string, Appt[]>();
    upcoming.forEach(a => {
      const key = new Date(a.appointment_time).toDateString();
      byDay.set(key, [...(byDay.get(key)||[]), a]);
    });
    return [...byDay.entries()].filter(([,list]) => list.length > MAX_PER_DAY).map(([k, list]) => ({ day:k, list }));
  }, [upcoming]);

  const joinWindow = useMemo(() => {
    const EARLY = 10, LATE = 15; // minutes
    const nowTs = Date.now();
    return upcoming.find(a => {
      if (!a.is_virtual) return false;
      const start = new Date(a.appointment_time).getTime();
      const deltaMin = (start - nowTs)/60000;
      const afterStartMin = (nowTs - start)/60000;
      return (deltaMin <= EARLY && deltaMin >= -LATE);
    });
  }, [upcoming]);

  // --- Build Smart Alerts list ---
  const alerts = useMemo<SmartAlert[]>(() => {
    const arr: SmartAlert[] = [];

    if (joinWindow) {
      arr.push({
        id: `join-${joinWindow.id}`,
        variant: "default",
        tone: "ok",
        title: `It's time to join "${joinWindow.title || "Virtual Appointment"}".`,
        desc: `${fmtDate(joinWindow.appointment_time)} at ${fmtTime(joinWindow.appointment_time)}.`,
        action: (
          <Button size="sm" className="mt-2" onClick={()=>alert("TODO: open virtual link") /* why: depends on your link field */}>
            <Video className="h-4 w-4 mr-2" /> Join
          </Button>
        )
      });
    }

    if (overlaps.length) {
      const first = overlaps[0];
      arr.push({
        id: `overlap-${first.a.id}-${first.b.id}`,
        variant: "destructive",
        tone: "warn",
        title: "You've got overlapping appointments.",
        desc: `“${first.a.title || "Appt"}” overlaps with “${first.b.title || "Appt"}”. Review and reschedule.`,
        action: (
          <Button size="sm" variant="outline" onClick={()=>openEdit(first.a)}>
            <Edit className="h-4 w-4 mr-2" /> Review
          </Button>
        )
      });
    }

    if (tightGaps.length) {
      const { prev, next, gap } = tightGaps[0];
      arr.push({
        id: `tightgap-${prev.id}-${next.id}`,
        variant: "default",
        tone: "warn",
        title: "Tight turnaround between sessions.",
        desc: `Only ${gap} min between “${prev.title || "Appt"}” and “${next.title || "Appt"}”. Consider padding.`,
        action: (
          <Button size="sm" variant="outline" onClick={()=>openEdit(next)}>
            <Edit className="h-4 w-4 mr-2" /> Adjust next
          </Button>
        )
      });
    }

    if (longPending.length) {
      const target = longPending[0];
      arr.push({
        id: `pending-${target.id}`,
        variant: "default",
        tone: "info",
        title: "Appointment request pending > 48h.",
        desc: `“${target.title || "Appointment"}” is still pending. Update status if confirmed.`,
        action: (
          <Button
            size="sm"
            variant="outline"
            onClick={()=>updateStatus(target.id, "scheduled")}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" /> Mark scheduled
          </Button>
        )
      });
    }

    if (heavyDays.length) {
      const day = heavyDays[0];
      arr.push({
        id: `heavy-${day.day}`,
        variant: "default",
        tone: "info",
        title: "Packed day detected.",
        desc: `${day.list.length} sessions on ${day.day}. Consider moving one to reduce overload.`,
        action: (
          <Button size="sm" variant="outline" onClick={()=>setIsBookingOpen(true)}>
            <CalendarIcon className="h-4 w-4 mr-2" /> Rebalance
          </Button>
        )
      });
    }

    if (!upcoming.length) {
      arr.push({
        id: "noupcoming",
        variant: "default",
        tone: "info",
        title: "No upcoming appointments.",
        desc: "Book your next session to stay on track.",
        action: (
          <Button size="sm" onClick={()=>setIsBookingOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Book now
          </Button>
        )
      });
    }

    return arr;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinWindow, overlaps, tightGaps, longPending, heavyDays, upcoming.length]);

  // Apply snoozes & dismissals
  const visibleAlerts = useMemo(() => {
    const nowIso = new Date().toISOString();
    return alerts.filter(a => {
      if (dismissed.has(a.id)) return false;
      const until = snoozes[a.id];
      if (until && until > nowIso) return false;
      return true;
    });
  }, [alerts, dismissed, snoozes]);

  function onDismiss(id: string) {
    setDismissed(new Set([...dismissed, id]));
  }
  function onSnooze(id: string, mins: number) {
    const until = new Date(Date.now() + mins*60000).toISOString();
    setSnoozes(prev => ({ ...prev, [id]: until }));
  }

  // === CRUD ===
  async function createAppt() {
    if (!form.type || !form.date || !form.time) return;

    const selected = new Date(`${form.date}T${form.time}:00`);
    if (selected < new Date()) { alert("Please pick a future date/time."); return; }

    setBusy(true);
    try {
      const iso = toISO(form.date, form.time);
      const temp: Appt = {
        id: `temp-${crypto.randomUUID()}`,
        patient_id: patientId!,
        appointment_time: iso,
        status: "pending",
        title: form.title || "Appointment",
        provider: form.provider || null,
        duration_min: Number(form.duration) || null,
        type: form.type,
        location: form.isVirtual ? "Virtual Meeting" : (form.location || null),
        is_virtual: form.isVirtual,
        notes: form.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setItems((prev) => [...prev, temp].sort((a,b)=>+new Date(a.appointment_time)-+new Date(b.appointment_time)));

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

      if (error) {
        alert(error.message);
        setItems((prev) => prev.filter((r) => r.id !== temp.id));
      } else {
        await loadAppointments();
        setIsBookingOpen(false);
        setForm({ type: "", provider: "", date: "", time: "", duration: "60", location: "", isVirtual: false, title: "", notes: "" });
      }
    } finally { setBusy(false); }
  }

  async function openEdit(a: Appt) {
    const d = new Date(a.appointment_time);
    const date = d.toISOString().slice(0,10);
    const time = d.toTimeString().slice(0,5);
    setEditForm({
      id: a.id,
      type: (a.type || "") as any,
      provider: a.provider || "",
      date, time,
      duration: String(a.duration_min ?? "60"),
      location: a.location || "",
      isVirtual: !!a.is_virtual,
      title: a.title || "",
      notes: a.notes || "",
      status: a.status,
    });
    setIsEditOpen(true);
  }

  async function saveEdit() {
    if (!editForm.id || !editForm.type || !editForm.date || !editForm.time) return;
    const iso = toISO(editForm.date, editForm.time);
    setBusy(true);
    try {
      const { error } = await supabase.from("appointments")
        .update({
          appointment_time: iso,
          status: editForm.status,
          title: editForm.title || null,
          provider: editForm.provider || null,
          duration_min: Number(editForm.duration) || null,
          type: editForm.type,
          location: editForm.isVirtual ? "Virtual Meeting" : editForm.location || null,
          is_virtual: editForm.isVirtual,
          notes: editForm.notes || null,
        })
        .eq("id", editForm.id)
        .eq("patient_id", patientId);
      if (error) alert(error.message);
      setIsEditOpen(false);
      await loadAppointments();
    } finally { setBusy(false); }
  }

  async function deleteAppt(id: string) {
    if (!confirm("Delete this appointment?")) return;
    const prev = items;
    setItems((list) => list.filter((a) => a.id !== id));
    const { error } = await supabase.from("appointments").delete().eq("id", id).eq("patient_id", patientId);
    if (error) { alert(error.message); setItems(prev); }
  }

  async function updateStatus(id: string, status: Appt["status"]) {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id).eq("patient_id", patientId);
    if (error) alert(error.message); else await loadAppointments();
  }

  // === UI ===
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader patient={patient} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Smart Alerts */}
        {visibleAlerts.length > 0 && (
          <div className="space-y-3 mb-6">
            {visibleAlerts.map(a => {
              const Icon = a.tone === "warn" ? AlertTriangle : a.tone === "ok" ? CheckCircle2 : Info;
              return (
                <Alert key={a.id} variant={a.variant}>
                  <div className="flex items-start gap-3">
                    <Icon className="h-5 w-5 mt-0.5" />
                    <div className="flex-1">
                      <AlertTitle className="flex items-center gap-2">
                        <Bell className="h-4 w-4" /> {a.title}
                      </AlertTitle>
                      <AlertDescription className="text-sm text-gray-700">
                        {a.desc}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {a.action}
                          <Button size="sm" variant="ghost" onClick={()=>onSnooze(a.id, 60)}>Snooze 1h</Button>
                          <Button size="sm" variant="ghost" onClick={()=>onSnooze(a.id, 60*24)}>Snooze 1d</Button>
                          <Button size="sm" variant="ghost" onClick={()=>onDismiss(a.id)}>Dismiss</Button>
                        </div>
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              );
            })}
          </div>
        )}

        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <CalendarIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-serif font-bold text-gray-900">Appointments</h1>
                <p className="text-gray-600">Manage your therapy sessions and medical appointments</p>
              </div>
            </div>

            <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setIsBookingOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Book Appointment
              </Button>
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
                      <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Input value={form.provider} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))} placeholder="e.g., Dr. Sarah Johnson" />
                  </div>

                  {/* Date + Time */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2 relative">
                      <Label>Date</Label>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setOpenCreateCal((s) => !s)}
                      >
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {form.date ? new Date(form.date).toLocaleDateString() : "Pick a date"}
                      </Button>
                      {openCreateCal && (
                        <div className="absolute z-50 mt-2 rounded-2xl border bg-white shadow-lg">
                          <DayPicker
                            mode="single"
                            selected={parseYmd(form.date)}
                            onSelect={(d) => {
                              if (!d) return;
                              if (d < todayStart) return; // block past
                              setForm((f) => ({ ...f, date: formatYmd(d) }));
                              setOpenCreateCal(false);
                            }}
                            disabled={{ before: todayStart }}
                            showOutsideDays
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Time</Label>
                      <Input
                        type="time"
                        value={form.time}
                        onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                      />
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
            <div className="bg-blue-100 p-3 rounded-lg"><CalendarIcon className="h-6 w-6 text-blue-600" /></div>
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

        {/* Upcoming */}
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
                            <div className="flex items-center gap-2"><CalendarIcon className="h-4 w-4" />{fmtDate(a.appointment_time)}</div>
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
                          <Button size="sm" variant="outline" onClick={() => openEdit(a)}><Edit className="h-4 w-4" /></Button>
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

        {/* History */}
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
                            <div className="flex items-center gap-2"><CalendarIcon className="h-4 w-4" />{fmtDate(a.appointment_time)}</div>
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

      {/* Edit / Reschedule */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit / Reschedule</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Title</Label><Input value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={editForm.type} onValueChange={(v) => setEditForm((f) => ({ ...f, type: v as any }))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Provider</Label><Input value={editForm.provider} onChange={(e) => setEditForm((f) => ({ ...f, provider: e.target.value }))} /></div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2 relative">
                <Label>Date</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setOpenEditCal((s) => !s)}
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {editForm.date ? new Date(editForm.date).toLocaleDateString() : "Pick a date"}
                </Button>
                {openEditCal && (
                  <div className="absolute z-50 mt-2 rounded-2xl border bg-white shadow-lg">
                    <DayPicker
                      mode="single"
                      selected={parseYmd(editForm.date)}
                      onSelect={(d) => {
                        if (!d) return;
                        if (d < todayStart) return;
                        setEditForm((f) => ({ ...f, date: formatYmd(d) }));
                        setOpenEditCal(false);
                      }}
                      disabled={{ before: todayStart }}
                      showOutsideDays
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Time</Label>
                <Input type="time" value={editForm.time} onChange={(e) => setEditForm((f) => ({ ...f, time: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Duration (min)</Label><Input type="number" min={5} value={editForm.duration} onChange={(e) => setEditForm((f) => ({ ...f, duration: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Location</Label><Input value={editForm.location} onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))} /></div>
            </div>
            <div className="flex items-center gap-2"><input id="edit_isVirtual" type="checkbox" checked={editForm.isVirtual} onChange={(e) => setEditForm((f) => ({ ...f, isVirtual: e.target.checked }))} /><Label htmlFor="edit_isVirtual">Virtual</Label></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v as Appt["status"] }))}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>{["pending","scheduled","confirmed","completed","cancelled"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea rows={3} value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} /></div>
            <div className="flex gap-3 pt-4"><Button className="flex-1" onClick={saveEdit} disabled={busy || !editForm.id || !editForm.type || !editForm.date || !editForm.time}>Save</Button><Button variant="outline" onClick={() => setIsEditOpen(false)}>Close</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
