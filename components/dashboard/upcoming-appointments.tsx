"use client";
import React, { useMemo } from "react";
import { usePatientOverview } from "@/context/patient-overview-context";

type Appt = {
  id: string | number;
  title: string;
  at: string;
  provider?: string | null;
  location?: string | null;
  status: "Confirmed" | "Pending" | "Cancelled";
};

function ApptBadge({ status }: { status: Appt["status"] }) {
  const map = {
    Confirmed: "bg-emerald-100 text-emerald-700",
    Pending: "bg-amber-100 text-amber-700",
    Cancelled: "bg-rose-100 text-rose-700",
  } as const;
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${map[status]}`}>{status}</span>;
}

export function UpcomingAppointments() {
  const { overview, loading, error } = usePatientOverview();

  if (loading && !overview) {
    return (
      <div className="rounded-2xl shadow p-5">
        <div className="h-5 w-56 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-20 w-full bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }
  if (error && !overview) {
    return <div className="rounded-2xl shadow p-5 text-sm text-red-600">{error}</div>;
  }

  const appts: Appt[] = useMemo(() => {
    const list = (overview as any)?.appointments as Appt[] | undefined;
    if (!Array.isArray(list)) return [];
    return list
      .filter((a) => a && typeof a.at === "string")
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
      .slice(0, 3);
  }, [overview]);

  if (appts.length === 0) {
    return <div className="rounded-2xl shadow p-5 text-sm text-gray-600">No upcoming appointments.</div>;
  }

  return (
    <div className="rounded-2xl shadow p-5">
      <h2 className="text-lg font-semibold mb-4">Upcoming Appointments</h2>
      <div className="space-y-4">
        {appts.map((a) => {
          const d = new Date(a.at);
          const dateStr = Number.isFinite(d.getTime()) ? d.toLocaleDateString() : a.at;
          const timeStr = Number.isFinite(d.getTime())
            ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "";
          return (
            <div key={a.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">
                  {a.title}
                  {a.provider ? ` with ${a.provider}` : ""}
                </div>
                <ApptBadge status={a.status} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-700">
                <div className="flex items-center gap-1">📅 {dateStr}</div>
                {timeStr && <div className="flex items-center gap-1">⏰ {timeStr}</div>}
                {a.location && <div className="flex items-center gap-1">📍 {a.location}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default UpcomingAppointments;
