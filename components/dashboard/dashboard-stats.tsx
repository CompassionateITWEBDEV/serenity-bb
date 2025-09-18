"use client";
import React from "react";
import { usePatientOverview } from "@/context/patient-overview-context";

export function DashboardStats() {
  const { overview, loading } = usePatientOverview();
  if (loading || !overview) return <div className="rounded-2xl shadow p-5">Loading stats…</div>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard title="Days in Program" value={overview.daysInProgram} />
      <StatCard title="Sessions Completed" value={overview.sessionsCompleted} />
      <StatCard title="Goals Achieved" value={overview.goalsAchieved} />
      <StatCard title="Progress Score" value={`${overview.progressScore}%`} bar={overview.progressScore} />
    </div>
  );
}

function StatCard({ title, value, bar }: { title: string; value: string | number; bar?: number }) {
  return (
    <div className="rounded-2xl shadow p-5">
      <p className="text-sm text-gray-500 mb-2">{title}</p>
      <p className="text-2xl font-semibold">{value}</p>
      {typeof bar === "number" && (
        <div className="w-full h-2 bg-gray-200 rounded mt-3">
          <div className="h-2 rounded" style={{ width: `${bar}%`, background: "linear-gradient(90deg,#111827,#4B5563)" }} />
        </div>
      )}
    </div>
  );
}
