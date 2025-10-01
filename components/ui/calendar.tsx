"use client";

import * as React from "react";
import { DayPicker, type DayPickerSingleProps } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { cn } from "@/lib/utils";

// Base calendar (keeps your API)
export type CalendarProps = Omit<DayPickerSingleProps, "mode"> & { className?: string };

export function Calendar({ className, ...props }: CalendarProps) {
  return (
    <DayPicker
      mode="single"
      showOutsideDays
      className={cn("p-2", className)}
      classNames={{
        months: "flex flex-col space-y-4",
        month: "space-y-4",
        caption: "flex justify-between px-2 items-center",
        caption_label: "text-base font-medium",
        nav: "flex items-center gap-1",
        nav_button: "h-8 w-8 rounded-full hover:bg-gray-100",
        head_row: "grid grid-cols-7 px-2",
        head_cell: "text-xs text-gray-500 font-medium text-center",
        row: "grid grid-cols-7 px-2",
        cell: "h-10 w-10 text-center relative",
        day: "h-10 w-10 rounded-full inline-flex items-center justify-center text-sm hover:bg-gray-100 focus:outline-none",
        day_selected: "bg-[#2FD5CA] text-white hover:bg-[#27bdb2]",
        day_today: "after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1.5 after:w-1.5 after:rounded-full after:bg-[#2FD5CA] after:pointer-events-none",
        day_outside: "text-gray-300",
        day_disabled: "text-gray-300 opacity-50",
      }}
      {...props}
    />
  );
}

// --- New: CalendarCard wrapper to match the screenshot ---
export function CalendarCard({
  value,
  onChange,
  className,
}: {
  value?: Date;
  onChange?: (d?: Date) => void;
  className?: string;
}) {
  // Pass-through controlled state (let DayPicker manage month navigation UI)
  return (
    <div className={cn("w-full", className)}>
      {/* Teal header */}
      <div className="rounded-t-3xl bg-[#2FD5CA] px-4 pt-4 pb-16 relative">
        <button
          type="button"
          aria-label="Jump to today"
          className="h-8 w-8 rounded-full bg-white/70 hover:bg-white grid place-items-center text-slate-700 shadow-sm"
          onClick={() => onChange?.(new Date())} /* WHY: one-tap 'today' shortcut */
          title="Today"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* White rounded panel with calendar */}
      <div className="-mt-12 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <Calendar
          selected={value}
          onSelect={onChange}
          className="p-0" /* no extra padding inside the white panel */
        />
      </div>
    </div>
  );
}
