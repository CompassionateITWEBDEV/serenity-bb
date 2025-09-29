"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, ShieldCheck, Activity, CircleCheck, CircleX, Clock, AlertTriangle,
  Filter, Search, TestTube2, User2, LogOut
} from "lucide-react";

import ProfileSettings from "@/components/ProfileSettings";
import type { DrugTest, TestStatus } from "@/lib/drug-tests";
import { createDrugTest, listDrugTests, subscribeDrugTests } from "@/lib/drug-tests";
import type { StaffPatient } from "@/lib/patients";
import { fetchPatients, subscribePatients } from "@/lib/patients";
import { logout } from "@/lib/staff";

/* ======================= Status UI meta ======================= */
type Role = "collector" | "rn" | "md";
type RoleStatus = "not_started" | "in_progress" | "completed";

const ROLE_LABEL: Record<Role, string> = { collector: "Collector", rn: "RN", md: "MD" };
const ROLE_STATUS_META: Record<RoleStatus, { label: string; icon: any; cls: string }> = {
  completed:   { label: "Completed",   icon: CircleCheck, cls: "text-emerald-600 bg-emerald-50" },
  in_progress: { label: "In progress", icon: Clock,       cls: "text-amber-600 bg-amber-50" },
  not_started: { label: "Not Started", icon: AlertTriangle, cls: "text-slate-600 bg-slate-100" },
};
const TEST_STATUS_META: Record<TestStatus, { label: string; icon: any; dot: string; chip: string }> = {
  completed: { label: "Completed", icon: CircleCheck, dot: "bg-emerald-500", chip: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  missed:    { label: "Missed",    icon: CircleX,     dot: "bg-rose-500",    chip: "text-rose-700 bg-rose-50 border-rose-200" },
  pending:   { label: "Pending",   icon: Clock,       dot: "bg-amber-400",   chip: "text-amber-700 bg-amber-50 border-amber-200" },
};

/* ======================= SweetAlert ======================= */
async function serenitySwal(opts: { title: string; text?: string; mood: "success" | "error" | "info" }) {
  const Swal = (await import("sweetalert2")).default;
  const palette =
    opts.mood === "success"
      ? { emoji: "💙✨", backdrop: "linear-gradient(135deg,#ecfeff,#eef2ff)" }
      : opts.mood === "error"
      ? { emoji: "😅💤", backdrop: "linear-gradient(135deg,#fff1f2,#fee2e2)" }
      : { emoji: "🌤️😊", backdrop: "linear-gradient(135deg,#f0fdfa,#e0f2fe)" };
  return Swal.fire({
    title: opts.title, text: opts.text, icon: undefined,
    iconHtml: `<div style="font-size:32px;line-height:1">${palette.emoji}</div>`,
    background: "#fff", color: "#0f172a", backdrop: palette.backdrop,
    confirmButtonColor: "#06b6d4", showConfirmButton: true,
    customClass: { popup: "rounded-2xl shadow-xl", confirmButton: "rounded-xl", title: "font-semibold" },
    timer: opts.mood === "success" ? 1400 : undefined,
  });
}

async function serenityPromptNewTest(patients: StaffPatient[]) {
  const Swal = (await import("sweetalert2")).default;
  const patientOptions = patients.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
  return Swal.fire({
    title: "New Random Test 💙",
    html: `
      <div style="text-align:left">
        <label style="display:block;margin:6px 0 4px">Select Patient</label>
        <select id="patient" class="swal2-select" style="width:100%">${patientOptions}</select>
        <label style="display:block;margin:12px 0 4px">Schedule For</label>
        <input id="date" type="datetime-local" class="swal2-input" style="width:100%" />
      </div>
    `,
    focusConfirm: false, showCancelButton: true, confirmButtonText: "Create Test ✨", confirmButtonColor: "#06b6d4",
    preConfirm: () => {
      const patientId = (document.getElementById("patient") as HTMLSelectElement)?.value;
      const date = (document.getElementById("date") as HTMLInputElement)?.value;
      if (!patientId) return Swal.showValidationMessage("Please pick a patient.");
      return { patientId, scheduledFor: date || null };
    },
  });
}

/* ======================= Helpers ======================= */
function fmtWhen(iso?: string | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch { return "—"; }
}

function StatusChip({ status }: { status: TestStatus }) {
  const meta = TEST_STATUS_META[status]; const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border ${meta.chip}`}>
      <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}

function RoleRow({ role, value }: { role: Role; value: RoleStatus }) {
  const meta = ROLE_STATUS_META[value]; const Icon = meta.icon;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-600">{ROLE_LABEL[role]}:</span>
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${meta.cls}`}>
        <Icon className="h-3.5 w-3.5" />
        {meta.label}
      </span>
    </div>
  );
}

/* ======================= Page ======================= */
export default function StaffDashboardPage() {
  const router = useRouter();

  const [patients, setPatients] = useState<StaffPatient[]>([]);
  const [tests, setTests] = useState<DrugTest[]>([]);
  const [intake, setIntake] = useState<{ id: string; patient: StaffPatient; roles: Record<Role, RoleStatus> }[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | TestStatus>("all");
  const [activeTab, setActiveTab] = useState<"tests" | "patients" | "settings">("tests");

  // Initial load (same UI, live data)
  useEffect(() => {
    (async () => {
      const [p, t] = await Promise.all([fetchPatients(), listDrugTests({})]);
      setPatients(p);
      setTests(t);
      setIntake(
        p.slice(0, 3).map((x, i) => ({
          id: `i_${x.id}`,
          patient: x,
          roles: {
            collector: (["completed", "in_progress", "not_started"] as RoleStatus[])[i % 3],
            rn: (["in_progress", "completed", "not_started"] as RoleStatus[])[(i + 1) % 3],
            md: (["not_started", "not_started", "in_progress"] as RoleStatus[])[(i + 2) % 3],
          },
        }))
      );
    })().catch((e: any) => serenitySwal({ title: "Load failed", text: e?.message, mood: "error" }));
  }, []);

  // Realtime refresh
  useEffect(() => {
    const offPatients = subscribePatients(async () => setPatients(await fetchPatients(query)));
    const offTests = subscribeDrugTests(async () => setTests(await listDrugTests({ q: query, status: filter === "all" ? undefined : filter })));
    return () => { offPatients(); offTests(); };
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
    const ans = await serenityPromptNewTest(patients);
    if (!ans.isConfirmed) return;
    const { patientId, scheduledFor } = ans.value as { patientId: string; scheduledFor: string | null };
    try {
      await createDrugTest({ patientId, scheduledFor });
      await serenitySwal({ title: "New test created 🎉", text: "Saved to Supabase", mood: "success" });
      setTests(await listDrugTests({ q: query, status: filter === "all" ? undefined : filter }));
    } catch (e: any) {
      await serenitySwal({ title: "Failed to create", text: e?.message, mood: "error" });
    }
  }

  async function onLogout() {
    await logout();
    router.refresh();
  }

  /* ======================= UI matches your screenshot ======================= */
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
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
            <Button variant="outline" size="sm" className="gap-1" onClick={onLogout} title="Logout">
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="mb-4">
            <TabsTrigger value="tests">Drug Tests</TabsTrigger>
            <TabsTrigger value="patients">Patients</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Random Drug Test Manager */}
          <TabsContent value="tests" className="space-y-4">
            <section aria-labelledby="rdtm">
              <div className="flex items-center justify-between mb-3">
                <h2 id="rdtm" className="text-xl font-semibold tracking-tight">Random Drug Test Manager</h2>
                <Button onClick={onCreateTest} className="gap-2">
                  <Plus className="h-4 w-4" /> New Test
                </Button>
              </div>

              <Card className="shadow-sm">
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
                        <SelectTrigger className="h-9 w-36">
                          <Filter className="h-4 w-4 mr-1 text-slate-500" />
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

                <CardContent className="space-y-3">
                  {filteredTests.length === 0 && (
                    <div className="text-sm text-slate-500 py-6 text-center">No tests found.</div>
                  )}
                  <ul className="grid gap-3">
                    {filteredTests.map((t) => (
                      <li key={t.id} className="rounded-xl border bg-white px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-slate-100 grid place-items-center">
                            <User2 className="h-4 w-4 text-slate-600" />
                          </div>
                          <div>
                            <div className="font-medium">{t.patient.name}</div>
                            <div className="text-xs text-slate-500">Scheduled: {fmtWhen(t.scheduledFor)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusChip status={t.status} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </section>
          </TabsContent>

          {/* Patients (Subscribers) */}
          <TabsContent value="patients">
            <section aria-labelledby="patients">
              <h2 id="patients" className="text-xl font-semibold tracking-tight mb-3">Patients</h2>
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-slate-100 grid place-items-center">
                      <User2 className="h-4 w-4 text-slate-700" />
                    </div>
                    <CardTitle className="text-base">All Subscribers</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {patients.length === 0 ? (
                    <div className="text-sm text-slate-500">No patients found.</div>
                  ) : (
                    <ul className="divide-y">
                      {patients.map((p) => (
                        <li key={p.id} className="py-2 flex items-center justify-between">
                          <div>
                            <div className="font-medium">{p.name}</div>
                            <div className="text-xs text-slate-500">{p.email || "—"}</div>
                          </div>
                          <div className="text-xs text-slate-500">
                            {p.created_at ? new Date(p.created_at).toLocaleDateString() : ""}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </section>
          </TabsContent>

          {/* Settings (same UI) */}
          <TabsContent value="settings">
            <ProfileSettings />
          </TabsContent>
        </Tabs>
      </main>

      {/* Bottom Nav (mobile hint) */}
      <nav className="md:hidden fixed bottom-4 left-0 right-0">
        <div className="mx-auto w-72 rounded-2xl bg-white/90 shadow-lg border flex items-center justify-around py-2">
          <button className="p-2 text-slate-600" aria-label="Messages">💬</button>
          <button className="p-2 text-slate-600" aria-label="Queue">📋</button>
          <button className="p-2 rounded-full bg-cyan-600 text-white" aria-label="Home" onClick={() => setActiveTab("tests")}>🏠</button>
          <button className="p-2 text-slate-600" aria-label="Alerts">🔔</button>
          <button className="p-2 text-slate-600" aria-label="Profile" onClick={() => setActiveTab("settings")}>👤</button>
        </div>
      </nav>
    </div>
  );
}
