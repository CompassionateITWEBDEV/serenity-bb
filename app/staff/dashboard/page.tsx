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
import IncomingCallNotification from "@/components/call/IncomingCallNotification";

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
  UserCheck,
  Calendar,
  FileText,
  BarChart3,
  Video,
  Phone,
  Mail,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Plus,
  MoreHorizontal,
} from "lucide-react";

import type { DrugTest, TestStatus } from "@/lib/drug-tests";
import { createDrugTest, listDrugTests, subscribeDrugTests } from "@/lib/drug-tests";
import type { StaffPatient } from "@/lib/patients";
import { fetchPatients, subscribePatients } from "@/lib/patients";

// IMPORTANT: use the *singleton* client + ensureSession
import { supabase, ensureSession } from "@/lib/supabase-browser";

const TEST_STATUS_META: Record<TestStatus, { label: string; cls: string }> = {
  completed: { label: "Completed", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  missed: { label: "Missed", cls: "text-rose-700 bg-rose-50 border-rose-200" },
  pending: { label: "Pending", cls: "text-amber-700 bg-amber-50 border-amber-200" },
};

function StatusChip({ status }: { status: TestStatus }) {
  const m = TEST_STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border ${m.cls}`}>
      {m.label}
    </span>
  );
}

const fmtWhen = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

type View = "home" | "tests" | "settings";

export default function StaffDashboardPage() {
  const router = useRouter();

  // Gate all data work behind a ready flag
  const [ready, setReady] = useState(false);

  const [patients, setPatients] = useState<StaffPatient[]>([]);
  const [tests, setTests] = useState<DrugTest[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | TestStatus>("all");
  const [view, setView] = useState<View>("home");

  // Session guard: wait for hydrated session before proceeding
  useEffect(() => {
    let alive = true;

    (async () => {
      const session = await ensureSession();
      if (!alive) return;

      if (!session) {
        router.replace("/staff/login?redirect=/staff/dashboard");
        return;
      }

      setReady(true);
    })();

    // Redirect on explicit sign-out (avoid bouncing during normal nav)
    const { data: sub } = supabase.auth.onAuthStateChange((evt) => {
      if (evt === "SIGNED_OUT") router.replace("/staff/login");
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  // Initial load (only after ready)
  useEffect(() => {
    if (!ready) return;
    (async () => {
      const [p, t] = await Promise.all([fetchPatients(), listDrugTests({})]);
      setPatients(p);
      setTests(t);
    })();
  }, [ready]);

  // Realtime refresh (only after ready)
  useEffect(() => {
    if (!ready) return;
    const offP = subscribePatients(async () => setPatients(await fetchPatients(query)));
    const offT = subscribeDrugTests(async () =>
      setTests(await listDrugTests({ q: query, status: filter === "all" ? undefined : filter }))
    );
    return () => {
      offP();
      offT();
    };
  }, [ready, query, filter]);

  const filteredTests = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tests.filter((t) => {
      const bySearch =
        !q ||
        t.patient.name.toLowerCase().includes(q) ||
        (t.patient.email ?? "").toLowerCase().includes(q);
      const byStatus = filter === "all" || t.status === filter;
      return bySearch && byStatus;
    });
  }, [tests, query, filter]);

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

  async function refreshTests() {
    setTests(await listDrugTests({ q: query, status: filter === "all" ? undefined : filter }));
  }

  async function onCreateTest() {
    const m = patients[0];
    if (!m) {
      await sweetAlert({
        icon: "error",
        title: "No patients available",
        text: "Add a patient before creating a test.",
      });
      return;
    }
    try {
      await createDrugTest({ patientId: m.id, scheduledFor: null });
      await refreshTests();
      await sweetAlert({
        icon: "success",
        title: "Test created",
        text: `A new test was created for ${m.name}.`,
      });
    } catch (err: any) {
      const status = Number(err?.status || 0);
      if (status === 401 || status === 403) {
        await sweetAlert({
          icon: "error",
          title: "Sign in required",
          text: "Please sign in with a staff account.",
        });
        router.replace("/staff/login?redirect=/staff/dashboard");
        return;
      }
      await sweetAlert({
        icon: "error",
        title: "Failed to create test",
        text: err?.message ?? "Please try again.",
      });
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="text-sm text-slate-500">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Enhanced Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 grid place-items-center shadow-lg">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Staff Console</h1>
                <p className="text-sm text-slate-600">Comprehensive care management dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-slate-700">Live System</span>
              </div>
              <Badge variant="secondary" className="gap-2 px-3 py-1">
                <Activity className="h-4 w-4" />
                {patients.length} Patients
              </Badge>
              <Button variant="outline" size="sm" className="gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Enhanced Navigation Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {/* Primary Actions */}
          <NavigationCard
            icon={<HomeIcon className="h-6 w-6" />}
            title="Dashboard"
            description="Overview & Analytics"
            active={view === "home"}
            onClick={() => setView("home")}
            color="blue"
          />
          <NavigationCard
            icon={<TestTube2 className="h-6 w-6" />}
            title="Drug Tests"
            description="Manage Testing"
            active={view === "tests"}
            onClick={() => setView("tests")}
            color="green"
          />
          <NavigationCard
            icon={<MessageSquare className="h-6 w-6" />}
            title="Messages"
            description="Patient Communication"
            onClick={() => router.push("/staff/messages")}
            color="purple"
          />
          <NavigationCard
            icon={<Users className="h-6 w-6" />}
            title="Patients"
            description="Patient Management"
            onClick={() => router.push("/staff/patient-inbox")}
            color="orange"
          />
          <NavigationCard
            icon={<Video className="h-6 w-6" />}
            title="Video Calls"
            description="Patient Consultations"
            onClick={() => router.push("/staff/broadcasts")}
            color="red"
          />
          <NavigationCard
            icon={<Bell className="h-6 w-6" />}
            title="Notifications"
            description="Alerts & Updates"
            onClick={() => router.push("/staff/notifications")}
            color="yellow"
          />
        </div>

        {/* Secondary Actions Row */}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="h-4 w-4" />
            Schedule
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <FileText className="h-4 w-4" />
            Reports
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <RadioIcon className="h-4 w-4" />
            Broadcasts
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <EyeOff className="h-4 w-4" />
            Groups
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <SettingsIcon className="h-4 w-4" />
            Settings
          </Button>
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
            {/* Quick Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                icon={<Users className="h-5 w-5" />}
                title="Total Patients"
                value={patients.length}
                change="+12%"
                changeType="positive"
                color="blue"
              />
              <StatCard
                icon={<TestTube2 className="h-5 w-5" />}
                title="Pending Tests"
                value={tests.filter(t => t.status === 'pending').length}
                change="+3"
                changeType="neutral"
                color="green"
              />
              <StatCard
                icon={<CheckCircle className="h-5 w-5" />}
                title="Completed Tests"
                value={tests.filter(t => t.status === 'completed').length}
                change="+8"
                changeType="positive"
                color="emerald"
              />
              <StatCard
                icon={<AlertCircle className="h-5 w-5" />}
                title="Missed Tests"
                value={tests.filter(t => t.status === 'missed').length}
                change="-2"
                changeType="negative"
                color="red"
              />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold tracking-tight">Random Drug Test Manager</h2>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Test
                  </Button>
                </div>
                <Card className="shadow-lg border-0 bg-white">
                  <CardContent className="p-6">
                    <RandomDrugTestManager patients={patients} onCreate={handleModalCreate} />
                  </CardContent>
                </Card>
              </section>

              <section>
                <h2 className="text-xl font-semibold tracking-tight mb-4">Recent Activity</h2>
                <Card className="shadow-lg border-0 bg-white">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {filteredTests.slice(0, 5).map((test) => (
                        <div key={test.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-cyan-100 grid place-items-center">
                              <UserCheck className="h-4 w-4 text-cyan-600" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{test.patient.name}</p>
                              <p className="text-xs text-slate-500">{fmtWhen(test.scheduledFor)}</p>
                            </div>
                          </div>
                          <StatusChip status={test.status} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>
            </div>

            <section>
              <h2 className="text-xl font-semibold tracking-tight mb-4">Real-Time Intake Queue</h2>
              <p className="text-sm text-slate-600 mb-6">Monitor patient progress across intake roles</p>
              <IntakeQueue patients={patients} />
            </section>
          </>
        )}

        {view === "tests" && (
          <section>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight">Random Drug Test Manager</h2>
              <Button onClick={onCreateTest} className="h-10 px-4 gap-2">
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
                      <SelectTrigger className="h-10 w-40">
                        <SelectValue placeholder="Filter" />
                      </SelectTrigger>
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
                {filteredTests.length === 0 && (
                  <div className="text-sm text-slate-500 py-8 text-center">No tests yet.</div>
                )}
                <ul className="grid gap-3">
                  {filteredTests.map((t) => (
                    <li
                      key={t.id}
                      className="rounded-xl border bg-white px-5 py-4 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium">{t.patient.name}</div>
                        <div className="text-xs text-slate-500">
                          Scheduled: {fmtWhen(t.scheduledFor)}
                        </div>
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
            <div className="mt-4">
              <ProfileSettings />
            </div>
          </section>
        )}
      </main>

      <MobileDock />
      <IncomingCallNotification />
    </div>
  );

  // Helpers
  async function handleModalCreate(payload: { patientId: string; scheduledFor: string | null }) {
    try {
      await createDrugTest({ patientId: payload.patientId, scheduledFor: payload.scheduledFor });
      await refreshTests();
      const who = patients.find((p) => p.id === payload.patientId)?.name ?? "patient";
      const when = payload.scheduledFor ? fmtWhen(payload.scheduledFor) : "unscheduled";
      await sweetAlert({ icon: "success", title: "Test created", text: `${who} • ${when}` });
    } catch (err: any) {
      const status = Number(err?.status || 0);
      if (status === 401 || status === 403) {
        await sweetAlert({ icon: "error", title: "Sign in required", text: "Please sign in with a staff account." });
        router.replace("/staff/login?redirect=/staff/dashboard");
        return;
      }
      await sweetAlert({ icon: "error", title: "Failed to create test", text: err?.message ?? "Please try again." });
    }
  }
}

/* --------- Enhanced Components --------- */

function NavigationCard({
  icon,
  title,
  description,
  active,
  onClick,
  color = "blue",
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  active?: boolean;
  onClick?: () => void;
  color?: "blue" | "green" | "purple" | "orange" | "red" | "yellow";
}) {
  const colorMap = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
    red: "from-red-500 to-red-600",
    yellow: "from-yellow-500 to-yellow-600",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative p-6 rounded-xl border-2 transition-all duration-200 ${
        active
          ? "border-cyan-300 bg-cyan-50 shadow-lg"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
      }`}
    >
      <div className="flex flex-col items-center text-center space-y-3">
        <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${colorMap[color]} grid place-items-center shadow-lg group-hover:scale-105 transition-transform`}>
          <div className="text-white">{icon}</div>
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-600 mt-1">{description}</p>
        </div>
      </div>
    </button>
  );
}

function StatCard({
  icon,
  title,
  value,
  change,
  changeType,
  color = "blue",
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  color?: "blue" | "green" | "emerald" | "red" | "yellow" | "purple";
}) {
  const colorMap = {
    blue: "text-blue-600 bg-blue-100",
    green: "text-green-600 bg-green-100",
    emerald: "text-emerald-600 bg-emerald-100",
    red: "text-red-600 bg-red-100",
    yellow: "text-yellow-600 bg-yellow-100",
    purple: "text-purple-600 bg-purple-100",
  };

  const changeColorMap = {
    positive: "text-green-600",
    negative: "text-red-600",
    neutral: "text-slate-600",
  };

  return (
    <Card className="p-6 shadow-lg border-0 bg-white">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
          <p className={`text-sm font-medium mt-1 ${changeColorMap[changeType]}`}>
            {change}
          </p>
        </div>
        <div className={`h-12 w-12 rounded-xl ${colorMap[color]} grid place-items-center`}>
          {icon}
        </div>
      </div>
    </Card>
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
