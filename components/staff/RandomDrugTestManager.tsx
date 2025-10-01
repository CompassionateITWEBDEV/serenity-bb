"use client";

import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CalendarCard } from "@/components/ui/calendar";
import TimeSlotPicker from "@/components/ui/TimeSlotPicker"; // <-- added path
import type { StaffPatient } from "@/lib/patients";

type Props = {
  patients: StaffPatient[];
  onCreate?: (payload: { patientId: string; scheduledFor: string | null }) => Promise<void> | void;
};

export default function RandomDrugTestManager({ patients, onCreate }: Props) {
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState<string>(patients[0]?.id ?? "");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [slot, setSlot] = useState<string | undefined>(undefined); // "HH:MM"

  function toIsoOrNull(): string | null {
    if (!date) return null;
    const d = new Date(date);
    if (slot) {
      const [hh, mm] = slot.split(":").map(Number);
      d.setHours(hh || 0, mm || 0, 0, 0);
    }
    return d.toISOString();
  }

  async function handleCreate() {
    await onCreate?.({ patientId, scheduledFor: toIsoOrNull() });
    setOpen(false);
  }

  return (
    <div className="flex justify-end">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="h-9 px-3">+ New Test</Button>
        </DialogTrigger>

        {/* Wider dialog; no horizontal scrollbar */}
        <DialogContent className="w-[92vw] sm:w-full sm:max-w-xl md:max-w-2xl p-0 overflow-x-hidden">
          <DialogHeader className="px-6 pt-5">
            <DialogTitle className="text-center text-xl">New Random Test</DialogTitle>
          </DialogHeader>

          <div className="px-6 pb-6">
            {/* Patient */}
            <div className="mt-4 space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Patient</label>
              <select
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-cyan-300"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Schedule For (Calendar + Time Slots) */}
            <div className="mt-5 space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Schedule For</label>
              <div className="grid gap-3 md:grid-cols-[1fr,220px]">
                <CalendarCard value={date} onChange={setDate} />
                <div className="md:self-stretch">
                  <TimeSlotPicker
                    date={date}
                    value={slot}
                    onChange={setSlot}
                    intervalMinutes={30}
                    startHour={8}
                    endHour={20}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <DialogFooter className="mt-6 gap-2 sm:justify-end">
              <Button type="button" variant="outline" className="h-9" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="button" className="h-9" onClick={handleCreate} disabled={!patientId || !date}>
                Create
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
