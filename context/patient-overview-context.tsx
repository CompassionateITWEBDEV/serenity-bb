"use client"
import { createContext, useContext, type ReactNode } from "react"
import { usePatientOverview } from "@/hooks/use-patient-overview"
import type { Overview } from "@/app/api/overview/store"

type Ctx = { overview?: Overview; isNew?: boolean; isLoading: boolean; error?: string }
const PatientOverviewContext = createContext<Ctx | null>(null)

export function PatientOverviewProvider({ patientId, children }: { patientId: string; children: ReactNode }) {
  const { overview, isNew, isLoading, error } = usePatientOverview(patientId)
  return <PatientOverviewContext.Provider value={{ overview, isNew, isLoading, error }}>{children}</PatientOverviewContext.Provider>
}

export function useOverview() {
  const ctx = useContext(PatientOverviewContext)
  if (!ctx) throw new Error("useOverview must be used within PatientOverviewProvider")
  return ctx
}
