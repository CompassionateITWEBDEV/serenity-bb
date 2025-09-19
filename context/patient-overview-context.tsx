// FILE: context/patient-overview-context.tsx
"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Overview = {
  daysInProgram: number;
  sessionsCompleted: number;
  goalsAchieved: string;
  progressScore: number; // 0..100
  treatmentProgress: Array<{
    title: string;
    subtitle: string;
    status: "Completed" | "In Progress" | "Upcoming" | "Ongoing";
    percent?: number | null;
    date?: string | null;
  }>;
  displayName?: string | null;
};

type Ctx = { overview: Overview | null; isLoading: boolean; isNew: boolean };
const Ctx = createContext<Ctx | null>(null);

function seed(): Overview {
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
    const data = seed();
    setOverview(data);
    setIsNew(data.sessionsCompleted === 0);
    setLoading(false);
  }, []);

  const value = useMemo(() => ({ overview, isLoading, isNew }), [overview, isLoading, isNew]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePatientOverview(): Ctx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePatientOverview must be used within PatientOverviewProvider");
  return ctx;
}

// alias used by widgets
export const useOverview = usePatientOverview;
