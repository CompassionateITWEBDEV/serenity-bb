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

// --- Enhanced CalendarCard with modern design ---
export function CalendarCard({
  value,
  onChange,
  className,
}: {
  value?: Date;
  onChange?: (d?: Date) => void;
  className?: string;
}) {
  const [currentMonth, setCurrentMonth] = React.useState<Date>(value || new Date());

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    onChange?.(today);
  };

  const goToPreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
  };

  const goToNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
  };

  return (
    <div className={cn("w-full bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden", className)}>
      {/* Modern header with gradient */}
      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-6 relative">
        <div className="flex items-center justify-between">
          {/* Today button */}
          <button
            type="button"
            onClick={goToToday}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-white text-sm font-medium transition-all duration-200 hover:scale-105"
            title="Go to today"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M8 2v3M16 2v3M3.5 9.09h17M21 8.5V17a2 2 0 01-2 2H5a2 2 0 01-2-2V8.5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Today
          </button>

          {/* Month/Year display */}
          <div className="text-center">
            <h3 className="text-xl font-bold text-white">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white transition-all duration-200 hover:scale-110"
              title="Previous month"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              type="button"
              onClick={goToNextMonth}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white transition-all duration-200 hover:scale-110"
              title="Next month"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Calendar body */}
      <div className="p-6">
        <Calendar
          selected={value}
          onSelect={onChange}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          className="p-0"
          classNames={{
            months: "flex flex-col space-y-4",
            month: "space-y-4",
            caption: "hidden", // Hide default caption since we have custom header
            nav: "hidden", // Hide default nav since we have custom nav
            head_row: "grid grid-cols-7 gap-1 mb-2",
            head_cell: "text-center text-sm font-semibold text-slate-600 py-2",
            row: "grid grid-cols-7 gap-1",
            cell: "relative h-10 w-10 text-center",
            day: "h-10 w-10 rounded-lg inline-flex items-center justify-center text-sm font-medium transition-all duration-200 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2",
            day_selected: "bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 shadow-lg scale-105",
            day_today: "bg-cyan-50 text-cyan-700 font-semibold ring-2 ring-cyan-200",
            day_outside: "text-slate-300 hover:text-slate-400",
            day_disabled: "text-slate-300 opacity-50 cursor-not-allowed",
            day_range_middle: "bg-cyan-100 text-cyan-800",
            day_range_start: "bg-gradient-to-r from-cyan-500 to-blue-500 text-white",
            day_range_end: "bg-gradient-to-r from-cyan-500 to-blue-500 text-white",
          }}
        />
      </div>

      {/* Footer with selected date info */}
      {value && (
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
          <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
            <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
            <span>Selected: {value.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric',
              year: 'numeric'
            })}</span>
          </div>
        </div>
      )}
    </div>
  );
}
