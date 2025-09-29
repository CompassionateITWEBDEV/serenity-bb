"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Home, Search, Filter, UserRound, Users2, Stethoscope, Syringe, Phone, Clock,
  Plus, ChevronRight, BadgeCheck, AlertCircle, MessageSquare, Bell, Settings
} from "lucide-react";

/* ------------ Serenity SweetAlert helpers (blue) ------------ */
async function serenitySwal(opts: { title: string; text?: string; mood: "success"|"error"|"info" }) {
  const Swal = (await import("sweetalert2")).default;
  const theme =
    opts.mood === "success"
      ? { emoji: "💙✨", backdrop: "linear-gradient(135deg,#eff6ff,#e0e7ff)" }
      : opts.mood === "error"
      ? { emoji: "⚠️", backdrop: "linear-gradient(135deg,#fee2e2,#fecaca)" }
      : { emoji: "ℹ️😊", backdrop: "linear-gradient(135deg,#e0f2fe,#dbeafe)" };
  return Swal.fire({
    title: opts.title,
    text: opts.text,
    icon: undefined,
    iconHtml: `<div style="font-size:28px">${theme.emoji}</div>`,
    background: "#fff",
    color: "#0f172a",
    backdrop: theme.backdrop,
    confirmButtonColor: "#2563eb",
    customClass: { popup: "rounded-2xl", confirmButton: "rounded-xl" },
    timer: opts.mood === "success" ? 1300 : undefined,
  });
}

/* ---------------------- Types & Mock ---------------------- */
type Payer = "Medicare NGS" | "Medicare" | "Medicaid" | "Private";
type Discipline = "SN PT HHA" | "SN PT" | "SN PT MSW" | "SN" | "PT" | "OT";
type VisitStatus = "today" | "upcoming" | "overdue";

type PatientCard = {
  id: string;
  name: string;
  discipline: Discipline;
  mrn?: string;
  physician?: string;
  payer: Payer;
  phone?: string;
  status: VisitStatus;
  nextAt?: string; // time HH:MM
};

const INITIAL_PATIENTS: PatientCard[] = [
  {
    id: "p1",
    name: "Antonietta Keating",
    discipline: "SN PT HHA",
    mrn: "0098669233",
    physician: "Dr. Maria Gonzalez",
    payer: "Medicare NGS",
    status: "today",
    nextAt: "04:37 AM",
  },
  {
    id: "p2",
    name: "Brenda Sue Hinkle",
    discipline: "SN PT",
    payer: "Medicare",
    physician: "Dr. Joshua Lawrence",
    status: "today",
    nextAt: "04:37 AM",
  },
  {
    id: "p3",
    name: "Lamar Chaney",
    discipline: "SN PT MSW",
    phone: "8829739922",
    payer: "Medicaid",
    status: "upcoming",
    nextAt: "10:15 AM",
  },
];

/* ---------------------- Status chips ---------------------- */
function VisitChip({ s }: { s: VisitStatus }) {
  const map: Record<VisitStatus, { text: string; cls: string }> = {
    today: { text: "Today", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    upcoming: { text: "Upcoming", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    overdue: { text: "Overdue", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  };
  const m = map[s];
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${m.cls}`}><Clock className="h-3.5 w-3.5" />{m.text}</span>;
}

/* ---------------------- Card (Detailed) ---------------------- */
function PatientItem({ p }: { p: PatientCard }) {
  return (
    <div className="rounded-2xl border bg-white p-4 relative">
      {/* right edge accent */}
      <div className="absolute right-0 top-2 bottom-2 w-1.5 rounded-l-full bg-cyan-400/90" />
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-cyan-100 grid place-items-center">
            <Home className="h-5 w-5 text-cyan-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="font-semibold text-slate-900">{p.name}</div>
              <VisitChip s={p.status} />
            </div>
            <div className="text-xs text-slate-500 mt-0.5">{p.discipline}</div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <BadgeCheck className="h-4 w-4 text-cyan-600" />
                {p.mrn ?? "N/A"}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Stethoscope className="h-4 w-4 text-cyan-600" />
                {p.physician ?? "—"}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Syringe className="h-4 w-4 text-cyan-600" />
                {p.payer}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="h-4 w-4 text-cyan-600" />
                {p.phone ?? "—"}
              </div>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Today • {p.nextAt ?? "—"}</div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" size="icon" className="h-8 w-8"><MessageSquare className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" className="h-8 w-8"><AlertCircle className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" className="h-8 w-8"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------- Row (Summary) ---------------------- */
function PatientSummaryRow({ p }: { p: PatientCard }) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-white px-3 py-2">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-blue-100 grid place-items-center">
          <UserRound className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <div className="text-sm font-medium">{p.name}</div>
          <div className="text-xs text-slate-500">{p.discipline}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <VisitChip s={p.status} />
        <ChevronRight className="h-4 w-4 text-slate-400" />
      </div>
    </div>
  );
}

/* ---------------------- Page ---------------------- */
export default function StaffPatientsPage() {
  const [patients] = useState<PatientCard[]>(INITIAL_PATIENTS);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"detailed" | "summary">("detailed");
  const [openFilter, setOpenFilter] = useState(false);
  const [filterStatus, setFilterStatus] = useState<VisitStatus | "all">("all");

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return patients.filter((p) => {
      const okSearch = !term || p.name.toLowerCase().includes(term) || (p.physician ?? "").toLowerCase().includes(term);
      const okStatus = filterStatus === "all" || p.status === filterStatus;
      return okSearch && okStatus;
    });
  }, [patients, q, filterStatus]);

  async function onNewGroup() {
    const Swal = (await import("sweetalert2")).default;
    const r = await Swal.fire({
      title: "New Patient Group 💙",
      input: "text",
      inputPlaceholder: "Group name",
      confirmButtonColor: "#2563eb",
      showCancelButton: true,
    });
    if (r.isConfirmed && r.value) {
      await serenitySwal({ title: "Group created", text: `"${r.value}" is ready.`, mood: "success" });
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Top toolbar */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-9 w-9"><Home className="h-5 w-5 text-cyan-600" /></Button>
              <Button variant="ghost" size="icon" className="h-9 w-9"><Users2 className="h-5 w-5 text-cyan-600" /></Button>
              <Button variant="ghost" size="icon" className="h-9 w-9"><Stethoscope className="h-5 w-5 text-cyan-600" /></Button>
              <Button variant="ghost" size="icon" className="h-9 w-9"><Bell className="h-5 w-5 text-cyan-600" /></Button>
              <Button variant="ghost" size="icon" className="h-9 w-9"><Settings className="h-5 w-5 text-cyan-600" /></Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="pl-8 h-9 w-56 rounded-full bg-slate-50" />
              </div>

              <Sheet open={openFilter} onOpenChange={setOpenFilter}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full"><Filter className="h-5 w-5 text-cyan-600" /></Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-3">
                    <div className="text-sm text-slate-500">Visit status</div>
                    <div className="flex flex-wrap gap-2">
                      {(["all","today","upcoming","overdue"] as const).map(k => (
                        <button
                          key={k}
                          onClick={() => setFilterStatus(k as any)}
                          className={`px-3 py-1.5 rounded-full border text-sm ${filterStatus===k ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700"}`}
                        >
                          {k === "all" ? "All" : k.charAt(0).toUpperCase()+k.slice(1)}
                        </button>
                      ))}
                    </div>
                    <div className="pt-4">
                      <Button onClick={()=>setOpenFilter(false)} className="w-full">Apply</Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>

      {/* Header row */}
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="text-slate-800">
            <div className="text-sm">Patient ({list.length})</div>
          </div>
          <button onClick={onNewGroup} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            New Patient Group
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 pt-2">
        <Tabs value={tab} onValueChange={(v)=>setTab(v as any)} className="w-full">
          <TabsList className="bg-transparent p-0 gap-2">
            <TabsTrigger value="detailed" className={`rounded-full data-[state=active]:bg-blue-600 data-[state=active]:text-white`}>Detailed</TabsTrigger>
            <TabsTrigger value="summary" className={`rounded-full data-[state=active]:bg-blue-600 data-[state=active]:text-white`}>Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="detailed" className="mt-3">
            <div className="grid gap-3">
              {list.map((p)=> <PatientItem key={p.id} p={p} />)}
              {list.length===0 && <Card><CardContent className="p-8 text-center text-sm text-slate-500">No patients match your filters.</CardContent></Card>}
            </div>
          </TabsContent>

          <TabsContent value="summary" className="mt-3">
            <div className="grid gap-2">
              {list.map((p)=> <PatientSummaryRow key={p.id} p={p} />)}
              {list.length===0 && <Card><CardContent className="p-8 text-center text-sm text-slate-500">No patients match your filters.</CardContent></Card>}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom Nav (mobile) */}
      <nav className="md:hidden fixed bottom-4 left-0 right-0">
        <div className="mx-auto w-72 rounded-2xl bg-white shadow-lg border flex items-center justify-around py-2">
          <Link href="#" className="p-2 text-slate-600">💬</Link>
          <Link href="#" className="p-2 text-slate-600">📋</Link>
          <button className="p-2 rounded-full bg-blue-600 text-white" aria-label="Home">🏠</button>
          <Link href="#" className="p-2 text-slate-600">🔔</Link>
          <Link href="#" className="p-2 text-slate-600">👤</Link>
        </div>
      </nav>
    </div>
  );
}
