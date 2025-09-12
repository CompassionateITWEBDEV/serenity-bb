"use client"

import { useEffect, useRef, useState } from "react"
import { apiClient } from "@/lib/api-client"

export interface Notification {
  id: number
  type: string
  title: string
  message: string
  priority: "low" | "medium" | "high"
  created_at: string
}

interface UseNotificationsOptions {
  onNotification?: (notification: Notification) => void
}

const WS_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/^http/, "ws")

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { onNotification } = options
  const [notifications, setNotifications] = useState<Notification[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const retryRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const connect = () => {
      if (typeof window === "undefined" || !("WebSocket" in window)) {
        poll()
        return
      }
      const ws = new WebSocket(`${WS_BASE}/notifications/ws`)
      wsRef.current = ws

      ws.onmessage = (event) => {
        const data: Notification = JSON.parse(event.data)
        setNotifications((prev) => [data, ...prev])
        onNotification?.(data)
      }

      ws.onclose = () => {
        retryRef.current = setTimeout(connect, 3000)
      }
    }

    const poll = async () => {
      try {
        const data = await apiClient.getNotifications()
        setNotifications(data)
      } catch (err) {
        console.error("Notification polling failed", err)
      } finally {
        retryRef.current = setTimeout(poll, 10000)
      }
    }

    connect()

    return () => {
      wsRef.current?.close()
      if (retryRef.current) clearTimeout(retryRef.current)
    }
  }, [onNotification])

  return { notifications }
}
