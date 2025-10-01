"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
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
  ShieldCheck,
  Activity,
  Search,
  Filter,
  Home as HomeIcon,
  TestTube2,
  MessageSquare,
  Users,
  Settings as SettingsIcon,
  Radio as RadioIcon,
  EyeOff,
  Bell,
} from "lucide-react";

import { supabase } from "@/lib/supabase-browser"; // ← auth session source
import type { DrugTest, TestStatus } from "@/lib/drug-tests";
import { createDrugTest, listDrugTests, subscribeDrugTests } from "@/lib/drug-tests";
import type { StaffPatient } from "@/lib/patients";
import { fetchPatients, subscribePatients } from "@/lib/patients";

const TEST_STATUS_META: Record<TestStatus, { label: string; cls: string }> = {
  completed: { label: "Completed", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  missed: { label: "Missed", cls: "text-rose-700 bg-rose-50 border-rose-200" },
  pending: { label: "Pending", cls: "text-amber-700 bg-amber-50 border-amber-200" },
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

  const [authed, setAuthed] = useState<boolean>(false);
  const [patients, setPatients] = useState<StaffPatient[]>([]);
  const [tests, setTests] = useState<DrugTest[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | TestStatus>("all");
  const [view, setView] = useState<View>("home");

  // SweetAlert wrapper
  async function sweetAlert(opts: { icon: "success" | "error" | "info" | "warning"; title: string; text?: string }) {
    const Swal = (await import("sweetalert2")).default;
    return Swal.fire({
      icon: opts.icon,
      title: opts.title,
      text: opts.text,
      confirmButtonColor: "#06b6d4",
      buttonsStyling: true,
    });
  }

  // Require auth before writes; show dialog + redirect if missing
  const ensureAuthed = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      await sweetAlert({
        icon: "error",
        title: "Sign in required",
        text: "Please sign in to create a drug test.",
      });
      router.push("/staff/login?redirect=/staff/dashboard");
      return false;
    }
    return true;
  }, [router]);

  // Track session (mount + changes)
  useEffect(() => {
    let unsub = supabase.auth.onAuthStateChange((_e, session) => setAuthed(!!session?.user));
    (async () => {
      const { data } = await supabase.auth.getUser();
      setAuthed(!!data?.user);
    })();
    return () => { unsub.data.subscription.unsubscribe(); };
  }, []);

  // initial load
  useEffect(() => {
    (async () => {
      const [p, t] = await Promise.all([fetchPatients(), listDrugTests({})]);
      setPatients(p);
      setTests(t);
    })();
  }, []);

  // realtime: re-fetch when either table changes
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

  async function refreshTests() {
    setTests(await listDrugTests({ q: query, status: filter === "all" ? undefined : filter }));
  }

  // Button on the "Tests" tab
  async function onCreateTest() {
    if (!(await ensureAuthed())) return;
    const m = patients[0];
    if (!m) {
      await sweetAlert({ icon: "error", title: "No patients available", text: "Add a patient before creating a test." });
      return;
    }
    try {
      await createDrugTest({ patientId: m.id, scheduledFor: null });
      await refreshTests();
      await sweetAlert({ icon: "success", title: "Test created", text: `A new test was created for ${m.name}.` });
    } catch (err: any) {
      await sweetAlert({ icon: "error", title: "Failed to create test", text: err?.message ?? "Please try again." });
      if (/not authenticated/i.test(String(err?.message))) {
        router.push("/staff/login?redirect=/staff/dashboard");
      }
    }
  }

  // Handler for the modal component (date/time aware)
  async function handleModalCreate(payload: { patientId: string; scheduledFor: string | null }) {
    if (!(await ensureAuthed())) return;
    try {
      await createDrugTest({ patientId: payload.patientId, scheduledFor: payload.scheduledFor });
      await refreshTests();
      const who = patients.find((p) => p.id === payload.patientId)?.name ?? "patient";
      const when = payload.scheduledFor ? fmtWhen(payload.scheduledFor) : "unscheduled";
      await sweetAlert({ icon: "success", title: "Test created", text: `${who} • ${when}` });
    } catch (err: any) {
      await sweetAlert({ icon: "error", title: "Failed to create test", text: err?.message ?? "Please try again." });
      if (/not authenticated/i.test(String(err?.message))) {
        router.push("/staff/login?redirect=/staff/dashboard");
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-cyan-100 grid place-items-center">
              <ShieldCheck className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Staff Console</h1>
              <p className="text-xs text-slate-500">Care operations at a glance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Activity className="h-3.5 w-3.5" /> Live
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Icon Row */}
        <div className="flex items-center gap-4">
          <IconPill size="lg" active={view === "home"} onClick={() => setView("home")} aria="Home">
            <HomeIcon className="h-6 w-6" />
          </IconPill>
          <IconPill size="lg" active={view === "tests"} onClick={() => setView("tests")} aria="Drug Tests">
            <TestTube2 className="h-6 w-6" />
          </IconPill>
          <IconPill size="lg" onClick={() => router.push("/staff/patient-inbox")} aria="Messages">
            <MessageSquare className="h-6 w-6" />
          </IconPill>
          <IconPill size="lg" onClick={() => router.push("/staff/broadcasts")} aria="Broadcasts">
            <RadioIcon className="h-6 w-6" />
          </IconPill>
          <IconPill size="lg" onClick={() => router.push("/staff/hidden-groups")} aria="Hidden Groups">
            <EyeOff className="h-6 w-6" />
          </IconPill>
          <IconPill size="lg" onClick={() => router.push("/staff/notifications")} aria="Notifications">
            <Bell className="h-6 w-6" />
          </IconPill>
          <IconPill size="lg" onClick={() => router.push("/clinician/dashboard")} aria="Clinicians">
            <Users className="h-6 w-6" />
          </IconPill>
          <IconPill size="lg" onClick={() => router.push("/staff/profile")} aria="Settings">
            <SettingsIcon className="h-6 w-6" />
          </IconPill>
        </div>

        {/* Search / Filter */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="pl-10 h-10 w-72 rounded-full"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-10 rounded-full px-4">
              <Filter className="h-5 w-5 mr-2 text-cyan-600" /> Filter
            </Button>
            <span className="text-sm text-slate-600">Patient ({patients.length})</span>
          </div>
        </div>

        {view === "home" && (
          <>
            <section>
              <h2 className="text-xl font-semibold tracking-tight">Random Drug Test Manager</h2>
              <Card className="mt-4 shadow-sm">
                <CardContent className="p-5">
                  <RandomDrugTestManager patients={patients} onCreate={handleModalCreate} />
                  {!authed && (
                    <p className="text-xs text-amber-700 mt-3">
                      You’re not signed in. Creating a test will prompt sign-in.
                    </p>
                  )}
                </CardContent>
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
              <Button onClick={onCreateTest} className="h-10 px-4 gap-2" disabled={!authed}>
                + New Test
              </Button>
            </div>
            <Card className="mt-4 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-cyan-100 grid place-items-center">
                      <TestTube2 className="h-5 w-5 text-cyan-700" />
                    </div>
                    <CardTitle className="text-base">Recent Tests</CardTitle>
                  </div>
                  <div className="flex gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search patient…"
                        className="pl-10 h-10 w-56"
                      />
                    </div>
                    <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
                      <SelectTrigger className="h-10 w-40"><SelectValue placeholder="Filter" /></SelectTrigger>
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
              <CardContent className="space-y-3 p-5">
                {filteredTests.length === 0 && <div className="text-sm text-slate-500 py-8 text-center">No tests yet.</div>}
                <ul className="grid gap-3">
                  {filteredTests.map((t) => (
                    <li key={t.id} className="rounded-xl border bg-white px-5 py-4 flex items-center justify-between">
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
            <div className="mt-4"><ProfileSettings /></div>
          </section>
        )}
      </main>

      <MobileDock />
    </div>
  );
}

/* --------- IconPill with size control --------- */
function IconPill({
  children,
  active,
  onClick,
  aria,
  size = "md",
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  aria: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeMap = {
    sm: "h-10 w-10 text-[20px]",
    md: "h-11 w-11 text-[22px]",
    lg: "h-12 w-12 text-[24px]",
  } as const;

  return (
    <button
      type="button"
      aria-label={aria}
      onClick={onClick}
      className={`${sizeMap[size]} rounded-full grid place-items-center transition
        ${active ? "bg-cyan-100 text-cyan-700 ring-2 ring-cyan-300"
                 : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
    >
      {children}
    </button>
  );
}
