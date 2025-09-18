// FILE: components/dashboard/upcoming-appointments.tsx
"use client";

import React, { useMemo } from "react";
import { usePatientOverview } from "@/context/patient-overview-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

// Local shape; tolerate backends without appointments today
type Appt = {
  id: string | number;
  title: string;
  at: string;                 // ISO datetime
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
  const { overview, loading } = usePatientOverview();

  if (loading && !overview) return <SkeletonAppts />;

  // Safely read appointments; default empty
  const appts: Appt[] = useMemo(() => {
    const list = (overview as any)?.appointments as Appt[] | undefined;
    if (!Array.isArray(list)) return [];
    return [...list]
      .filter((a) => a && typeof a.at === "string")
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
      .slice(0, 3);
  }, [overview]);

  if (appts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-600 text-sm">No upcoming appointments. Schedule your next session.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
                <div className="flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" /> {dateStr}
                </div>
                {timeStr && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" /> {timeStr}
                  </div>
                )}
                {a.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> {a.location}
                  </div>
                )}
              </div>

              <div className="mt-3">
                <Button variant="outline" size="sm">Reschedule</Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function SkeletonAppts() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-56 bg-gray-200 rounded animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-20 w-full bg-gray-200 rounded animate-pulse" />
        ))}
      </CardContent>
    </Card>
  );
}
