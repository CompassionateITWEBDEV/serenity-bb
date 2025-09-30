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
