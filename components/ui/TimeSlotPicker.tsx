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
    <div className={cn("rounded-xl border bg-white shadow-sm", className)}>
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-slate-50 to-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
          <div className="text-sm font-semibold text-slate-700">Available Times</div>
        </div>
        <div className="text-xs text-slate-500 bg-white px-2 py-1 rounded-full border">
          {intervalMinutes}-min intervals
        </div>
      </div>

      {/* grid */}
      <div className="max-h-64 overflow-auto p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                "h-10 rounded-lg text-sm font-medium border-2 transition-all duration-200",
                "disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400",
                isActive
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-cyan-500 shadow-lg scale-105"
                  : "bg-white text-slate-700 hover:bg-cyan-50 hover:border-cyan-300 border-slate-200 hover:shadow-md"
              )}
              title={isDisabled ? `${slot} (Past time)` : slot}
            >
              {slot}
            </button>
          );
        })}
      </div>

      {/* footer info */}
      {value && (
        <div className="px-4 py-2 border-t bg-cyan-50">
          <div className="flex items-center gap-2 text-xs text-cyan-700">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
            <span>Selected: {value}</span>
          </div>
        </div>
      )}
    </div>
  );
}
