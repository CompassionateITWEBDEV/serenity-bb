// app/staff/patients/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Home, Search, Filter, UserRound, Users2, Stethoscope, Syringe, Phone, Clock,
  ChevronRight, BadgeCheck, AlertCircle, MessageSquare, Bell, Settings, TestTube2
} from "lucide-react";

/* Figma teal tokens */
const FIGMA = {
  primary: "#2AD1C8",
  primary700: "#16B5AC",
  primary50: "#E6FAF8",
  primary100: "#CCF6F2",
  accentBlue50: "#EEF6FF",
  ink: "#0F172A",
  gray500: "#64748B",
  gray400: "#94A3B8",
  gray100: "#F1F5F9",
};

/* SweetAlert */
async function serenitySwal(opts: { title: string; text?: string; mood: "success"|"error"|"info" }) {
  const Swal = (await import("sweetalert2")).default;
  const bg =
    opts.mood === "success"
      ? `linear-gradient(135deg, ${FIGMA.primary50}, #F2FBFA)`
      : opts.mood === "error"
      ? "linear-gradient(135deg,#FFF1F2,#FEE2E2)"
      : `linear-gradient(135deg, ${FIGMA.accentBlue50}, ${FIGMA.primary50})`;
  const emoji = opts.mood === "success" ? "💙✨" : opts.mood === "error" ? "⚠️" : "ℹ️😊";
  return Swal.fire({
    title: opts.title,
    text: opts.text,
    icon: undefined,
    iconHtml: `<div style="font-size:28px">${emoji}</div>`,
    background: "#fff",
    color: FIGMA.ink,
    backdrop: bg,
    confirmButtonColor: FIGMA.primary,
    customClass: { popup: "rounded-2xl", confirmButton: "rounded-xl" },
    timer: opts.mood === "success" ? 1300 : undefined,
  });
}

type VisitStatus = "today" | "upcoming" | "overdue";
type DBPatient = {
  user_id: string; full_name: string | null; first_name: string | null; last_name: string | null; phone_number: string | null; created_at?: string;
};
type DBAppointment = {
  id: string; patient_id: string; appointment_time: string;
  status: "scheduled"|"confirmed"|"pending"|"cancelled"|"completed";
  provider: string | null; type: string | null;
};
/* Drug Tests */
type DBDrugTest = {
  id: string;
  patient_id: string;
  status: "pending" | "completed" | "missed";
  scheduled_for: string | null;
};

type Row = {
  id: string; name: string; phone?: string;
  next?: { at: string; provider?: string | null; status: DBAppointment["status"]; type?: string | null };
  status: VisitStatus;
  test?: { status: DBDrugTest["status"]; at?: string | null };
  hasPendingTest: boolean;
};

const fmtTime = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—");
const isToday = (iso: string) => { const d = new Date(iso); const n = new Date(); return d.getFullYear()===n.getFullYear() && d.getMonth()===n.getMonth() && d.getDate()===n.getDate(); };
const toName = (p: DBPatient) => { const n = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(); return n || p.full_name || "Unknown"; };

function VisitChip({ s }: { s: VisitStatus }) {
  const style = s==="today"
    ? { bg: FIGMA.primary50, color: FIGMA.primary700, bd: FIGMA.primary }
    : s==="upcoming"
    ? { bg: FIGMA.accentBlue50, color: "#2563EB", bd: "#93C5FD" }
    : { bg: "#FEF2F2", color: "#B91C1C", bd: "#FCA5A5" };
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border"
      style={{ background: style.bg, color: style.color, borderColor: style.bd }}>
      <Clock className="h-3.5 w-3.5" />{s==="today"?"Today":s==="upcoming"?"Upcoming":"Overdue"}
    </span>
  );
}

function TestChip({ status, at }: { status: DBDrugTest["status"]; at?: string | null }) {
  const map = {
    pending: { bg: FIGMA.primary50, bd: FIGMA.primary, color: FIGMA.primary700, label: `Pending${at ? ` • ${fmtTime(at)}` : ""}` },
    completed: { bg: "#ECFDF5", bd: "#A7F3D0", color: "#065F46", label: "Completed" },
    missed: { bg: "#FEF2F2", bd: "#FCA5A5", color: "#991B1B", label: "Missed" },
  } as const;
  const s = map[status];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border"
      style={{ background: s.bg, borderColor: s.bd, color: s.color }}>
      <TestTube2 className="h-3.5 w-3.5" />
      Drug test: {s.label}
    </span>
  );
}

function CardDetailed({ r }: { r: Row }) {
  return (
    <Link href={`/staff/patient/${r.id}`} className="block rounded-2xl border bg-white p-4 relative hover:shadow-sm">
      <div className="absolute right-0 top-2 bottom-2 w-1.5 rounded-l-full" style={{ background: FIGMA.primary }} />
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full grid place-items-center" style={{ background: FIGMA.primary100 }}>
            <Users2 className="h-5 w-5" style={{ color: FIGMA.primary700 }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="font-semibold text-slate-900">{r.name}</div>
              <VisitChip s={r.status} />
            </div>
            <div className="text-xs mt-0.5" style={{ color: FIGMA.gray500 }}>{r.phone || "—"}</div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="flex items-center gap-2" style={{ color: FIGMA.gray500 }}>
                <BadgeCheck className="h-4 w-4" style={{ color: FIGMA.primary700 }} />
                {r.next?.type ?? "—"}
              </div>
              <div className="flex items-center gap-2" style={{ color: FIGMA.gray500 }}>
                <Stethoscope className="h-4 w-4" style={{ color: FIGMA.primary700 }} />
                {r.next?.provider ?? "—"}
              </div>
              <div className="flex items-center gap-2" style={{ color: FIGMA.gray500 }}>
                <Syringe className="h-4 w-4" style={{ color: FIGMA.primary700 }} />
                {r.next ? fmtTime(r.next.at) : "—"}
              </div>
              <div className="flex items-center gap-2" style={{ color: FIGMA.gray500 }}>
                <Phone className="h-4 w-4" style={{ color: FIGMA.primary700 }} />
                {r.phone ?? "—"}
              </div>
              {/* Drug test line */}
              {r.test ? (
                <div className="sm:col-span-2">
                  <TestChip status={r.test.status} at={r.test.at} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs" style={{ color: FIGMA.gray400 }}>
            {r.next ? (isToday(r.next.at) ? `Today • ${fmtTime(r.next.at)}` : new Date(r.next.at).toLocaleDateString()) : "—"}
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" size="icon" className="h-8 w-8"><MessageSquare className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" className="h-8 w-8"><AlertCircle className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" className="h-8 w-8"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </Link>
  );
}

function RowSummary({ r }: { r: Row }) {
  return (
    <Link href={`/staff/patient/${r.id}`} className="flex items-center justify-between rounded-xl border bg-white px-3 py-2 hover:bg-slate-50">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full grid place-items-center" style={{ background: FIGMA.primary100 }}>
          <UserRound className="h-4 w-4" style={{ color: FIGMA.primary700 }} />
        </div>
        <div>
          <div className="text-sm font-medium">{r.name}</div>
          <div className="text-xs flex items-center gap-2" style={{ color: FIGMA.gray500 }}>
            {r.next?.provider ?? "—"}
            {r.hasPendingTest && (
              <span className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded-full text-[10px] border"
                style={{ background: FIGMA.primary50, color: FIGMA.primary700, borderColor: FIGMA.primary }}>
                <TestTube2 className="h-3 w-3" /> Test pending
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <VisitChip s={r.status} />
        <ChevronRight className="h-4 w-4" style={{ color: FIGMA.gray400 }} />
      </div>
    </Link>
  );
}

export default function StaffPatientsListPage() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"detailed" | "summary">("detailed");
  const [filterStatus, setFilterStatus] = useState<VisitStatus | "all">("all");
  const [filterOpen, setFilterOpen] = useState(false);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const unsubRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  async function load() {
    setLoading(true);
    try {
      const or = q.trim()
        ? `full_name.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`
        : undefined;

      let pQuery = supabase
        .from("patients")
        .select("user_id,full_name,first_name,last_name,phone_number,created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (or) pQuery = pQuery.or(or);

      const { data: patients, error: pErr } = await pQuery;
      if (pErr) throw pErr;

      const ids = (patients ?? []).map(p => p.user_id);
      if (ids.length === 0) { setRows([]); return; }

      /* appointments */
      const fromIso = new Date(Date.now() - 7*24*3600*1000).toISOString();
      const { data: appts, error: aErr } = await supabase
        .from("appointments")
        .select("id,patient_id,appointment_time,status,provider,type")
        .in("patient_id", ids)
        .neq("status", "cancelled")
        .gte("appointment_time", fromIso)
        .order("appointment_time", { ascending: true });
      if (aErr) throw aErr;

      /* drug tests (last 30d + upcoming) */
      const testsFrom = new Date(Date.now() - 30*24*3600*1000).toISOString();
      const { data: tests, error: tErr } = await supabase
        .from("drug_tests")
        .select("id,patient_id,status,scheduled_for")
        .in("patient_id", ids)
        .gte("scheduled_for", testsFrom)
        .order("scheduled_for", { ascending: true });
      if (tErr) throw tErr;

      const byPatientAppt = new Map<string, DBAppointment[]>();
      (appts || []).forEach(a => byPatientAppt.set(a.patient_id, [...(byPatientAppt.get(a.patient_id)||[]), a]));

      const byPatientTest = new Map<string, DBDrugTest[]>();
      (tests || []).forEach(t => byPatientTest.set(t.patient_id, [...(byPatientTest.get(t.patient_id)||[]), t]));

      const merged: Row[] = (patients ?? []).map((p: DBPatient) => {
        const apptList = (byPatientAppt.get(p.user_id) || []).sort((a,b)=>+new Date(a.appointment_time)-+new Date(b.appointment_time));
        const now = new Date();
        const future = apptList.find(a => new Date(a.appointment_time) >= now);
        const pastPending = apptList.filter(a => new Date(a.appointment_time) < now).reverse()
          .find(a => a.status === "pending" || a.status === "scheduled" || a.status === "confirmed");
        const next = future ? { at: future.appointment_time, provider: future.provider, status: future.status, type: future.type } : undefined;

        let visitStatus: VisitStatus = "upcoming";
        if (next && isToday(next.at)) visitStatus = "today";
        if (!next && pastPending) visitStatus = "overdue";

        const tList = (byPatientTest.get(p.user_id) || []).sort((a,b)=>+new Date(a.scheduled_for || 0)-+new Date(b.scheduled_for || 0));
        const pending = tList.find(t => t.status === "pending");
        const lastOrNextTest = pending || tList.at(-1);
        const test = lastOrNextTest ? { status: lastOrNextTest.status, at: lastOrNextTest.scheduled_for } : undefined;

        return {
          id: p.user_id,
          name: toName(p),
          phone: p.phone_number ?? undefined,
          next,
          status: visitStatus,
          test,
          hasPendingTest: !!pending,
        };
      });

      setRows(merged);
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [q]);

  useEffect(() => {
    if (unsubRef.current) { void unsubRef.current.unsubscribe(); unsubRef.current = null; }
    const ch = supabase
      .channel("staff_patients_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "patients" }, () => { void load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => { void load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "drug_tests" }, () => { void load(); }) // live on tests too
      .subscribe();
    unsubRef.current = ch;
    return () => { if (unsubRef.current) void unsubRef.current.unsubscribe(); };
  }, []);

  const filtered = useMemo(() => rows.filter(r => filterStatus === "all" ? true : r.status === filterStatus), [rows, filterStatus]);

  async function onNewGroup() {
    const Swal = (await import("sweetalert2")).default;
    const r = await Swal.fire({
      title: "New Patient Group 💙",
      input: "text",
      inputPlaceholder: "Group name",
      confirmButtonColor: FIGMA.primary,
      showCancelButton: true,
    });
    if (r.isConfirmed && r.value) await serenitySwal({ title: "Group created", text: `"${r.value}" is ready.`, mood: "success" });
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: FIGMA.gray100 }}>
      {/* Toolbar */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {[Home, Users2, Stethoscope, Bell, Settings].map((Icon, i) => (
                <Button key={i} variant="ghost" size="icon" className="h-9 w-9">
                  <Icon className="h-5 w-5" style={{ color: FIGMA.primary700 }} />
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: FIGMA.gray400 }} />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name / provider" className="pl-8 h-9 w-56 rounded-full" />
              </div>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => setFilterOpen(true)}>
                <Filter className="h-5 w-5" style={{ color: FIGMA.primary700 }} />
              </Button>
              <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader><DialogTitle>Filters</DialogTitle></DialogHeader>
                  <div className="mt-2 space-y-3">
                    <div className="text-sm" style={{ color: FIGMA.gray500 }}>Visit status</div>
                    <div className="flex flex-wrap gap-2">
                      {(["all","today","upcoming","overdue"] as const).map(k => {
                        const active = filterStatus===k;
                        return (
                          <button key={k} onClick={() => setFilterStatus(k as any)} className="px-3 py-1.5 rounded-full border text-sm"
                            style={{ background: active ? FIGMA.primary : "#fff", color: active ? "#fff" : FIGMA.ink, borderColor: active ? FIGMA.primary : FIGMA.gray100 }}>
                            {k === "all" ? "All" : k.charAt(0).toUpperCase()+k.slice(1)}
                          </button>
                        );
                      })}
                    </div>
                    <div className="pt-2">
                      <Button onClick={()=>setFilterOpen(false)} className="w-full" style={{ background: FIGMA.primary }}>Apply</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="text-slate-800"><div className="text-sm">Patient ({filtered.length}{loading ? "…" : ""})</div></div>
          <button onClick={onNewGroup} className="text-sm font-medium" style={{ color: FIGMA.primary700 }}>New Patient Group</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 pt-2">
        <Tabs value={tab} onValueChange={(v)=>setTab(v as any)} className="w-full">
          <TabsList className="bg-transparent p-0 gap-2">
            <TabsTrigger value="detailed" className="rounded-full data-[state=active]:text-white" style={{ background: tab==="detailed" ? FIGMA.primary : "transparent", color: tab==="detailed" ? "#fff" : FIGMA.ink }}>Detailed</TabsTrigger>
            <TabsTrigger value="summary" className="rounded-full data-[state=active]:text-white" style={{ background: tab==="summary" ? FIGMA.primary : "transparent", color: tab==="summary" ? "#fff" : FIGMA.ink }}>Summary</TabsTrigger>
          </TabsList>
          <TabsContent value="detailed" className="mt-3">
            <div className="grid gap-3">
              {filtered.map((r)=> <CardDetailed key={r.id} r={r} />)}
              {(!loading && filtered.length===0) && <Card><CardContent className="p-8 text-center text-sm" style={{ color: FIGMA.gray500 }}>No patients match your filters.</CardContent></Card>}
            </div>
          </TabsContent>
          <TabsContent value="summary" className="mt-3">
            <div className="grid gap-2">
              {filtered.map((r)=> <RowSummary key={r.id} r={r} />)}
              {(!loading && filtered.length===0) && <Card><CardContent className="p-8 text-center text-sm" style={{ color: FIGMA.gray500 }}>No patients match your filters.</CardContent></Card>}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom Nav */}
      <nav className="md:hidden fixed bottom-4 left-0 right-0">
        <div className="mx-auto w-72 rounded-2xl bg-white shadow-lg border flex items-center justify-around py-2">
          <Link href="#" className="p-2" style={{ color: FIGMA.gray500 }}>💬</Link>
          <Link href="#" className="p-2" style={{ color: FIGMA.gray500 }}>📋</Link>
          <button className="p-2 rounded-full text-white" aria-label="Home" style={{ background: FIGMA.primary }}>🏠</button>
          <Link href="#" className="p-2" style={{ color: FIGMA.gray500 }}>🔔</Link>
          <Link href="#" className="p-2" style={{ color: FIGMA.gray500 }}>👤</Link>
        </div>
      </nav>
    </div>
  );
}
