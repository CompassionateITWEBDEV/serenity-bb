"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Overview = {
  daysInProgram: number;
  sessionsCompleted: number;
  goalsAchieved: string;     // e.g., "4/7"
  progressScore: number;     // 0..100
  treatmentProgress: Array<{
    title: string;
    subtitle: string;
    status: "Completed" | "In Progress" | "Upcoming" | "Ongoing";
    percent?: number | null;
    date?: string | null;
  }>;
  displayName?: string | null;
};

type OverviewContextValue = {
  overview: Overview | null;
  isLoading: boolean;
  isNew: boolean;
};

const OverviewCtx = createContext<OverviewContextValue | null>(null);

function seedOverview(): Overview {
  return {
    daysInProgram: 42,
    sessionsCompleted: 12,
    goalsAchieved: "4/7",
    progressScore: 68,
    treatmentProgress: [
      { title: "Initial Assessment", subtitle: "Completed", status: "Completed", percent: 100, date: "2025-07-01" },
      { title: "Chelation Therapy", subtitle: "Ongoing", status: "In Progress", percent: 55, date: null },
      { title: "Nutritional Support", subtitle: "Weekly", status: "Ongoing", percent: 70, date: null },
      { title: "Cognitive Rehab", subtitle: "Upcoming session", status: "Upcoming", percent: null, date: "2025-09-25" },
    ],
    displayName: "Patient",
  };
}

export function PatientOverviewProvider({ children }: { children: React.ReactNode }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    // Why: provide safe SSR/prerender defaults; replace with real fetch later.
    const data = seedOverview();
    setOverview(data);
    setIsNew(data.sessionsCompleted === 0);
    setLoading(false);
  }, []);

  const value = useMemo(() => ({ overview, isLoading, isNew }), [overview, isLoading, isNew]);
  return <OverviewCtx.Provider value={value}>{children}</OverviewCtx.Provider>;
}

export function usePatientOverview(): OverviewContextValue {
  const ctx = useContext(OverviewCtx);
  if (!ctx) throw new Error("usePatientOverview must be used within PatientOverviewProvider");
  return ctx;
}

/** Alias expected by your dashboard widgets to stop the import error */
export const useOverview = usePatientOverview;


// FILE: components/dashboard/live-treatment-progress.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useOverview } from "@/context/patient-overview-context";

function StatusBadge({ status }: { status: "Completed" | "In Progress" | "Upcoming" | "Ongoing" }) {
  const cls: Record<typeof status, string> = {
    Completed: "bg-emerald-100 text-emerald-700",
    "In Progress": "bg-amber-100 text-amber-700",
    Upcoming: "bg-gray-100 text-gray-700",
    Ongoing: "bg-blue-100 text-blue-700",
  } as const;
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${cls[status]}`}>{status}</span>;
}

export function TreatmentProgress() {
  const { overview, isLoading } = useOverview();

  if (isLoading || !overview) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="h-6 w-40 rounded bg-gray-200 animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-48 rounded bg-gray-200 animate-pulse" />
              <div className="h-2 w-full rounded bg-gray-200 animate-pulse" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Treatment Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {overview.treatmentProgress.map((step, idx) => {
          const pct = typeof step.percent === "number" ? Math.max(0, Math.min(100, step.percent)) : null;
          return (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{step.title}</div>
                  <div className="text-sm text-gray-600">{step.subtitle}</div>
                </div>
                <StatusBadge status={step.status} />
              </div>
              {pct !== null && <Progress value={pct} aria-label={`${step.title} ${pct}%`} />}
              {step.date && <div className="text-xs text-gray-500">Next: {step.date}</div>}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// Back-compat so both default and named imports work
export default TreatmentProgress;
export const LiveTreatmentProgress = TreatmentProgress;
