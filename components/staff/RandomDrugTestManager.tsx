"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { StaffPatient } from "@/lib/patients";
import type { DrugTest, TestStatus } from "@/lib/drug-tests";
import { createDrugTest, listDrugTests, subscribeDrugTests } from "@/lib/drug-tests";
import { Plus } from "lucide-react";

/* status meta kept tiny for the mini list */
const STATUS_META: Record<TestStatus, { label: string; dot: string; text: string }> = {
  completed: { label: "Completed", dot: "bg-emerald-500", text: "text-emerald-700" },
  missed:    { label: "Missed",    dot: "bg-rose-500",    text: "text-rose-700" },
  pending:   { label: "Pending",   dot: "bg-amber-400",   text: "text-amber-700" },
};

function Dot({ cls }: { cls: string }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${cls}`} />;
}

/* SweetAlert helpers (local to this component) */
async function swal(opts: { title: string; text?: string; mood?: "success" | "error" }) {
  const Swal = (await import("sweetalert2")).default;
  return Swal.fire({
    title: opts.title, text: opts.text,
    background: "#fff", confirmButtonColor: "#06b6d4",
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
      </div>`,
    showCancelButton: true, confirmButtonText: "Create", confirmButtonColor: "#06b6d4",
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

  /* fetch tests only here */
  useEffect(() => { (async () => setTests(await listDrugTests({})))().catch(() => {}); }, []);
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
          const m = STATUS_META[t.status];
          return (
            <li key={t.id} className="flex items-center justify-between text-sm">
              <span className="text-slate-800 truncate">{t.patient.name}</span>
              <span className={`inline-flex items-center gap-2 ${m.text}`}>
                <Dot cls={m.dot} /> {m.label}
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
