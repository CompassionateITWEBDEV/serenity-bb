"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import RandomDrugTestManager from "@/components/staff/RandomDrugTestManager";
import IntakeQueue from "@/components/staff/IntakeQueue";
import MobileDock from "@/components/staff/MobileDock";
import ProfileSettings from "@/components/ProfileSettings";

import {
  ShieldCheck, Activity, Search, Filter, LogOut,
  Home as HomeIcon, TestTube2, MessageSquare, Users, Settings as SettingsIcon,
} from "lucide-react";

import type { DrugTest, TestStatus } from "@/lib/drug-tests";
import { createDrugTest, listDrugTests, subscribeDrugTests } from "@/lib/drug-tests";
import type { StaffPatient } from "@/lib/patients";
import { fetchPatients, subscribePatients } from "@/lib/patients";
import { logout } from "@/lib/staff";

const TEST_STATUS_META: Record<TestStatus, { label: string; cls: string }> = {
  completed: { label: "Completed", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  missed:    { label: "Missed",    cls: "text-rose-700 bg-rose-50 border-rose-200" },
  pending:   { label: "Pending",   cls: "text-amber-700 bg-amber-50 border-amber-200" },
};
function StatusChip({ status }: { status: TestStatus }) {
  const m = TEST_STATUS_META[status];
  return <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border ${m.cls}`}>{m.label}</span>;
}
const fmtWhen = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

type View = "home" | "tests" | "settings";

export default function StaffDashboardPage() {
  const router = useRouter();

  const [patients, setPatients] = useState<StaffPatient[]>([]);
  const [tests, setTests] = useState<DrugTest[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | TestStatus>("all");
  const [view, setView] = useState<View>("home");

  useEffect(() => {
    (async () => {
      const [p, t] = await Promise.all([fetchPatients(), listDrugTests({})]);
      setPatients(p);
      setTests(t);
    })();
  }, []);

  useEffect(() => {
    const offP = subscribePatients(async () => setPatients(await fetchPatients(query)));
    const offT = subscribeDrugTests(async () =>
      setTests(await listDrugTests({ q: query, status: filter === "all" ? undefined : filter }))
    );
    return () => { offP(); offT(); };
  }, [query, filter]);

  const filteredTests = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tests.filter((t) => {
      const bySearch = !q || t.patient.name.toLowerCase().includes(q) || (t.patient.email ?? "").toLowerCase().includes(q);
      const byStatus = filter === "all" || t.status === filter;
      return bySearch && byStatus;
    });
  }, [tests, query, filter]);

  async function onCreateTest() {
    const m = patients[0];
    if (!m) return;
    await createDrugTest({ patientId: m.id, scheduledFor: null });
    setTests(await listDrugTests({ q: query, status: filter === "all" ? undefined : filter }));
  }

  async function onLogout() {
    await logout();
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-cyan-100 grid place-items-center">
              <ShieldCheck className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Staff Console</h1>
              <p className="text-xs text-slate-500">Care operations at a glance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Activity className="h-3.5 w-3.5" /> Live
            </Badge>
            <Button variant="outline" size="sm" className="gap-1" onClick={onLogout}>
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Icon Row */}
        <div className="flex items-center gap-3">
          <IconPill active={view === "home"} onClick={() => setView("home")} aria="Home"><HomeIcon className="h-5 w-5" /></IconPill>
          <IconPill active={view === "tests"} onClick={() => setView("tests")} aria="Drug Tests"><TestTube2 className="h-5 w-5" /></IconPill>

          {/* Messages icon -> Patient Inbox page */}
          <IconPill onClick={() => router.push("/staff/patient-inbox")} aria="Patient Inbox">
            <MessageSquare className="h-5 w-5" />
          </IconPill>

          <IconPill onClick={() => router.push("/staff/patients")} aria="Patients"><Users className="h-5 w-5" /></IconPill>
          <IconPill active={view === "settings"} onClick={() => setView("settings")} aria="Settings"><SettingsIcon className="h-5 w-5" /></IconPill>
        </div>

        {/* Search / Filter */}
        <div className="flex items-center justify-between gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="pl-8 h-9 w-64 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-9 rounded-full"><Filter className="h-4 w-4 mr-1 text-cyan-600" /> Filter</Button>
            <span className="text-sm text-slate-600">Patient ({patients.length})</span>
          </div>
        </div>

        {view === "home" && (
          <>
            <section>
              <h2 className="text-xl font-semibold tracking-tight">Random Drug Test Manager</h2>
              <Card className="mt-3 shadow-sm">
                <CardContent className="p-4"><RandomDrugTestManager patients={patients} /></CardContent>
              </Card>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight">Real-Time Intake Queue</h2>
              <p className="text-xs text-slate-500 -mt-1">Monitor patient progress across intake roles</p>
              <IntakeQueue patients={patients} />
            </section>
          </>
        )}

        {view === "tests" && (
          <section>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight">Random Drug Test Manager</h2>
              <Button onClick={onCreateTest} className="gap-2">+ New Test</Button>
            </div>
            <Card className="mt-3 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-cyan-100 grid place-items-center">
                      <TestTube2 className="h-4 w-4 text-cyan-700" />
                    </div>
                    <CardTitle className="text-base">Recent Tests</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patient…" className="pl-8 h-9 w-48" />
                    </div>
                    <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
                      <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Filter" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="missed">Missed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredTests.length === 0 && <div className="text-sm text-slate-500 py-6 text-center">No tests yet.</div>}
                <ul className="grid gap-3">
                  {filteredTests.map((t) => (
                    <li key={t.id} className="rounded-xl border bg-white px-4 py-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{t.patient.name}</div>
                        <div className="text-xs text-slate-500">Scheduled: {fmtWhen(t.scheduledFor)}</div>
                      </div>
                      <StatusChip status={t.status} />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        )}

        {view === "settings" && (
          <section>
            <h2 className="text-xl font-semibold tracking-tight">Settings</h2>
            <div className="mt-3"><ProfileSettings /></div>
          </section>
        )}
      </main>

      <MobileDock />
    </div>
  );
}

function IconPill({
  children, active, onClick, aria,
}: { children: React.ReactNode; active?: boolean; onClick?: () => void; aria: string }) {
  return (
    <button
      type="button"
      aria-label={aria}
      onClick={onClick}
      className={`h-10 w-10 rounded-full grid place-items-center transition
        ${active ? "bg-cyan-100 text-cyan-700 ring-2 ring-cyan-300"
                 : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
    >
      {children}
    </button>
  );
}
