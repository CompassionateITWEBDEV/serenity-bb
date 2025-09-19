// FILE: context/patient-overview-context.tsx
"use client";

/**
 * Patient overview context with optional patientId.
 * Exposes `useOverview` alias used by dashboard widgets.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

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

const OverviewCtx = createContext<Ctx | null>(null);

function seed(patientId?: string): Overview {
  // Safe SSR defaults; replace with real API fetch using patientId.
  return {
    daysInProgram: 42,
    sessionsCompleted: 12,
    goalsAchieved: "4/7",
    progressScore: 68,
    treatmentProgress: [
      {
        title: "Initial Assessment",
        subtitle: "Completed",
        status: "Completed",
        percent: 100,
        date: "2025-07-01",
      },
      {
        title: "Chelation Therapy",
        subtitle: "Ongoing",
        status: "In Progress",
        percent: 55,
        date: null,
      },
      {
        title: "Nutritional Support",
        subtitle: "Weekly",
        status: "Ongoing",
        percent: 70,
        date: null,
      },
      {
        title: "Cognitive Rehab",
        subtitle: "Upcoming session",
        status: "Upcoming",
        percent: null,
        date: "2025-09-25",
      },
    ],
    displayName: patientId ? `Patient #${patientId.slice(0, 6)}` : "Patient",
  };
}

export function PatientOverviewProvider({
  children,
  patientId,
}: {
  children: React.ReactNode;
  patientId?: string;
}) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // TODO: replace with real fetch(`/api/patients/${patientId}/overview`)
        const data = seed(patientId);
        if (!cancelled) {
          setOverview(data);
          setIsNew(data.sessionsCompleted === 0);
        }
      } catch {
        if (!cancelled) setOverview(seed(patientId));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const value = useMemo(
    () => ({ overview, isLoading, isNew }),
    [overview, isLoading, isNew]
  );

  return <OverviewCtx.Provider value={value}>{children}</OverviewCtx.Provider>;
}

export function usePatientOverview(): Ctx {
  const ctx = useContext(OverviewCtx);
  if (!ctx) throw new Error("usePatientOverview must be used within PatientOverviewProvider");
  return ctx;
}

/** Alias used by dashboard widgets */
export const useOverview = usePatientOverview;
