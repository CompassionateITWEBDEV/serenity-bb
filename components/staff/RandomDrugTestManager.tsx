// components/staff/RandomDrugTestManager.tsx
"use client";

import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"; // shadcn
import { Calendar as CalendarIcon } from "lucide-react";
import type { StaffPatient } from "@/lib/patients";

type Props = {
  patients: StaffPatient[];
  onCreate?: (payload: { patientId: string; scheduledFor: string | null }) => Promise<void> | void;
};

export default function RandomDrugTestManager({ patients, onCreate }: Props) {
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState<string>(patients[0]?.id ?? "");
  const [scheduledFor, setScheduledFor] = useState<string>(""); // ISO string or empty

  async function handleCreate() {
    await onCreate?.({ patientId, scheduledFor: scheduledFor || null });
    setOpen(false);
  }

  return (
    <>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="h-9 px-3">+ New Test</Button>
          </DialogTrigger>

          {/* Bigger, responsive dialog — no horizontal scrollbar */}
          <DialogContent
            className="
              w-[92vw] sm:w-full sm:max-w-xl md:max-w-2xl
              p-6
              overflow-x-hidden
            "
          >
            <DialogHeader>
              <DialogTitle className="text-center text-xl">New Random Test</DialogTitle>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleCreate();
              }}
              className="mt-4 space-y-4"
            >
              {/* Patient */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Patient</label>
                <select
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-cyan-300"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Schedule For */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Schedule For</label>
                <div className="relative">
                  <Input
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    className="h-10 w-full pr-10"
                  />
                  <CalendarIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Actions */}
              <DialogFooter className="mt-2 gap-2 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="h-9">
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* …rest of manager UI… */}
    </>
  );
}
