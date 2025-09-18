"use client";
import React from "react";
import { usePatientOverview } from "@/context/patient-overview-context";

export function DashboardStats() {
  const { overview, loading, error } = usePatientOverview();

  if (loading && !overview) {
    return (
      <div className="rounded-2xl shadow p-5">
        <p className="text-sm text-gray-500 mb-2">Loading stats…</p>
        <div className="h-2 w-full bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }
  if (error && !overview) {
    return <div className="rounded-2xl shadow p-5 text-sm text-red-600">{error}</div>;
  }

  const data = overview!;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard title="Days in Program" value={data.daysInProgram} />
      <StatCard title="Sessions Completed" value={data.sessionsCompleted} />
      <StatCard title="Goals Achieved" value={data.goalsAchieved} />
      <StatCard title="Progress Score" value={`${data.progressScore}%`} bar={data.progressScore} />
    </div>
  );
}

function StatCard({ title, value, bar }: { title: string; value: string | number; bar?: number }) {
  const pct = typeof bar === "number" ? Math.max(0, Math.min(100, bar)) : null;
  return (
    <div className="rounded-2xl shadow p-5">
      <p className="text-sm text-gray-500 mb-2">{title}</p>
      <p className="text-2xl font-semibold">{value}</p>
      {pct !== null && (
        <div className="w-full h-2 bg-gray-200 rounded mt-3" aria-label={`${title} progress`}>
          <div className="h-2 rounded" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#111827,#4B5563)" }} />
        </div>
      )}
    </div>
  );
}
export default DashboardStats;
