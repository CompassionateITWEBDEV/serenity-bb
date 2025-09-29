// components/ui/calendar.tsx
"use client";

import * as React from "react";
import { DayPicker, type DayPickerSingleProps } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { cn } from "@/lib/utils";

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
        day_selected: "bg-cyan-600 text-white hover:bg-cyan-700",
        day_today: "border border-cyan-500",
        day_outside: "text-gray-300",
        day_disabled: "text-gray-300 opacity-50",
      }}
      {...props}
    />
  );
}
