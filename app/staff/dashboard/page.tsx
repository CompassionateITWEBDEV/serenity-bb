"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

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
import NotificationBell from "@/components/staff/NotificationBell";
import AppointmentsList from "@/components/staff/AppointmentsList";
import VideoSubmissionsList from "@/components/staff/VideoSubmissionsList";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

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
  Clock,
  Calendar,
  Video,
} from "lucide-react";

import type { DrugTest, TestStatus } from "@/lib/drug-tests";
import { createDrugTest, listDrugTests, subscribeDrugTests } from "@/lib/drug-tests";
import type { StaffPatient } from "@/lib/patients";
import { fetchPatients, subscribePatients } from "@/lib/patients";

// IMPORTANT: use the *singleton* client + ensureSession
import { supabase, ensureSession } from "@/lib/supabase-browser";

// NavButton component for enhanced navigation
interface NavButtonProps {
  active?: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}

function NavButton({ active = false, onClick, icon: Icon, label, description }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
        active
          ? "border-cyan-500 bg-gradient-to-br from-cyan-50 to-blue-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center mb-2 transition-colors ${
        active
          ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
          : "bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:text-slate-700"
      }`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-center">
        <div className={`text-xs font-semibold mb-1 ${
          active ? "text-cyan-700" : "text-slate-700"
        }`}>
          {label}
        </div>
        <div className="text-xs text-slate-500">
          {description}
        </div>
      </div>
      {active && (
        <div className="absolute -top-1 -right-1 h-3 w-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full border-2 border-white"></div>
      )}
    </button>
  );
}

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

type View = "home" | "tests" | "appointments" | "submissions" | "settings";

function StaffDashboardContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Gate all data work behind a ready flag
  const [ready, setReady] = useState(false);
  const [staffId, setStaffId] = useState<string | null>(null);

  const [patients, setPatients] = useState<StaffPatient[]>([]);
  const [tests, setTests] = useState<DrugTest[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | TestStatus>("all");
  const [selectedTest, setSelectedTest] = useState<DrugTest | null>(null);
  const [isTestOpen, setIsTestOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Initialize view from URL param or default to "home"
  const tabParam = searchParams?.get("tab");
  const initialView: View = 
    tabParam === "appointments" ? "appointments" : 
    tabParam === "tests" ? "tests" : 
    tabParam === "submissions" ? "submissions" : 
    "home";
  const [view, setView] = useState<View>(initialView);

  // Navigation guards
  function pushSafe(targetPath: string): void {
    if (!targetPath || pathname === targetPath || isNavigating) return;
    setIsNavigating(true);
    try {
      router.push(targetPath);
    } finally {
      setTimeout(() => setIsNavigating(false), 800);
    }
  }

  function setViewSafe(nextView: View): void {
    setView((prev) => (prev === nextView ? prev : nextView));
  }
  
  // Update view when URL param changes
  useEffect(() => {
    if (tabParam === "appointments") {
      setView("appointments");
    } else if (tabParam === "tests") {
      setView("tests");
    } else if (tabParam === "submissions") {
      setView("submissions");
    } else if (!tabParam) {
      setView("home");
    }
  }, [tabParam]);

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

      // Get staff ID from session
      if (session.user?.id) {
        setStaffId(session.user.id);
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
    // Navigate to the new test page
    router.push("/staff/drug-tests/new");
  }

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="text-sm text-slate-500">Loading…</div>
      </div>
    );
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
            {staffId && <NotificationBell staffId={staffId} />}
            <Badge variant="secondary" className="gap-1">
              <Activity className="h-3.5 w-3.5" /> Live
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Hero: Dashboard Overview */}
        <div className="-mt-2">
          <div className="text-sm text-slate-600 font-medium">Dashboard Overview</div>
        </div>

        {/* Enhanced Navigation */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Quick Actions</h2>
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200">
              <Activity className="h-3 w-3 mr-1" />
              Live System
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <NavButton 
              active={view === "tests"} 
              onClick={() => setViewSafe("tests")} 
              icon={TestTube2}
              label="Drug Tests"
              description="Random Tests"
            />
            <NavButton 
              active={view === "appointments"} 
              onClick={() => setViewSafe("appointments")} 
              icon={Calendar}
              label="Appointments"
              description="Patient Appointments"
            />
            <NavButton 
              active={view === "submissions"} 
              onClick={() => setViewSafe("submissions")} 
              icon={Video}
              label="Video Submissions"
              description="Patient Videos"
            />
            <NavButton 
              onClick={() => pushSafe("/staff/messages")} 
              icon={MessageSquare}
              label="Messages"
              description="Patient Chat"
            />
            <NavButton 
              onClick={() => pushSafe("/staff/broadcasts")} 
              icon={RadioIcon}
              label="Broadcasts"
              description="Announcements"
            />
            <NavButton 
              onClick={() => pushSafe("/staff/hidden-groups")} 
              icon={EyeOff}
              label="Groups"
              description="Hidden Groups"
            />
            <NavButton 
              onClick={() => pushSafe("/staff/group-chat")} 
              icon={MessageSquare}
              label="Group Chat"
              description="Team Chat"
            />
            {/* Removed Alerts nav button; the bell in header will navigate to /staff/notifications */}
            <NavButton 
              onClick={() => pushSafe("/staff/patient-verification")} 
              icon={Users}
              label="Patient Verification"
              description="Verify Patients"
            />
            <NavButton 
              onClick={() => pushSafe("/clinician/dashboard")} 
              icon={Users}
              label="Clinicians"
              description="Medical Staff"
            />
            <NavButton 
              onClick={() => pushSafe("/staff/profile")} 
              icon={SettingsIcon}
              label="Settings"
              description="Profile"
            />
          </div>
        </div>

        {/* Removed surface search/filter block for Drug Test Management */}

        {view === "home" && (
          <>
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Random Drug Test Manager</h2>
                  <p className="text-slate-600 mt-1">Schedule and manage random drug tests for patients</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                    <TestTube2 className="h-3 w-3 mr-1" />
                    Active System
                  </Badge>
                </div>
              </div>
              <Card className="shadow-lg border-slate-200">
                <CardContent className="p-6">
                  <RandomDrugTestManager patients={patients} onCreate={handleModalCreate} />
                </CardContent>
              </Card>
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Real-Time Intake Queue</h2>
                  <p className="text-slate-600 mt-1">Monitor patient progress across intake roles</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                    <Activity className="h-3 w-3 mr-1" />
                    Live Updates
                  </Badge>
                </div>
              </div>
              <IntakeQueue patients={patients} />
            </section>
          </>
        )}

        {view === "appointments" && (
          <AppointmentsList />
        )}

        {view === "submissions" && (
          <VideoSubmissionsList />
        )}

        {view === "tests" && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Drug Test Management</h2>
                <p className="text-slate-600 mt-1">View and manage all random drug tests</p>
              </div>
              <Button 
                onClick={onCreateTest} 
                className="h-12 px-8 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
              >
                <TestTube2 className="h-5 w-5 mr-2" />
                + New Test
              </Button>
            </div>
            <Card className="shadow-lg border-slate-200">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 grid place-items-center">
                      <TestTube2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-slate-800">Recent Tests</CardTitle>
                      <p className="text-sm text-slate-600">All scheduled and completed tests</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search patient…"
                        className="pl-9 h-10 w-56 border-slate-300 focus:border-cyan-500"
                      />
                    </div>
                    <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
                      <SelectTrigger className="h-10 w-40 border-slate-300 focus:border-cyan-500">
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
              <CardContent className="p-6">
                {filteredTests.length === 0 && (
                  <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-slate-100 to-slate-200 mb-6">
                      <TestTube2 className="h-10 w-10 text-slate-400" />
                    </div>
                    <p className="text-slate-600 text-xl font-semibold mb-2">No tests found</p>
                    <p className="text-slate-400 text-sm mb-6">Create your first random drug test to get started</p>
                    <Button 
                      onClick={onCreateTest} 
                      className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white"
                    >
                      <TestTube2 className="h-4 w-4 mr-2" />
                      Create Test
                    </Button>
                  </div>
                )}
                <div className="grid gap-4">
                  {filteredTests.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => { setSelectedTest(t); setIsTestOpen(true); }}
                      className="group rounded-xl border-2 border-slate-200 bg-white p-6 hover:border-cyan-300 hover:shadow-lg transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="h-14 w-14 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                            {t.patient.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="font-bold text-slate-800 text-lg">{t.patient.name}</div>
                              <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200 text-xs">
                                {t.id.slice(0, 8)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 flex-wrap">
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Clock className="h-4 w-4 text-slate-400" />
                                <span className="font-medium">{fmtWhen(t.scheduledFor)}</span>
                              </div>
                              {t.patient.email && (
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  <span>{t.patient.email}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <StatusChip status={t.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Drug Test Details Dialog */}
        <Dialog open={isTestOpen} onOpenChange={(o) => { if (!o) { setIsTestOpen(false); setSelectedTest(null); } }}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Drug Test Details</DialogTitle>
              <DialogDescription>Patient and scheduling information</DialogDescription>
            </DialogHeader>
            {selectedTest && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold">
                    {selectedTest.patient.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">{selectedTest.patient.name}</div>
                    {selectedTest.patient.email && (
                      <div className="text-sm text-slate-500">{selectedTest.patient.email}</div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-lg border bg-slate-50">
                    <div className="text-slate-500">Scheduled For</div>
                    <div className="font-medium text-slate-800">{fmtWhen(selectedTest.scheduledFor)}</div>
                  </div>
                  <div className="p-3 rounded-lg border bg-slate-50">
                    <div className="text-slate-500">Status</div>
                    <div><StatusChip status={selectedTest.status} /></div>
                  </div>
                </div>

                {/* Add more fields here if available, e.g., collection site or attachments */}

                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="outline"
                    onClick={() => { setIsTestOpen(false); setSelectedTest(null); }}
                  >
                    Close
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => pushSafe(`/staff/patients/${selectedTest.patient.id}`)}
                    >
                      View Patient
                    </Button>
                    <Button
                      onClick={() => pushSafe(`/staff/drug-tests/${selectedTest.id}`)}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white"
                    >
                      Open Test
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

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

export default function StaffDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="text-sm text-slate-500">Loading…</div>
      </div>
    }>
      <StaffDashboardContent />
    </Suspense>
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
