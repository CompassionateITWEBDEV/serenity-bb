"use client"
import { useEffect, useRef, useState } from "react"
export type { Overview } from "@/app/api/overview/store"

type Ready = { status: "ready"; overview: import("@/app/api/overview/store").Overview; isNew: boolean }
type State = { status: "idle" | "loading" } | Ready | { status: "error"; error: string }

export function usePatientOverview(patientId?: string) {
  const [state, setState] = useState<State>({ status: "idle" })
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!patientId) {
      setState({ status: "error", error: "Missing patientId" })
      return
    }
    let cancelled = false
    setState({ status: "loading" })

    fetch(`/api/overview?patientId=${encodeURIComponent(patientId)}`, { cache: "no-store" })
      .then(async (r) => (r.ok ? r.json() : Promise.reject(await r.text())))
      .then((payload: { overview: any; isNew: boolean }) => {
        if (cancelled) return
        setState({ status: "ready", overview: payload.overview, isNew: payload.isNew })
        const es = new EventSource(`/api/overview/stream?patientId=${encodeURIComponent(patientId)}`)
        esRef.current = es
        es.addEventListener("overview", (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data) as { overview: any; isNew?: boolean }
            setState({ status: "ready", overview: data.overview, isNew: !!data.isNew })
          } catch {}
        })
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
