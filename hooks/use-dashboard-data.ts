// hooks/use-dashboard-data.ts
"use client"

import { useEffect, useState } from "react"
import { useApi } from "@/components/providers/api-provider"

// Minimal shapes — adjust fields to your real API as needed
export type Appointment = Record<string, unknown>
export type Message = Record<string, unknown>
export type Progress = Record<string, unknown>

type DashboardData = {
  appointments: Appointment[]
  messages: Message[]
  progress: Progress | null
  loading: boolean
  error: string | null
}

export function useDashboardData(): DashboardData {
  const api = useApi()

  // ✅ Give state explicit types so it won't default to never[]
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [progress, setProgress] = useState<Progress | null>(null)

  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        // ✅ Tell TS what we expect back
        const [appointmentsData, messagesData, progressData] = await Promise.all([
          api.getAppointments() as Promise<Appointment[]>,
          api.getMessages() as Promise<Message[]>,
          api.getProgress() as Promise<Progress>,
        ])

        if (cancelled) return

        // ✅ Always set arrays with array types
        setAppointments(Array.isArray(appointmentsData) ? appointmentsData : [])
        setMessages(Array.isArray(messagesData) ? messagesData : [])
        setProgress(progressData ?? null)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to load dashboard data")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [api])

  return { appointments, messages, progress, loading, error }
}
