"use client";
import React from "react";
import { usePatientOverview } from "@/context/patient-overview-context";

export function TreatmentProgress() {
  const { overview, loading, error } = usePatientOverview();

  if (loading && !overview) {
    return (
      <div className="rounded-2xl shadow p-5">
        <div className="h-5 w-56 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 w-full bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }
  if (error && !overview) {
    return <div className="rounded-2xl shadow p-5 text-sm text-red-600">{error}</div>;
  }

  const items = overview!.treatmentProgress || [];
  if (items.length === 0) {
    return <div className="rounded-2xl shadow p-5 text-sm text-gray-600">No progress yet.</div>;
  }

  return (
    <div className="rounded-2xl shadow p-5">
      <h2 className="text-lg font-semibold mb-4">Treatment Progress</h2>
      <ul className="space-y-4">
        {items.map((it, i) => {
          const pct = typeof it.percent === "number" ? Math.max(0, Math.min(100, it.percent)) : null;
          return (
            <li key={`${it.title}-${i}`} className="border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{it.title}</p>
                  {it.subtitle && <p className="text-sm text-gray-500">{it.subtitle}</p>}
                  {it.date && <p className="text-xs text-gray-400 mt-1">{it.date}</p>}
                </div>
                <span
                  className={`text-sm ${
                    it.status === "Completed" ? "text-green-600" : it.status === "In Progress" ? "text-amber-600" : "text-gray-600"
                  }`}
                >
                  {it.status}
                </span>
              </div>
              {pct !== null && (
                <div className="w-full h-2 bg-gray-200 rounded mt-3">
                  <div className="h-2 rounded" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#111827,#4B5563)" }} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
export default TreatmentProgress;
