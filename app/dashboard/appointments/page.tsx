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

  CheckCircle, XCircle, AlertCircle, Edit, Trash2, Bell,

  AlertTriangle, Info, CheckCircle2

} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import StaffSelector from "@/components/appointments/StaffSelector";
import StaffVerificationBadge from "@/components/staff/StaffVerificationBadge";



/* =============== Types =============== */



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



type AlertModel = {

  id: string;

  variant: "default" | "destructive";

  tone: "info" | "warn" | "ok";

  title: string;

  desc: string;

  action?: { kind: "join" | "edit" | "scheduled" | "rebalance" | "book"; apptId?: string };

};



/* =============== Utils =============== */



const todayStart = (() => { const t = new Date(); t.setHours(0,0,0,0); return t; })();



function formatYmd(d?: Date) { 

  return d ? new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10) : ""; 

}



function parseYmd(s: string) { 

  if (!s) return undefined; 

  const [y,m,dd] = s.split("-").map(Number); 

  return new Date(y, (m||1)-1, dd||1); 

}



function toISO(date: string, time: string) { 

  const [y,m,dd] = date.split("-").map(Number); 

  const [hh,mm] = time.split(":").map(Number); 

  return new Date(y,(m||1)-1,dd||1,hh||0,mm||0).toISOString(); 

}



async function swal<T = any>(opts: T) { 

  const Swal = (await import("sweetalert2")).default; 

  return Swal.fire(opts as any); 

}



async function swalToast(title: string, icon: "success" | "error" | "warning" | "info") {

  const Swal = (await import("sweetalert2")).default;

  const Toast = Swal.mixin({ toast: true, position: "top-end", showConfirmButton: false, timer: 2200, timerProgressBar: true });

  return Toast.fire({ icon, title });

}



async function swalConfirm(opts?: Partial<{ title: string; text?: string; confirmText?: string; confirmColor?: string; icon?: "warning"|"question" }>) {

  const Swal = (await import("sweetalert2")).default;

  return Swal.fire({

    title: opts?.title || "Are you sure?",

    text: opts?.text,

    icon: opts?.icon || "warning",

    showCancelButton: true,

    confirmButtonText: opts?.confirmText || "Yes",

    confirmButtonColor: opts?.confirmColor || "#2563eb",

    cancelButtonText: "Cancel",

    reverseButtons: true,

  });

}



function endTime(a: Appt) { 

  const start = new Date(a.appointment_time); 

  const dur = Math.max(0, a.duration_min ?? 60); 

  return new Date(start.getTime() + dur * 60000); 

}



function minutesBetween(a: Date, b: Date) { 

  return Math.round((b.getTime() - a.getTime()) / 60000); 

}



function isOverlap(a: Appt, b: Appt) { 

  const aS = new Date(a.appointment_time), aE = endTime(a), bS = new Date(b.appointment_time), bE = endTime(b); 

  return aS < bE && bS < aE; 

}



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

  return new Date(iso).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }); 

}



function fmtTime(iso: string) { 

  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); 

}



function toStatus(v: string): Appt["status"] {

  const allowed: Appt["status"][] = ["pending", "scheduled", "confirmed", "completed", "cancelled"];

  return (allowed.includes(v as any) ? v : "scheduled") as Appt["status"];

}



function toType(v: string): NonNullable<Appt["type"]> {

  const allowed: NonNullable<Appt["type"]>[] = ["therapy", "group", "medical", "family", "assessment"];

  return (allowed.includes(v as any) ? v : "therapy") as NonNullable<Appt["type"]>;

}



/* =============== Page =============== */



export default function AppointmentsPage() {

  const { isAuthenticated, loading, patient } = useAuth();

  const router = useRouter();

  const patientId = isAuthenticated ? patient?.id : null;



  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);

  const [items, setItems] = useState<Appt[]>([]);

  const [busy, setBusy] = useState(false);



  const [form, setForm] = useState({

    type: "" as NonNullable<Appt["type"]> | "",

    provider: "",

    staff_id: "" as string | "",

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



  const [openCreateCal, setOpenCreateCal] = useState(false);

  const [openEditCal, setOpenEditCal] = useState(false);



  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const [snoozes, setSnoozes] = useState<Record<string, string>>({});



  /* Function definitions */

  const loadAppointments = useCallback(async () => {

    if (!patientId) return;

    const { data, error } = await supabase

      .from("appointments").select("*")

      .eq("patient_id", patientId)

      .order("appointment_time", { ascending: true });
    
    // Note: staff_id column should be included if it exists in the appointments table

    if (!error) setItems((data as Appt[]) || []);

    else await swal({ icon: "error", title: "Failed to load", text: error.message });

  }, [patientId]);






  useEffect(() => { 

    if (!loading && !isAuthenticated) router.push("/login"); 

  }, [isAuthenticated, loading, router]);



  useEffect(() => {

    if (!patientId) return;

    void loadAppointments();

    const ch = supabase

      .channel(`appt_${patientId}`)

      .on("postgres_changes",

        { event: "*", schema: "public", table: "appointments", filter: `patient_id=eq.${patientId}` },

        () => { void loadAppointments(); }

      )

      .subscribe();

    return () => { void ch.unsubscribe(); };

  }, [patientId, loadAppointments]);



  useEffect(() => { 

    try { 

      const raw = localStorage.getItem("appt_alert_snoozes"); 

      if (raw) setSnoozes(JSON.parse(raw)); 

    } catch {} 

  }, []);

  

  useEffect(() => { 

    try { 

      localStorage.setItem("appt_alert_snoozes", JSON.stringify(snoozes)); 

    } catch {} 

  }, [snoozes]);



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



  /* Derived lists */

  const now = new Date();

  const upcoming = items.filter((a) => new Date(a.appointment_time) >= now && a.status !== "cancelled");

  const history = items.filter((a) => new Date(a.appointment_time) < now || a.status === "completed" || a.status === "cancelled");



  const thisWeekCount = items.filter((a) => {

    const d = new Date(a.appointment_time);

    const start = new Date(); 

    start.setHours(0,0,0,0);

    const day = start.getDay(); 

    const diff = (day === 0 ? -6 : 1) - day;

    start.setDate(start.getDate() + diff);

    const end = new Date(start); 

    end.setDate(start.getDate() + 7);

    return d >= start && d < end;

  }).length;

  

  const virtualCount = items.filter((a) => !!a.is_virtual).length;

  

  const attendancePct = (() => {

    const total = items.length || 1;

    const attended = items.filter((a) => a.status === "completed").length;

    return Math.round((attended / total) * 100);

  })();



  /* Smart checks */

  const sortedUpcoming = [...upcoming].sort((x,y)=>+new Date(x.appointment_time)-+new Date(y.appointment_time));



  let overlapPair: { a: Appt; b: Appt } | undefined;

  for (let i=0;i<sortedUpcoming.length && !overlapPair;i++){

    for (let j=i+1;j<sortedUpcoming.length;j++){

      if (isOverlap(sortedUpcoming[i], sortedUpcoming[j])) { 

        overlapPair = { a: sortedUpcoming[i], b: sortedUpcoming[j] }; 

        break; 

      }

      if (new Date(sortedUpcoming[j].appointment_time) >= endTime(sortedUpcoming[i])) break;

    }

  }



  const MIN_GAP = 10;

  let tightGap: { prev: Appt; next: Appt; gap: number } | undefined;

  for (let i=0;i<sortedUpcoming.length-1;i++){

    const prev = sortedUpcoming[i], next = sortedUpcoming[i+1];

    const gap = minutesBetween(endTime(prev), new Date(next.appointment_time));

    if (gap >= 0 && gap < MIN_GAP) { 

      tightGap = { prev, next, gap }; 

      break; 

    }

  }



  const pendingOld = sortedUpcoming.find(a => a.status === "pending" && new Date(a.created_at) < new Date(Date.now() - 48*3600*1000));



  const byDay = new Map<string, Appt[]>(); 

  sortedUpcoming.forEach(a => { 

    const k = new Date(a.appointment_time).toDateString(); 

    byDay.set(k, [...(byDay.get(k)||[]), a]); 

  });

  const heavyEntry = [...byDay.entries()].find(([,list]) => list.length > 3);



  const EARLY = 10, LATE = 15; 

  const nowTs = Date.now();

  const joinSoon = sortedUpcoming.find(a => a.is_virtual && ((new Date(a.appointment_time).getTime() - nowTs)/60000 <= EARLY) && ((nowTs - new Date(a.appointment_time).getTime())/60000 <= LATE));



  /* Build alert models */

  const alertModels: AlertModel[] = [];

  

  if (joinSoon) {

    alertModels.push({

      id: `join-${joinSoon.id}`, 

      variant: "default", 

      tone: "ok",

      title: `It's time to join "${joinSoon.title || "Virtual Appointment"}".`,

      desc: `${fmtDate(joinSoon.appointment_time)} at ${fmtTime(joinSoon.appointment_time)}.`,

      action: { kind: "join", apptId: joinSoon.id }

    });

  }

  

  if (overlapPair) {

    alertModels.push({

      id: `overlap-${overlapPair.a.id}-${overlapPair.b.id}`, 

      variant: "destructive", 

      tone: "warn",

      title: "You've got overlapping appointments.",

      desc: `"${overlapPair.a.title || "Appt"}" overlaps with "${overlapPair.b.title || "Appt"}". Review and reschedule.`,

      action: { kind: "edit", apptId: overlapPair.a.id }

    });

  }

  

  if (tightGap) {

    alertModels.push({

      id: `tightgap-${tightGap.prev.id}-${tightGap.next.id}`, 

      variant: "default", 

      tone: "warn",

      title: "Tight turnaround between sessions.",

      desc: `Only ${tightGap.gap} min between "${tightGap.prev.title || "Appt"}" and "${tightGap.next.title || "Appt"}". Consider padding.`,

      action: { kind: "edit", apptId: tightGap.next.id }

    });

  }

  

  if (pendingOld) {

    alertModels.push({

      id: `pending-${pendingOld.id}`, 

      variant: "default", 

      tone: "info",

      title: "Appointment request pending > 48h.",

      desc: `"${pendingOld.title || "Appointment"}" is still pending. Update status if confirmed.`,

      action: { kind: "scheduled", apptId: pendingOld.id }

    });

  }

  

  if (heavyEntry) {

    const [day, list] = heavyEntry;

    alertModels.push({

      id: `heavy-${day}`, 

      variant: "default", 

      tone: "info",

      title: "Packed day detected.",

      desc: `${list.length} sessions on ${day}. Consider moving one to reduce overload.`,

      action: { kind: "rebalance" }

    });

  }

  

  if (!sortedUpcoming.length) {

    alertModels.push({

      id: "noupcoming", 

      variant: "default", 

      tone: "info",

      title: "No upcoming appointments.", 

      desc: "Book your next session to stay on track.",

      action: { kind: "book" }

    });

  }



  /* Snooze/Dismiss */

  const nowIso = new Date().toISOString();

  

  function isVisible(id: string) { 

    if (dismissed.has(id)) return false; 

    const until = snoozes[id]; 

    return !until || until <= nowIso; 

  }

  

  function snooze(id: string, mins: number) { 

    const until = new Date(Date.now() + mins*60000).toISOString(); 

    setSnoozes(prev => ({ ...prev, [id]: until })); 

  }

  

  function dismiss(id: string) { 

    setDismissed(new Set([...dismissed, id])); 

  }



  /* CRUD */

  async function createAppt() {

    if (!form.type || !form.date || !form.time) { 

      await swal({ icon: "warning", title: "Missing info", text: "Type, Date and Time are required." }); 

      return; 

    }

    const selected = new Date(`${form.date}T${form.time}:00`);

    if (selected < new Date()) { 

      await swal({ icon: "info", title: "Pick a future time" }); 

      return; 

    }

    setBusy(true);

    try {

      const iso = toISO(form.date, form.time);

      const temp: Appt = {

        id: `temp-${(typeof crypto !== "undefined" && "randomUUID" in crypto) ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`,

        patient_id: patientId!,

        appointment_time: iso,

        status: "pending",

        title: form.title || "Appointment",

        provider: form.provider || null,

        duration_min: Number(form.duration) || null,

        type: form.type || null,

        location: form.isVirtual ? "Virtual Meeting" : (form.location || null),

        is_virtual: form.isVirtual,

        notes: form.notes || null,

        created_at: new Date().toISOString(),

        updated_at: new Date().toISOString(),

      };

      setItems((prev) => [...prev, temp].sort((a,b)=>+new Date(a.appointment_time)-+new Date(b.appointment_time)));



      const { data: appointmentData, error } = await supabase.from("appointments").insert({

        patient_id: patientId,

        appointment_time: iso,

        status: "pending",

        title: form.title || null,

        provider: form.provider || null,

        staff_id: form.staff_id || null, // Store selected staff user_id if available

        duration_min: Number(form.duration) || null,

        type: form.type || null,

        location: form.isVirtual ? "Virtual Meeting" : form.location || null,

        is_virtual: form.isVirtual,

        notes: form.notes || null,

      }).select("id").single();



      if (error) {

        await swal({ icon: "error", title: "Couldn't book", text: error.message });

        setItems((prev) => prev.filter((r) => r.id !== temp.id));

      } else {

        // Notify staff when patient creates appointment (async, don't block response)
        try {
          // Get session token for authentication
          const { data: { session } } = await supabase.auth.getSession();
          const authHeader = session?.access_token ? `Bearer ${session.access_token}` : '';
          
          const patientName = (patient as any)?.full_name || 
            [(patient as any)?.first_name, (patient as any)?.last_name].filter(Boolean).join(" ").trim() || 
            "Patient";
          
          const appointmentDate = new Date(iso).toLocaleDateString("en-US", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
          
          // Call API route to notify staff (runs async, won't block response)
          fetch('/api/appointments/notify-staff', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              ...(authHeader && { 'Authorization': authHeader })
            },
            body: JSON.stringify({
              appointmentId: appointmentData.id,
              patientId: patientId,
              patientName: patientName,
              appointmentDate: appointmentDate,
              appointmentType: form.type || undefined,
              provider: form.provider || undefined,
              staffId: form.staff_id || undefined, // Send staff_id for targeted notification
              isVirtual: form.isVirtual || false
            })
          }).catch((err) => {
            console.error("Failed to notify staff about appointment:", err);
          });
        } catch (error) {
          console.error("Error notifying staff about appointment:", error);
          // Don't fail the appointment creation if notification fails
        }

        await loadAppointments();

        setIsBookingOpen(false);

        setForm({ type: "", provider: "", staff_id: "", date: "", time: "", duration: "60", location: "", isVirtual: false, title: "", notes: "" });

        await swalToast("Appointment requested", "success");

      }

    } finally { 

      setBusy(false); 

    }

  }






  function openEdit(a: Appt) {

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

  }

  

  function openEditById(id?: string) { 

    const a = items.find(x => x.id === id); 

    if (a) openEdit(a); 

  }



  async function saveEdit() {

    if (!editForm.id || !editForm.type || !editForm.date || !editForm.time) { 

      await swal({ icon: "warning", title: "Fill required fields" }); 

      return; 

    }

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

      if (error) {

        await swal({ icon: "error", title: "Save failed", text: error.message });

      } else {

        setIsEditOpen(false);

        await loadAppointments();

        await swalToast("Appointment updated", "success");

      }

    } finally { 

      setBusy(false); 

    }

  }



  async function deleteAppt(id: string) {

    const ans = await swalConfirm({ 

      title: "Delete appointment?", 

      text: "This cannot be undone.", 

      confirmText: "Delete", 

      confirmColor: "#dc2626", 

      icon: "warning" 

    });

    if (!ans.isConfirmed) return;

    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        await swal({ icon: "error", title: "Session expired", text: "Please log in again." });
        router.push("/login");
        return;
      }

      const response = await fetch(`/api/patient/appointments/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete appointment");
      }

      await swalToast("Appointment deleted successfully", "success");
      await loadAppointments();
    } catch (err: any) {
      console.error("Error deleting appointment:", err);
      await swal({ icon: "error", title: "Delete failed", text: err.message || "Failed to delete appointment" });
    } finally {
      setBusy(false);
    }

  }

  async function completeAppointment(id: string) {
    const ans = await swalConfirm({ 
      title: "Mark as completed?", 
      text: "This will mark the appointment as completed.", 
      confirmText: "Complete", 
      confirmColor: "#10b981", 
      icon: "success" 
    });

    if (!ans.isConfirmed) return;

    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        await swal({ icon: "error", title: "Session expired", text: "Please log in again." });
        router.push("/login");
        return;
      }

      const response = await fetch(`/api/patient/appointments/${id}/complete`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to complete appointment");
      }

      await swalToast("Appointment marked as completed", "success");
      await loadAppointments();
    } catch (err: any) {
      console.error("Error completing appointment:", err);
      await swal({ icon: "error", title: "Update failed", text: err.message || "Failed to complete appointment" });
    } finally {
      setBusy(false);
    }
  }

  async function rescheduleAppointment(id: string, currentTime: string) {
    // Create a dialog for rescheduling
    const Swal = (await import("sweetalert2")).default;
    const { value: formValues } = await Swal.fire({
      title: "Reschedule Appointment",
      html: `
        <div style="text-align: left;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600;">New Date & Time</label>
          <input id="reschedule-date" type="date" class="swal2-input" style="margin-bottom: 10px;" required>
          <input id="reschedule-time" type="time" class="swal2-input" required>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Reschedule",
      confirmButtonColor: "#2563eb",
      preConfirm: () => {
        const date = (document.getElementById("reschedule-date") as HTMLInputElement)?.value;
        const time = (document.getElementById("reschedule-time") as HTMLInputElement)?.value;
        if (!date || !time) {
          Swal.showValidationMessage("Please select both date and time");
          return false;
        }
        const [year, month, day] = date.split('-');
        const [hours, minutes] = time.split(':');
        const appointmentTime = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hours),
          parseInt(minutes)
        ).toISOString();
        return appointmentTime;
      }
    });

    if (!formValues) return;

    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        await swal({ icon: "error", title: "Session expired", text: "Please log in again." });
        router.push("/login");
        return;
      }

      const response = await fetch(`/api/patient/appointments/${id}/reschedule`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ appointmentTime: formValues }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reschedule appointment");
      }

      await swalToast("Appointment rescheduled successfully", "success");
      await loadAppointments();
    } catch (err: any) {
      console.error("Error rescheduling appointment:", err);
      await swal({ icon: "error", title: "Reschedule failed", text: err.message || "Failed to reschedule appointment" });
    } finally {
      setBusy(false);
    }
  }



  async function updateStatus(id: string, status: Appt["status"]) {

    if (status === "cancelled") {

      const ans = await swalConfirm({ 

        title: "Cancel this appointment?", 

        confirmText: "Cancel appointment", 

        confirmColor: "#dc2626" 

      });

      if (!ans.isConfirmed) return;

    }

    const { error } = await supabase.from("appointments").update({ status }).eq("id", id).eq("patient_id", patientId);

    if (error) {

      await swal({ icon: "error", title: "Update failed", text: error.message });

    } else { 

      await loadAppointments(); 

      await swalToast(status === "cancelled" ? "Appointment cancelled" : "Status updated", "success"); 

    }

  }



  /* =================== UI =================== */



  return (

    <div className="min-h-screen bg-gray-50">

      <DashboardHeader patient={patient} />



      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">




        {/* Enhanced Header + Booking */}

        <div className="mb-8">

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

            <div className="flex items-center gap-4">

              <div className="relative">

                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-2xl shadow-lg">

                  <CalendarIcon className="h-8 w-8 text-white" />

                </div>

                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>

                      </div>

              <div>

                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">

                  Appointments

                </h1>

                <p className="text-gray-600 text-lg">Manage your therapy sessions and medical appointments</p>

                <div className="flex items-center gap-4 mt-2">

                  <span className="text-sm text-gray-500">

                    <Clock className="h-4 w-4 inline mr-1" />

                    {upcoming.length} upcoming

                  </span>

                  <span className="text-sm text-gray-500">

                    <CheckCircle className="h-4 w-4 inline mr-1" />

                    {attendancePct}% attendance rate

                  </span>

                </div>

              </div>

            </div>



            <div className="flex flex-col sm:flex-row gap-3">

              <button 
                type="button"
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3 rounded-md inline-flex items-center gap-2" 
                onClick={() => setIsBookingOpen(true)}
              >
                <Plus className="h-5 w-5" />
                Book Appointment
              </button>

              <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
                <DialogContent className="!bg-white max-w-2xl max-h-[90vh] overflow-y-auto">

                <DialogHeader className="pb-4 border-b">

                  <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">

                    <div className="bg-blue-100 p-2 rounded-lg">

                      <Plus className="h-5 w-5 text-blue-600" />

          </div>

                    Book New Appointment

                  </DialogTitle>

                  <p className="text-gray-600 mt-2">Schedule your next therapy session or medical appointment</p>

                </DialogHeader>

                <div className="space-y-6 py-4">

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    <div className="space-y-2">

                      <Label className="text-sm font-medium text-gray-700">Appointment Title</Label>

                      <Input 

                        value={form.title} 

                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} 

                        placeholder="e.g., Individual Therapy Session" 

                        className="!bg-white border border-white focus:border-blue-500 focus:ring-blue-500"

                      />

            </div>

                    <div className="space-y-2">

                      <Label className="text-sm font-medium text-gray-700">Appointment Type</Label>

                      <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: toType(v) }))}>

                        <SelectTrigger className="!bg-white border border-white focus:border-blue-500 focus:ring-blue-500">

                          <SelectValue placeholder="Select appointment type" />

                        </SelectTrigger>

                        <SelectContent>

                          {TYPES.map((t) => (

                            <SelectItem key={t} value={t} className="capitalize">

                              {t}

                            </SelectItem>

                          ))}

                        </SelectContent>

                      </Select>

                    </div>

                  </div>

                  <div className="space-y-2">

                    <Label className="text-sm font-medium text-gray-700">Healthcare Provider</Label>

                    <StaffSelector
                      value={form.staff_id}
                      onValueChange={(staffId) => {
                        // Find staff name for display
                        supabase
                          .from("staff")
                          .select("first_name, last_name, email")
                          .eq("user_id", staffId)
                          .single()
                          .then(({ data }) => {
                            if (data) {
                              const name = [data.first_name, data.last_name].filter(Boolean).join(" ").trim() || data.email?.split("@")[0] || "Staff";
                              setForm((f) => ({ ...f, staff_id: staffId, provider: name }));
                            }
                          });
                      }}
                      placeholder="Select a healthcare provider"
                    />

                  </div>



                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    <div className="space-y-2 relative">

                      <Label className="text-sm font-medium text-gray-700">Appointment Date</Label>

                      <Button 

                        type="button" 

                        variant="outline" 

                        className="!bg-white w-full justify-start h-10 border border-white hover:border-blue-500 focus:border-blue-500" 

                        onClick={() => setOpenCreateCal((s) => !s)}

                      >

                        <CalendarIcon className="h-4 w-4 mr-2" />

                        {form.date ? new Date(form.date).toLocaleDateString() : "Select a date"}

                      </Button>

                      {openCreateCal && (

                        <div className="absolute z-50 mt-2 rounded-2xl border border-gray-200 bg-white shadow-xl">

                          <DayPicker

                            mode="single"

                            selected={parseYmd(form.date)}

                            onSelect={(d) => { if (!d || d < todayStart) return; setForm((f) => ({ ...f, date: formatYmd(d) })); setOpenCreateCal(false); }}

                            disabled={{ before: todayStart }}

                            showOutsideDays

                            className="p-4"

                          />

                        </div>

                      )}

                    </div>

                    <div className="space-y-2">

                      <Label className="text-sm font-medium text-gray-700">Appointment Time</Label>

                      <Input 

                        type="time" 

                        value={form.time} 

                        onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} 

                        className="!bg-white h-10 border border-white focus:border-blue-500 focus:ring-blue-500"

                      />

                  </div>

                  </div>



                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    <div className="space-y-2">

                      <Label className="text-sm font-medium text-gray-700">Duration (minutes)</Label>

                      <Input 

                        type="number" 

                        min={5} 

                        value={form.duration} 

                        onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} 

                        className="!bg-white border border-white focus:border-blue-500 focus:ring-blue-500"

                        placeholder="60"

                      />

                  </div>

                    <div className="space-y-2">

                      <Label className="text-sm font-medium text-gray-700">Location</Label>

                      <Input 

                        value={form.location} 

                        onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} 

                        placeholder="Room 205 / Virtual Meeting" 

                        className="!bg-white border border-white focus:border-blue-500 focus:ring-blue-500"

                      />

                    </div>

                  </div>

                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">

                    <input 

                      id="isVirtual" 

                      type="checkbox" 

                      checked={form.isVirtual} 

                      onChange={(e) => setForm((f) => ({ ...f, isVirtual: e.target.checked }))} 

                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"

                    />

                    <Label htmlFor="isVirtual" className="text-sm font-medium text-gray-700 cursor-pointer">

                      Virtual Appointment (Online Meeting)

                    </Label>

                  </div>

                  <div className="space-y-2">

                    <Label className="text-sm font-medium text-gray-700">Additional Notes</Label>

                    <Textarea 

                      rows={3} 

                      value={form.notes} 

                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} 

                      placeholder="Any specific concerns, requests, or information you'd like to share with your provider..." 

                      className="!bg-white border border-white focus:border-blue-500 focus:ring-blue-500 resize-none"

                    />

                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">

                    <Button 

                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg" 

                      onClick={createAppt} 

                      disabled={busy || !form.type || !form.date || !form.time}

                    >

                      {busy ? (

                        <>

                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>

                          Booking...

                        </>

                      ) : (

                        <>

                          <Plus className="h-4 w-4 mr-2" />

                          Request Appointment

                        </>

                      )}

                    </Button>

                    <Button 

                      variant="outline" 

                      onClick={() => setIsBookingOpen(false)}

                      className="sm:w-auto border-gray-300 hover:border-gray-400"

                    >

                      Cancel

                    </Button>

                  </div>

                </div>

              </DialogContent>

            </Dialog>

          </div>

        </div>

        </div>



        {/* Enhanced Stats Cards */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-blue-50 to-blue-100">

            <CardContent className="p-6">

              <div className="flex items-center justify-between">

                <div className="space-y-1">

                  <div className="text-3xl font-bold text-blue-700 group-hover:scale-110 transition-transform duration-200">

                    {upcoming.length}

        </div>

                  <div className="text-sm font-medium text-blue-600">Upcoming</div>

                  <div className="text-xs text-blue-500">Appointments scheduled</div>

                </div>

                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-200">

                  <CalendarIcon className="h-6 w-6 text-white" />

                </div>

              </div>

            </CardContent>

          </Card>



          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-green-50 to-green-100">

            <CardContent className="p-6">

              <div className="flex items-center justify-between">

                <div className="space-y-1">

                  <div className="text-3xl font-bold text-green-700 group-hover:scale-110 transition-transform duration-200">

                    {thisWeekCount}

                  </div>

                  <div className="text-sm font-medium text-green-600">This Week</div>

                  <div className="text-xs text-green-500">Sessions planned</div>

                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-200">

                  <Clock className="h-6 w-6 text-white" />

                </div>

              </div>

            </CardContent>

          </Card>



          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-purple-50 to-purple-100">

            <CardContent className="p-6">

              <div className="flex items-center justify-between">

                <div className="space-y-1">

                  <div className="text-3xl font-bold text-purple-700 group-hover:scale-110 transition-transform duration-200">

                    {virtualCount}

                  </div>

                  <div className="text-sm font-medium text-purple-600">Virtual</div>

                  <div className="text-xs text-purple-500">Online sessions</div>

                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-200">

                  <Video className="h-6 w-6 text-white" />

                </div>

              </div>

            </CardContent>

          </Card>



          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-amber-50 to-amber-100">

            <CardContent className="p-6">

              <div className="flex items-center justify-between">

                <div className="space-y-1">

                  <div className="text-3xl font-bold text-amber-700 group-hover:scale-110 transition-transform duration-200">

                    {attendancePct}%

                  </div>

                  <div className="text-sm font-medium text-amber-600">Attendance</div>

                  <div className="text-xs text-amber-500">Success rate</div>

                </div>

                <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-200">

                  <CheckCircle className="h-6 w-6 text-white" />

                </div>

              </div>

            </CardContent>

          </Card>

        </div>



        <Tabs defaultValue="upcoming" className="space-y-6">

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

            <TabsList className="grid w-full sm:w-auto grid-cols-2 bg-gray-100 p-1 rounded-xl">

              <TabsTrigger value="upcoming" className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-medium">

                Upcoming Appointments

              </TabsTrigger>

              <TabsTrigger value="history" className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-medium">

                Appointment History

              </TabsTrigger>

          </TabsList>

            <div className="flex items-center gap-2 text-sm text-gray-500">

              <CalendarIcon className="h-4 w-4" />

              <span>Total: {items.length} appointments</span>

            </div>

          </div>



          {/* Enhanced Upcoming Appointments */}

          <TabsContent value="upcoming" className="space-y-6">

            <div className="space-y-4">

              {upcoming.map((a) => {

                const StatusIcon = getStatusIcon(a.status);

                const isToday = new Date(a.appointment_time).toDateString() === new Date().toDateString();

                const isTomorrow = new Date(a.appointment_time).toDateString() === new Date(Date.now() + 86400000).toDateString();

                return (

                  <Card key={a.id} className={`group hover:shadow-xl transition-all duration-300 border-l-4 ${

                    a.status === "confirmed" ? "border-l-green-500" : 

                    a.status === "pending" ? "border-l-yellow-500" : 

                    a.status === "cancelled" ? "border-l-red-500" : "border-l-blue-500"

                  } ${isToday ? "ring-2 ring-blue-200 bg-blue-50/50" : ""}`}>

                    <CardContent className="p-6">

                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">

                        <div className="flex-1 space-y-4">

                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">

                            <div className="space-y-2">

                              <div className="flex items-center gap-3 flex-wrap">

                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">

                                  {a.title || "Appointment"}

                                </h3>

                                {isToday && (

                                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 animate-pulse">

                                    Today

                                  </Badge>

                                )}

                                {isTomorrow && (

                                  <Badge className="bg-green-100 text-green-700 border-green-200">

                                    Tomorrow

                                  </Badge>

                                )}

                          </div>

                              <div className="flex items-center gap-2 flex-wrap">

                                <Badge className={`${getTypeColor(a.type || undefined)} font-medium`}>

                                  {a.type || "other"}

                                </Badge>

                                <Badge variant="outline" className={`${getStatusColor(a.status)} font-medium`}>

                                  <StatusIcon className="h-3 w-3 mr-1" />

                                  {a.status}

                                </Badge>

                          </div>

                            </div>

                        </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">

                              <div className="bg-blue-100 p-2 rounded-lg">

                                <User className="h-4 w-4 text-blue-600" />

                              </div>

                              <div className="flex-1">

                                <div className="flex items-center gap-2">
                                  <div className="text-sm font-medium text-gray-900">{a.provider || "TBD"}</div>
                                  {(() => {
                                    // Try to find staff_id from the appointment if stored
                                    const staffId = (a as any).staff_id;
                                    return staffId ? (
                                      <StaffVerificationBadge staffId={staffId} showCount={false} showRating={true} />
                                    ) : null;
                                  })()}
                                </div>

                                <div className="text-xs text-gray-500">Provider</div>

                              </div>

                            </div>

                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">

                              <div className="bg-green-100 p-2 rounded-lg">

                                <CalendarIcon className="h-4 w-4 text-green-600" />

                              </div>

                              <div>

                                <div className="text-sm font-medium text-gray-900">{fmtDate(a.appointment_time)}</div>

                                <div className="text-xs text-gray-500">Date</div>

                              </div>

                            </div>

                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">

                              <div className="bg-purple-100 p-2 rounded-lg">

                                <Clock className="h-4 w-4 text-purple-600" />

                              </div>

                              <div>

                                <div className="text-sm font-medium text-gray-900">{fmtTime(a.appointment_time)}</div>

                                <div className="text-xs text-gray-500">{a.duration_min ?? 60} minutes</div>

                              </div>

                            </div>

                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">

                              <div className={`p-2 rounded-lg ${a.is_virtual ? "bg-purple-100" : "bg-orange-100"}`}>

                                {a.is_virtual ? <Video className="h-4 w-4 text-purple-600" /> : <MapPin className="h-4 w-4 text-orange-600" />}

                              </div>

                              <div>

                                <div className="text-sm font-medium text-gray-900">

                                  {a.location || (a.is_virtual ? "Virtual Meeting" : "TBD")}

                                </div>

                                <div className="text-xs text-gray-500">{a.is_virtual ? "Online" : "In-person"}</div>

                              </div>

                            </div>

                          </div>

                          {a.notes && (

                            <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border-l-4 border-gray-300">

                              <p className="text-sm text-gray-700 italic">"{a.notes}"</p>

                            </div>

                          )}

                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 lg:flex-col">

                          {a.is_virtual && (

                            <Button size="sm" className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg" onClick={()=>swalToast("Open your meeting link", "info")}>

                              <Video className="h-4 w-4 mr-2" />Join Meeting

                            </Button>

                          )}

                          {a.status !== "completed" && (
                            <Button 
                              size="sm" 
                              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg" 
                              onClick={() => completeAppointment(a.id)}
                              disabled={busy}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />Complete
                            </Button>
                          )}

                          <div className="flex gap-1">

                            <Button size="sm" variant="outline" onClick={() => rescheduleAppointment(a.id, a.appointment_time)} className="hover:bg-blue-50 hover:text-blue-600" disabled={busy} title="Reschedule">

                              <Clock className="h-4 w-4" />

                            </Button>

                            <Button size="sm" variant="outline" onClick={() => openEdit(a)} className="hover:bg-blue-50 hover:text-blue-600" disabled={busy} title="Edit">

                              <Edit className="h-4 w-4" />

                            </Button>

                            <Button size="sm" variant="outline" onClick={() => updateStatus(a.id, "cancelled")} className="hover:bg-yellow-50 hover:text-yellow-600" disabled={busy} title="Cancel">

                              <XCircle className="h-4 w-4" />

                            </Button>

                            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => deleteAppt(a.id)} disabled={busy} title="Delete">

                              <Trash2 className="h-4 w-4" />

                            </Button>

                          </div>

                        </div>

                      </div>

                    </CardContent>

                  </Card>

                );

              })}

              {upcoming.length === 0 && (

                <div className="text-center py-12">

                  <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">

                    <CalendarIcon className="h-8 w-8 text-gray-400" />

                  </div>

                  <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming appointments</h3>

                  <p className="text-gray-500 mb-4">Schedule your next session to stay on track with your treatment plan.</p>

                  <button 
                    type="button"
                    onClick={() => setIsBookingOpen(true)} 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md inline-flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Book Appointment
                  </button>

                </div>

              )}

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

                            <Badge variant="outline" className={getStatusColor(a.status)}><StatusIcon className="h-3 w-3 mr-1" />{a.status}</Badge>

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

        <DialogContent className="!bg-white max-w-md">

          <DialogHeader><DialogTitle>Edit / Reschedule</DialogTitle></DialogHeader>

          <div className="space-y-4">

            <div className="space-y-2"><Label>Title</Label><Input value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} className="!bg-white" /></div>

            <div className="space-y-2">

              <Label>Type</Label>

              <Select value={editForm.type} onValueChange={(v) => setEditForm((f) => ({ ...f, type: toType(v) }))}>

                <SelectTrigger className="!bg-white"><SelectValue placeholder="Select type" /></SelectTrigger>

                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>

              </Select>

            </div>

            <div className="space-y-2"><Label>Provider</Label><Input value={editForm.provider} onChange={(e) => setEditForm((f) => ({ ...f, provider: e.target.value }))} className="!bg-white" /></div>



            <div className="grid grid-cols-2 gap-3">

              <div className="space-y-2 relative">

                <Label>Date</Label>

                <Button type="button" variant="outline" className="bg-white w-full justify-start" onClick={() => setOpenEditCal((s) => !s)}>

                  <CalendarIcon className="h-4 w-4 mr-2" />

                  {editForm.date ? new Date(editForm.date).toLocaleDateString() : "Pick a date"}

                </Button>

                {openEditCal && (

                  <div className="absolute z-50 mt-2 rounded-2xl border bg-white shadow-lg">

                    <DayPicker

                      mode="single"

                      selected={parseYmd(editForm.date)}

                      onSelect={(d) => { if (!d || d < todayStart) return; setEditForm((f) => ({ ...f, date: formatYmd(d) })); setOpenEditCal(false); }}

                      disabled={{ before: todayStart }}

                      showOutsideDays

                    />

                  </div>

                )}

              </div>



              <div className="space-y-2"><Label>Time</Label><Input type="time" value={editForm.time} onChange={(e) => setEditForm((f) => ({ ...f, time: e.target.value }))} className="!bg-white" /></div>

            </div>



            <div className="grid grid-cols-2 gap-3">

              <div className="space-y-2"><Label>Duration (min)</Label><Input type="number" min={5} value={editForm.duration} onChange={(e) => setEditForm((f) => ({ ...f, duration: e.target.value }))} className="!bg-white" /></div>

              <div className="space-y-2"><Label>Location</Label><Input value={editForm.location} onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))} className="!bg-white" /></div>

            </div>

            <div className="flex items-center gap-2"><input id="edit_isVirtual" type="checkbox" checked={editForm.isVirtual} onChange={(e) => setEditForm((f) => ({ ...f, isVirtual: e.target.checked }))} /><Label htmlFor="edit_isVirtual">Virtual</Label></div>

            <div className="space-y-2">

              <Label>Status</Label>

              <Select value={editForm.status} onValueChange={(v) => setEditForm((f) => ({ ...f, status: toStatus(v) }))}>

                <SelectTrigger className="!bg-white"><SelectValue placeholder="Select status" /></SelectTrigger>

                <SelectContent>{["pending","scheduled","confirmed","completed","cancelled"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>

              </Select>

            </div>

            <div className="space-y-2"><Label>Notes</Label><Textarea rows={3} value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} className="!bg-white" /></div>

            <div className="flex gap-3 pt-4"><Button className="flex-1" onClick={saveEdit} disabled={busy || !editForm.id || !editForm.type || !editForm.date || !editForm.time}>Save</Button><Button variant="outline" onClick={() => setIsEditOpen(false)}>Close</Button></div>

          </div>

        </DialogContent>

      </Dialog>

    </div>

  );

}


