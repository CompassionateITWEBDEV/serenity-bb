"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

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
  Calendar as CalendarIcon, Clock, Video, MapPin, User,
  CheckCircle, XCircle, AlertCircle, Edit, Trash2, Users
} from "lucide-react";

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
  patients?: { full_name: string | null; email: string | null } | null; // joined
};

const TYPES: NonNullable<Appt["type"]>[] = ["therapy", "group", "medical", "family", "assessment"];

function swalToast(title: string, icon: "success" | "error" | "warning" | "info") {
  return import("sweetalert2").then(({ default: Swal }) =>
    Swal.mixin({ toast: true, position: "top-end", showConfirmButton: false, timer: 2000 })
      .fire({ title, icon })
  );
}

const todayStart = (() => { const t = new Date(); t.setHours(0,0,0,0); return t; })();
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const toISO = (date: string, time: string) => {
  const [y,m,d] = date.split("-").map(Number); const [hh,mm] = time.split(":").map(Number);
  return new Date(y,(m||1)-1,d||1,hh||0,mm||0).toISOString();
};
const toType = (v: string) => (TYPES.includes(v as any) ? v : "therapy") as NonNullable<Appt["type"]>;
const toStatus = (v: string) => (["pending","scheduled","confirmed","completed","cancelled"].includes(v) ? v : "scheduled") as Appt["status"];
const endTime = (a: Appt) => new Date(new Date(a.appointment_time).getTime() + (Math.max(0, a.duration_min ?? 60) * 60000));
const getTypeColor = (t?: string | null) =>
  t==="therapy" ? "bg-purple-100 text-purple-600" :
  t==="group" ? "bg-blue-100 text-blue-600" :
  t==="medical" ? "bg-red-100 text-red-600" :
  t==="family" ? "bg-green-100 text-green-600" :
  t==="assessment" ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-600";
const getStatusColor = (s: Appt["status"]) =>
  s==="confirmed" ? "bg-green-100 text-green-800" :
  s==="pending" ? "bg-yellow-100 text-yellow-800" :
  s==="cancelled" ? "bg-red-100 text-red-800" :
  s==="completed" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800";
const StatusIcon = (s: Appt["status"]) => (s==="confirmed"||s==="completed"?CheckCircle:s==="pending"?AlertCircle:s==="cancelled"?XCircle:Clock);

export default function StaffAppointmentsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  ), []);

  const [staffId, setStaffId] = useState<string | null>(null);
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [items, setItems] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);

  // create/edit form
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [form, setForm] = useState({
    patient_id: "", // required for staff booking
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
    id: "",
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

  // load staff + assignments
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) { router.push("/staff/login"); return; }
      if (!mounted) return;
      setStaffId(data.user.id);

      const { data: pct } = await supabase
        .from("patient_care_team")
        .select("patient_id")
        .eq("staff_id", data.user.id);
      const ids = (pct || []).map(r => r.patient_id);
      setAssignedIds(ids);

      await loadAppointments(data.user.id, ids);
      wireRealtime(data.user.id, ids);
      setLoading(false);
    })();

    function wireRealtime(staff: string, ids: string[]) {
      const ch = supabase
        .channel(`staff-appts-${staff}`)
        .on("postgres_changes",
          { schema: "public", table: "appointments", event: "*" },
          (payload) => {
            const row = (payload.new || payload.old) as Appt;
            const inScope = row.staff_id === staff || ids.includes(row.patient_id);
            if (!inScope) return;
            void loadAppointments(staff, ids);
          }
        )
        .subscribe();
      // why: clean
      return () => supabase.removeChannel(ch);
    }

    async function loadAppointments(staff: string, ids: string[]) {
      // why: union scope (by staff_id OR assigned patient_ids)
      const q1 = supabase
        .from("appointments")
        .select("*, patients:patient_id(full_name,email)")
        .eq("staff_id", staff);

      const q2 = ids.length
        ? supabase
            .from("appointments")
            .select("*, patients:patient_id(full_name,email)")
            .in("patient_id", ids)
        : null;

      const [r1, r2] = await Promise.all([q1, q2]);
      const list1 = (r1.data as Appt[] | null) ?? [];
      const list2 = (r2?.data as Appt[] | null) ?? [];
      const map = new Map<string, Appt>();
      [...list1, ...list2].forEach(a => map.set(a.id, a));
      const merged = Array.from(map.values()).sort((a,b)=>+new Date(a.appointment_time)-+new Date(b.appointment_time));
      setItems(merged);
    }

    return () => { mounted = false; };
  }, [router, supabase]);

  const upcoming = items.filter(a => new Date(a.appointment_time) >= new Date() && a.status !== "cancelled");
  const history  = items.filter(a => new Date(a.appointment_time) <  new Date() || a.status === "completed" || a.status === "cancelled");

  const openEdit = (a: Appt) => {
    const d = new Date(a.appointment_time);
    setEditForm({
      id: a.id,
      type: (a.type || "") as any,
      provider: a.provider || "",
      date: d.toISOString().slice(0,10),
      time: d.toTimeString().slice(0,5),
      duration: String(a.duration_min ?? "60"),
      location: a.location || "",
      isVirtual: !!a.is_virtual,
      title: a.title || "",
      notes: a.notes || "",
      status: a.status,
    });
    setIsEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editForm.id || !editForm.type || !editForm.date || !editForm.time) return;
    const iso = toISO(editForm.date, editForm.time);
    const { error } = await supabase
      .from("appointments")
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
      .eq("id", editForm.id);
    if (error) { await swalToast(error.message, "error"); return; }
    setIsEditOpen(false);
    await swalToast("Appointment updated", "success");
  };

  const updateStatus = async (id: string, status: Appt["status"]) => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) { await swalToast(error.message, "error"); return; }
    await swalToast("Status updated", "success");
  };

  const deleteAppt = async (id: string) => {
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) { await swalToast(error.message, "error"); return; }
    await swalToast("Appointment deleted", "success");
  };

  const createAppt = async () => {
    if (!form.patient_id || !form.type || !form.date || !form.time) {
      await swalToast("Patient, type, date & time required", "warning"); return;
    }
    const iso = toISO(form.date, form.time);
    const { error } = await supabase.from("appointments").insert({
      patient_id: form.patient_id,
      staff_id: staffId,                     // why: bind to current staff
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
    if (error) { await swalToast(error.message, "error"); return; }
    setIsDialogOpen(false);
    setForm({ patient_id: "", type: "", provider: "", date: "", time: "", duration: "60", location: "", isVirtual: false, title: "", notes: "" });
    await swalToast("Appointment created", "success");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 grid place-items-center">
        <div className="text-slate-600">Loading staff appointments…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple staff header */}
      <div className="sticky top-0 z-10 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-cyan-100 grid place-items-center">
              <Users className="h-5 w-5 text-cyan-700" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Staff • Appointments</h1>
              <p className="text-xs text-slate-500">Your patients and sessions</p>
            </div>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <CalendarIcon className="h-4 w-4 mr-2" /> Book for Patient
          </Button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><div className="text-2xl font-bold">{upcoming.length}</div><div className="text-sm text-gray-600">Upcoming</div></div><div className="bg-blue-100 p-3 rounded-lg"><CalendarIcon className="h-6 w-6 text-blue-600" /></div></div></CardContent></Card>
          <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><div className="text-2xl font-bold">{items.filter(a=>a.is_virtual).length}</div><div className="text-sm text-gray-600">Virtual</div></div><div className="bg-purple-100 p-3 rounded-lg"><Video className="h-6 w-6 text-purple-600" /></div></div></CardContent></Card>
          <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><div className="text-2xl font-bold">{items.length}</div><div className="text-sm text-gray-600">Total (scope)</div></div><div className="bg-emerald-100 p-3 rounded-lg"><Users className="h-6 w-6 text-emerald-600" /></div></div></CardContent></Card>
        </div>

        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {upcoming.map((a) => {
              const Icon = StatusIcon(a.status);
              return (
                <Card key={a.id} className="hover:shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold">{a.title || "Appointment"}</h3>
                          <Badge className={getTypeColor(a.type || undefined)}>{a.type || "other"}</Badge>
                          <Badge variant="outline" className={getStatusColor(a.status)}><Icon className="h-3 w-3 mr-1" />{a.status}</Badge>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-2 text-sm text-slate-600">
                          <div className="flex items-center gap-2"><User className="h-4 w-4" />{a.patients?.full_name || "—"} <span className="text-slate-400">({a.patients?.email || "—"})</span></div>
                          <div className="flex items-center gap-2"><CalendarIcon className="h-4 w-4" />{fmtDate(a.appointment_time)}</div>
                          <div className="flex items-center gap-2"><Clock className="h-4 w-4" />{fmtTime(a.appointment_time)} ({a.duration_min ?? 0} min)</div>
                          <div className="flex items-center gap-2">{a.is_virtual ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}{a.location || (a.is_virtual ? "Virtual Meeting" : "—")}</div>
                        </div>
                        {a.notes && <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">{a.notes}</div>}
                      </div>
                      <div className="flex gap-2">
                        {a.is_virtual && <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={()=>swalToast("Open meeting link", "info")}><Video className="h-4 w-4 mr-2" />Join</Button>}
                        <Button size="sm" variant="outline" onClick={() => openEdit(a)}><Edit className="h-4 w-4" /></Button>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(a.id, "cancelled")}><XCircle className="h-4 w-4" /></Button>
                        <Button size="sm" variant="outline" className="text-red-600" onClick={() => deleteAppt(a.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {upcoming.length === 0 && <div className="text-sm text-slate-500">No upcoming appointments.</div>}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {history.map((a) => {
              const Icon = StatusIcon(a.status);
              return (
                <Card key={a.id} className="opacity-95">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold">{a.title || "Appointment"}</h3>
                          <Badge className={getTypeColor(a.type || undefined)}>{a.type || "other"}</Badge>
                          <Badge variant="outline" className={getStatusColor(a.status)}><Icon className="h-3 w-3 mr-1" />{a.status}</Badge>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-2 text-sm text-slate-600">
                          <div className="flex items-center gap-2"><User className="h-4 w-4" />{a.patients?.full_name || "—"}</div>
                          <div className="flex items-center gap-2"><CalendarIcon className="h-4 w-4" />{fmtDate(a.appointment_time)}</div>
                          <div className="flex items-center gap-2"><Clock className="h-4 w-4" />{fmtTime(a.appointment_time)} ({a.duration_min ?? 0} min)</div>
                          <div className="flex items-center gap-2"><MapPin className="h-4 w-4" />{a.location || (a.is_virtual ? "Virtual" : "—")}</div>
                        </div>
                        {a.notes && <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">{a.notes}</div>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {history.length === 0 && <div className="text-sm text-slate-500">No history.</div>}
          </TabsContent>
        </Tabs>
      </main>

      {/* Create dialog (staff books for patient on their care team) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Book Appointment for Patient</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Patient</Label>
              <Select value={form.patient_id} onValueChange={(v)=>setForm(f=>({...f, patient_id:v}))}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>
                  {assignedIds.length === 0 && <SelectItem value="" disabled>No assigned patients</SelectItem>}
                  {assignedIds.map(pid => (
                    <SelectItem key={pid} value={pid}>{pid}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={(e)=>setForm(f=>({...f, title:e.target.value}))} /></div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v)=>setForm(f=>({...f, type: toType(v)}))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Provider</Label><Input value={form.provider} onChange={(e)=>setForm(f=>({...f, provider:e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" min={new Date().toISOString().slice(0,10)} value={form.date} onChange={(e)=>setForm(f=>({...f, date:e.target.value}))} />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input type="time" value={form.time} onChange={(e)=>setForm(f=>({...f, time:e.target.value}))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Duration (min)</Label><Input type="number" min={5} value={form.duration} onChange={(e)=>setForm(f=>({...f, duration:e.target.value}))} /></div>
              <div className="space-y-2"><Label>Location</Label><Input value={form.location} onChange={(e)=>setForm(f=>({...f, location:e.target.value}))} /></div>
            </div>
            <div className="flex items-center gap-2"><input id="v" type="checkbox" checked={form.isVirtual} onChange={(e)=>setForm(f=>({...f, isVirtual:e.target.checked}))} /><Label htmlFor="v">Virtual</Label></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e)=>setForm(f=>({...f, notes:e.target.value}))} /></div>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={createAppt} disabled={!form.patient_id || !form.type || !form.date || !form.time}>Create</Button>
              <Button variant="outline" onClick={()=>setIsDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit / Reschedule</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Title</Label><Input value={editForm.title} onChange={(e)=>setEditForm(f=>({...f, title:e.target.value}))} /></div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={editForm.type} onValueChange={(v)=>setEditForm(f=>({...f, type: toType(v)}))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Date</Label><Input type="date" min={new Date().toISOString().slice(0,10)} value={editForm.date} onChange={(e)=>setEditForm(f=>({...f, date:e.target.value}))} /></div>
              <div className="space-y-2"><Label>Time</Label><Input type="time" value={editForm.time} onChange={(e)=>setEditForm(f=>({...f, time:e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Duration (min)</Label><Input type="number" min={5} value={editForm.duration} onChange={(e)=>setEditForm(f=>({...f, duration:e.target.value}))} /></div>
              <div className="space-y-2"><Label>Location</Label><Input value={editForm.location} onChange={(e)=>setEditForm(f=>({...f, location:e.target.value}))} /></div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(v)=>setEditForm(f=>({...f, status: toStatus(v)}))}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>{["pending","scheduled","confirmed","completed","cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2"><input id="ev" type="checkbox" checked={editForm.isVirtual} onChange={(e)=>setEditForm(f=>({...f, isVirtual:e.target.checked}))} /><Label htmlFor="ev">Virtual</Label></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea rows={3} value={editForm.notes} onChange={(e)=>setEditForm(f=>({...f, notes:e.target.value}))} /></div>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={saveEdit} disabled={!editForm.id || !editForm.type || !editForm.date || !editForm.time}>Save</Button>
              <Button variant="outline" onClick={()=>setIsEditOpen(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
