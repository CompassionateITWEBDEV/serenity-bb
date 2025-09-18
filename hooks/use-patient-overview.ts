// ============================================================================
// File: hooks/use-patient-overview.ts  (DEFENSIVE PATIENT ID + NO CRASH)
// ============================================================================
"use client"

import { useEffect, useRef, useState } from "react"
export type { Overview } from "@/app/api/overview/store"

type Ready = { status: "ready"; overview: import("@/app/api/overview/store").Overview; isNew: boolean }
type State = { status: "idle" | "loading" } | Ready | { status: "error"; error: string }

export function usePatientOverview(patientId?: string) {
  const [state, setState] = useState<State>({ status: "idle" })
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    // Wait until we have an id; don't throw
    if (!patientId) {
      setState({ status: "loading" })
      return
    }
    let cancelled = false
    setState({ status: "loading" })

    fetch(`/api/overview?patientId=${encodeURIComponent(patientId)}`, { cache: "no-store" })
      .then(async (r) => (r.ok ? r.json() : Promise.reject(await r.text())))
      .then((payload: { overview: any; isNew: boolean }) => {
        if (cancelled) return
        setState({ status: "ready", overview: payload.overview, isNew: payload.isNew })
        // Guard: EventSource exists in browser only
        if (typeof window !== "undefined" && "EventSource" in window) {
          const es = new EventSource(`/api/overview/stream?patientId=${encodeURIComponent(patientId)}`)
          esRef.current = es
          es.addEventListener("overview", (e: MessageEvent) => {
            try {
              const data = JSON.parse(e.data) as { overview: any; isNew?: boolean }
              setState({ status: "ready", overview: data.overview, isNew: !!data.isNew })
            } catch {}
          })
          es.addEventListener("error", () => {
            // Keep UI usable even if the stream hiccups
          })
        }
      })
      .catch((err) => {
        if (cancelled) return
        setState({ status: "error", error: String(err) })
      })

    return () => {
      cancelled = true
      esRef.current?.close()
    }
  }, [patientId])

  return {
    overview: state.status === "ready" ? state.overview : undefined,
    isNew: state.status === "ready" ? state.isNew : undefined,
    isLoading: state.status === "loading" || state.status === "idle",
    error: state.status === "error" ? state.error : undefined,
  }
}
