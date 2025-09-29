"use client";

import { useCallback, useEffect, useState } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";

type Appt = {
  id: string;
  patient_id: string;
  appointment_time: string;
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
function toISO(date: string, time: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const local = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
  return local.toISOString();
}

// --- smart alert helpers ---
type SmartAlert = {
  id: string;
  variant: "default" | "destructive";
  tone: "info" | "warn" | "ok";
  title: string;
  desc: string;
  // action payload (rendered later)
  actionType?: "join" | "edit" | "markScheduled" | "rebalance" | "book";
  actionApptId?: string;
};

// end time using duration (defaults to 60min if null/0)
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
    } catch { /* ignore bad JSON */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem("appt_alert_snoozes", JSON.stringify(snoozes)); } catch { /* ignore quota */ }
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

  // === Smart detection (simple, no useMemo) ===
  const sortedUpcoming = [...upcoming].sort((x,y)=>+new Date(x.appointment_time)-+new Date(y.appointment_time));

  // overlaps (first hit only for alert)
  let overlapPair: { a: Appt; b: Appt } | undefined;
  for (let i=0;i<sortedUpcoming.length && !overlapPair;i++){
    for (let j=i+1;j<sortedUpcoming.length;j++){
      if (isOverlap(sortedUpcoming[i], sortedUpcoming[j])) { overlapPair = { a: sortedUpcoming[i], b: sortedUpcoming[j] }; break; }
      const end = endTime(sortedUpcoming[i]);
      if (new Date(sortedUpcoming[j].appointment_time) >= end) break;
    }
  }

  // tight gap
  const MIN_GAP = 10;
  let tightGap: { prev: Appt; next: Appt; gap: number } | undefined;
  for (let i=0;i<sortedUpcoming.length-1;i++){
    const prev = sortedUpcoming[i], next = sortedUpcoming[i+1];
    const gap = minutesBetween(endTime(prev), new Date(next.appointment_time));
    if (gap >= 0 && gap < MIN_GAP) { tightGap = { prev, next, gap }; break; }
  }

  // long pending
  const HOURS = 48;
  const cutoff = new Date(Date.now() - HOURS*3600*1000);
  const pendingOld = sortedUpcoming.find(a => a.status === "pending" && new Date(a.created_at || a.appointment_time) < cutoff);

  // heavy day
  const MAX_PER_DAY = 3;
  const byDay = new Map<string, Appt[]>();
  sortedUpcoming.forEach(a => {
    const key = new Date(a.appointment_time).toDateString();
    byDay.set(key, [...(byDay.get(key)||[]), a]);
  });
  const heavy = [...byDay.entries()].find(([,list]) => list.length > MAX_PER_DAY);

  // join window (virtual)
  const EARLY = 10, LATE = 15;
  const nowTs = Date.now();
  const joinSoon = sortedUpcoming.find(a => a.is_virtual && ((new Date(a.appointment_time).getTime() - nowTs)/60000 <= EARLY) && ((nowTs - new Date(a.appointment_time).getTime())/60000 <= LATE));

  // Build alerts (plain data)
  const alerts: SmartAlert[] = [];
  if (joinSoon) {
    alerts.push({
      id: `join-${joinSoon.id}`,
      variant: "default",
      tone: "ok",
      title: `It's time to join "${joinSoon.title || "Virtual Appointment"}".`,
      desc: `${fmtDate(joinSoon.appointment_time)} at ${fmtTime(joinSoon.appointment_time)}.`,
      actionType: "join",
      actionApptId: joinSoon.id,
    });
  }
  if (overlapPair) {
    alerts.push({
      id: `overlap-${overlapPair.a.id}-${overlapPair.b.id}`,
      variant: "destructive",
      tone: "warn",
      title: "You've got overlapping appointments.",
      desc: `“${overlapPair.a.title || "Appt"}” overlaps with “${overlapPair.b.title || "Appt"}”. Review and reschedule.`,
      actionType: "edit",
      actionApptId: overlapPair.a.id,
    });
  }
  if (tightGap) {
    alerts.push({
      id: `tightgap-${tightGap.prev.id}-${tightGap.next.id}`,
      variant: "default",
      tone: "warn",
      title: "Tight turnaround between sessions.",
      desc: `Only ${tightGap.gap} min between “${tightGap.prev.title || "Appt"}” and “${tightGap.next.title || "Appt"}”. Consider padding.`,
      actionType: "edit",
      actionApptId: tightGap.next.id,
    });
  }
  if (pendingOld) {
    alerts.push({
      id: `pending-${pendingOld.id}`,
      variant: "default",
      tone: "info",
      title: "Appointment request pending > 48h.",
      desc: `“${pendingOld.title || "Appointment"}” is still pending. Update status if confirmed.`,
      actionType: "markScheduled",
      actionApptId: pendingOld.id,
    });
  }
  if (heavy) {
    const [day, list] = heavy;
    alerts.push({
      id: `heavy-${day}`,
      variant: "default",
      tone: "info",
      title: "Packed day detected.",
      desc: `${list.length} sessions on ${day}. Consider moving one to reduce overload.`,
      actionType: "rebalance",
    });
  }
  if (!sortedUpcoming.length) {
    alerts.push({
      id: "noupcoming",
      variant: "default",
      tone: "info",
      title: "No upcoming appointments.",
      desc: "Book your next session to stay on track.",
      actionType: "book",
    });
  }

  // Apply snoozes & dismissals
  const nowIso = new Date().toISOString();
  const visibleAlerts = alerts.filter(a => {
    if (dismissed.has(a.id)) return false;
    const until = snoozes[a.id];
    if (until && until > nowIso) return false;
    return true;
  });

  function onDismiss(id: string) { setDismissed(new Set([...dismissed, id])); }
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
        id: `temp-${(typeof crypto !== "undefined" && "randomUUID" in crypto) ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`, // why: SSR/older browsers safety
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

  async function openEditById(id?: string) {
    const a = items.find(x => x.id === id);
    if (a) openEdit(a);
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
                      <div className="flex items-center gap-2 font-medium">
                        <Bell className="h-4 w-4" />
                        <span>{a.title}</span>
                      </div>
                      <AlertDescription className="text-sm text-gray-700">
                        {a.desc}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {a.actionType === "join" && (
                            <Button size="sm" className="mt-0" onClick={()=>alert("TODO: open virtual link") /* why: depends on your link field */}>
                              <Video className="h-4 w-4 mr-2" /> Join
                            </Button>
                          )}
                          {a.actionType === "edit" && (
                            <Button size="sm" variant="outline" onClick={()=>openEditById(a.actionApptId)}>
                              <Edit className="h-4 w-4 mr-2" /> Review
                            </Button>
                          )}
                          {a.actionType === "markScheduled" && a.actionApptId && (
                            <Button size="sm" variant="outline" onClick={()=>updateStatus(a.actionApptId!, "scheduled")}>
                              <CheckCircle2 className="h-4 w-4 mr-2" /> Mark scheduled
                            </Button>
                          )}
                          {a.actionType === "rebalance" && (
                            <Button size="sm" variant="outline" onClick={()=>setIsBookingOpen(true)}>
                              <CalendarIcon className="h-4 w-4 mr-2" /> Rebalance
                            </Button>
                          )}
                          {a.actionType === "book" && (
                            <Button size="sm" onClick={()=>setIsBookingOpen(true)}>
                              <Plus className="h-4 w-4 mr-2" /> Book now
                            </Button>
                          )}
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
