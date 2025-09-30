"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle2, XCircle, Clock } from "lucide-react";
import type { DrugTest, TestStatus } from "@/lib/drug-tests";
import { createDrugTest, listDrugTests, subscribeDrugTests } from "@/lib/drug-tests";
import type { StaffPatient } from "@/lib/patients";

const TEST_META: Record<TestStatus, { label: string; dot: string; text: string }> = {
  completed: { label: "Completed", dot: "bg-emerald-500", text: "text-emerald-700" },
  missed: { label: "Missed", dot: "bg-rose-500", text: "text-rose-700" },
  pending: { label: "Pending", dot: "bg-amber-400", text: "text-amber-700" },
};

function Dot({ cls }: { cls: string }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${cls}`} />;
}

async function swal(opts: { title: string; text?: string; mood?: "success" | "error" }) {
  const Swal = (await import("sweetalert2")).default;
  return Swal.fire({
    title: opts.title,
    text: opts.text,
    background: "#fff",
    confirmButtonColor: "#06b6d4",
    customClass: { popup: "rounded-2xl", confirmButton: "rounded-xl" },
    timer: opts.mood === "success" ? 1100 : undefined,
  });
}

async function promptNewTest(patients: StaffPatient[]) {
  const Swal = (await import("sweetalert2")).default;
  const options = patients.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
  return Swal.fire({
    title: "New Random Test",
    html: `
      <div style="text-align:left">
        <label style="display:block;margin:6px 0 4px">Patient</label>
        <select id="p" class="swal2-select" style="width:100%">${options}</select>
        <label style="display:block;margin:12px 0 4px">Schedule For</label>
        <input id="d" type="datetime-local" class="swal2-input" style="width:100%" />
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Create",
    confirmButtonColor: "#06b6d4",
    focusConfirm: false,
    preConfirm: () => {
      const patientId = (document.getElementById("p") as HTMLSelectElement)?.value;
      const date = (document.getElementById("d") as HTMLInputElement)?.value || null;
      if (!patientId) return Swal.showValidationMessage("Select a patient");
      return { patientId, scheduledFor: date };
    },
  });
}

export default function RandomDrugTestManager({ patients }: { patients: StaffPatient[] }) {
  const [tests, setTests] = useState<DrugTest[]>([]);

  useEffect(() => {
    (async () => setTests(await listDrugTests({})))().catch(() => {});
  }, []);
  useEffect(() => {
    const off = subscribeDrugTests(async () => setTests(await listDrugTests({})));
    return () => off();
  }, []);

  const recent = useMemo(() => tests.slice(0, 3), [tests]);

  async function onNewTest() {
    const ans = await promptNewTest(patients);
    if (!ans.isConfirmed) return;
    const { patientId, scheduledFor } = ans.value as { patientId: string; scheduledFor: string | null };
    try {
      await createDrugTest({ patientId, scheduledFor });
      await swal({ title: "New test created", mood: "success" });
      setTests(await listDrugTests({}));
    } catch (e: any) {
      await swal({ title: "Create failed", text: e?.message, mood: "error" });
    }
  }

  return (
    <div>
      <ul className="space-y-2">
        {recent.map((t) => {
          const m = TEST_META[t.status];
          return (
            <li key={t.id} className="flex items-center justify-between text-sm">
              <span className="text-slate-800 truncate">{t.patient.name}</span>
              <span className={`inline-flex items-center gap-2 ${m.text}`}>
                <Dot cls={m.dot} />
                {m.label}
              </span>
            </li>
          );
        })}
        {recent.length === 0 && <li className="text-sm text-slate-500 py-2">No tests yet.</li>}
      </ul>

      <div className="flex justify-end mt-3">
        <Button onClick={onNewTest} size="sm" className="gap-2 rounded-full">
          <Plus className="h-4 w-4" /> New Test
        </Button>
      </div>
    </div>
  );
}
tsx
Copy code
// components/staff/IntakeQueue.tsx
"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { StaffPatient } from "@/lib/patients";

type RoleStatus = "completed" | "in_progress" | "not_started";
type TestStatus = "pending" | "completed" | "missed";

const ROLE_META: Record<RoleStatus, { label: string; dot: string; text: string }> = {
  completed: { label: "Completed", dot: "bg-emerald-500", text: "text-emerald-700" },
  in_progress: { label: "In progress", dot: "bg-amber-400", text: "text-amber-700" },
  not_started: { label: "Not Started", dot: "bg-slate-300", text: "text-slate-600" },
};
const TEST_META: Record<TestStatus, { label: string; dot: string; text: string }> = {
  completed: { label: "Completed", dot: "bg-emerald-500", text: "text-emerald-700" },
  missed: { label: "Missed", dot: "bg-rose-500", text: "text-rose-700" },
  pending: { label: "Pending", dot: "bg-amber-400", text: "text-amber-700" },
};

function Dot({ cls }: { cls: string }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${cls}`} />;
}
function RoleRow({ label, status }: { label: string; status: RoleStatus }) {
  const m = ROLE_META[status];
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-600">{label}:</span>
      <span className={`inline-flex items-center gap-2 ${m.text}`}>
        <Dot cls={m.dot} />
        {m.label}
      </span>
    </div>
  );
}

export default function IntakeQueue({ patients }: { patients: StaffPatient[] }) {
  // Demo map; replace with real role data when you have it.
  const intake = useMemo(
    () =>
      patients.slice(0, 6).map((p, i) => ({
        id: p.id,
        name: p.name,
        roles: {
          collector: (["completed", "in_progress", "not_started"] as RoleStatus[])[i % 3],
          rn: (["in_progress", "completed", "not_started"] as RoleStatus[])[(i + 1) % 3],
          md: (["not_started", "not_started", "in_progress"] as RoleStatus[])[(i + 2) % 3],
          test: (["pending", "completed", "pending"] as TestStatus[])[i % 3],
        },
      })),
    [patients]
  );

  return (
    <div className="mt-3 grid gap-3">
      {intake.map((r) => {
        const testMeta = TEST_META[r.roles.test];
        return (
          <Card key={r.id} className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">{r.name}</div>
                <span className={`inline-flex items-center gap-2 text-sm ${testMeta.text}`}>
                  <Dot cls={testMeta.dot} />
                  {testMeta.label}
                </span>
              </div>

              <div className="space-y-1.5">
                <RoleRow label="Collector" status={r.roles.collector} />
                <RoleRow label="RN" status={r.roles.rn} />
                <RoleRow label="MD" status={r.roles.md} />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Drug Test:</span>
                  <span className={`inline-flex items-center gap-2 ${testMeta.text}`}>
                    <Dot cls={testMeta.dot} /> {testMeta.label}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      {intake.length === 0 && (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">No patients.</CardContent>
        </Card>
      )}
    </div>
  );
}
