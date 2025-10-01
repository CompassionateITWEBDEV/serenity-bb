"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type TimeSlotPickerProps = {
  date?: Date;                           // used to disable past times if today
  value?: string;                        // "HH:MM" 24h
  onChange?: (hhmm: string) => void;
  intervalMinutes?: 5 | 10 | 15 | 20 | 30 | 60;
  startHour?: number;                    // inclusive: 0..23
  endHour?: number;                      // exclusive: 1..24
  className?: string;
};

function pad(n: number) { return n.toString().padStart(2, "0"); }
function hhmm(h: number, m: number) { return `${pad(h)}:${pad(m)}`; }

export default function TimeSlotPicker({
  date,
  value,
  onChange,
  intervalMinutes = 30,
  startHour = 8,
  endHour = 20,
  className,
}: TimeSlotPickerProps) {
  const slots: string[] = React.useMemo(() => {
    const out: string[] = [];
    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += intervalMinutes) {
        out.push(hhmm(h, m));
      }
    }
    return out;
  }, [startHour, endHour, intervalMinutes]);

  const now = new Date();
  const isSameDay =
    date &&
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate();

  // A slot is disabled if it is in the past for "today"
  const disabled = (slot: string) => {
    if (!date || !isSameDay) return false;
    const [h, m] = slot.split(":").map(Number);
    const cmp = new Date(date);
    cmp.setHours(h, m, 0, 0);
    return cmp.getTime() < now.getTime();
  };

  return (
    <div className={cn("rounded-xl border bg-white", className)}>
      {/* header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="text-xs font-semibold text-slate-600">Time</div>
        <div className="text-[11px] text-slate-500">
          {intervalMinutes}-min intervals
        </div>
      </div>

      {/* grid */}
      <div className="max-h-64 overflow-auto p-3 grid grid-cols-3 gap-2">
        {slots.map((slot) => {
          const isActive = value === slot;
          const isDisabled = disabled(slot);
          return (
            <button
              key={slot}
              type="button"
              disabled={isDisabled}
              onClick={() => onChange?.(slot)}
              className={cn(
                "h-9 rounded-full text-sm border transition",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                isActive
                  ? "bg-cyan-600 text-white border-cyan-600"
                  : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
              )}
              title={slot}
            >
              {slot}
            </button>
          );
        })}
      </div>
    </div>
  );
}
