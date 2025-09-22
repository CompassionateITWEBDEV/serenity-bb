"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "@/supabase-browser" // <- your provided client
import type { Milestone, PatientProfile } from "@/types/treatment"

interface UseTreatmentProgressResult {
  loading: boolean
  error: string | null
  milestones: Milestone[]
  patient: PatientProfile | null
  isNewPatient: boolean
  refetch: () => Promise<void>
}

function deriveIsNewPatient(profile: PatientProfile | null, milestones: Milestone[]) {
  // Why: Your app might treat non-onboarded or no-milestone patients as "new".
  if (!profile?.onboarded_at) return true
  return milestones.length === 0
}

export function useTreatmentProgress(patientId?: string): UseTreatmentProgressResult {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [patient, setPatient] = useState<PatientProfile | null>(null)
  const pidRef = useRef<string | null>(patientId ?? null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let pid = pidRef.current
      if (!pid) {
        const { data, error: authErr } = await supabase.auth.getUser()
        if (authErr) throw authErr
        pid = data.user?.id ?? null
        pidRef.current = pid
      }
      if (!pid) throw new Error("Not authenticated.")

      const [{ data: profile, error: pErr }, { data: ms, error: mErr }] = await Promise.all([
        supabase.from("patients").select("*").eq("id", pid).maybeSingle(),
        supabase
          .from("treatment_milestones")
          .select("*")
          .eq("patient_id", pid)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
      ])
      if (pErr) throw pErr
      if (mErr) throw mErr
      setPatient((profile as PatientProfile) ?? null)
      setMilestones((ms as Milestone[]) ?? [])
    } catch (e: any) {
      setError(e?.message ?? "Failed to load treatment progress.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  useEffect(() => {
    const pid = pidRef.current
    if (!pid) return
    const channel = supabase
      .channel(`rt:treatment_milestones:${pid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "treatment_milestones", filter: `patient_id=eq.${pid}` },
        (payload) => {
          setMilestones((prev) => {
            let next = prev.slice()
            if (payload.eventType === "INSERT") next.push(payload.new as Milestone)
            if (payload.eventType === "UPDATE") {
              const idx = next.findIndex((m) => m.id === (payload.new as any).id)
              if (idx >= 0) next[idx] = payload.new as Milestone
            }
            if (payload.eventType === "DELETE") {
              next = next.filter((m) => m.id !== (payload.old as any).id)
            }
            next.sort((a, b) => {
              const sa = a.sort_order ?? 0
              const sb = b.sort_order ?? 0
              if (sa !== sb) return sa - sb
              return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            })
            return next
          })
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const isNewPatient = useMemo(() => deriveIsNewPatient(patient, milestones), [patient, milestones])

  return { loading, error, milestones, patient, isNewPatient, refetch: fetchAll }
}
