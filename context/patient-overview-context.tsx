// ============================================================================
// File: context/patient-overview-context.tsx  (SAFER HOOK; NO THROW)
// ============================================================================
"use client"

import { createContext, useContext, type ReactNode } from "react"
import { usePatientOverview } from "@/hooks/use-patient-overview"
import type { Overview } from "@/app/api/overview/store"

type Ctx = { overview?: Overview; isNew?: boolean; isLoading: boolean; error?: string }
const PatientOverviewContext = createContext<Ctx | undefined>(undefined)

export function PatientOverviewProvider({
  patientId,
  children,
}: {
  patientId?: string
  children: ReactNode
}) {
  // Why: tolerate missing/late patientId instead of crashing
  const { overview, isNew, isLoading, error } = usePatientOverview(patientId)
  return (
    <PatientOverviewContext.Provider value={{ overview, isNew, isLoading, error }}>
      {children}
    </PatientOverviewContext.Provider>
  )
}

export function useOverview(): Ctx {
  // Why: never throw; return a safe default to avoid client-side exception
  return useContext(PatientOverviewContext) ?? { isLoading: true }
}
