"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

export interface Notification {
  id: string
  title: string
  message: string
  type: string
  patient_id: string
  read: boolean
  created_at: string
}

export function useNotifications(patientId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    if (!patientId) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setNotifications(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch notifications")
    } finally {
      setLoading(false)
    }
  }, [patientId, supabase])

  // Mark notification as read
  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        const { error } = await supabase.from("notifications").update({ read: true }).eq("id", notificationId)

        if (error) throw error

        setNotifications((prev) =>
          prev.map((notif) => (notif.id === notificationId ? { ...notif, read: true } : notif)),
        )
      } catch (err) {
        console.error("Failed to mark notification as read:", err)
      }
    },
    [supabase],
  )

  // Mark notification as unread
  const markAsUnread = useCallback(
    async (notificationId: string) => {
      try {
        const { error } = await supabase.from("notifications").update({ read: false }).eq("id", notificationId)

        if (error) throw error

        setNotifications((prev) =>
          prev.map((notif) => (notif.id === notificationId ? { ...notif, read: false } : notif)),
        )
      } catch (err) {
        console.error("Failed to mark notification as unread:", err)
      }
    },
    [supabase],
  )

  // Delete notification
  const deleteNotification = useCallback(
    async (notificationId: string) => {
      try {
        const { error } = await supabase.from("notifications").delete().eq("id", notificationId)

        if (error) throw error

        setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId))
      } catch (err) {
        console.error("Failed to delete notification:", err)
      }
    },
    [supabase],
  )

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("patient_id", patientId)
        .eq("read", false)

      if (error) throw error

      setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })))
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err)
    }
  }, [patientId, supabase])

  // Set up real-time subscription
  useEffect(() => {
    if (!patientId) return

    fetchNotifications()

    // Subscribe to real-time changes
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          console.log("[v0] New notification received:", payload.new)
          setNotifications((prev) => [payload.new as Notification, ...prev])
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          console.log("[v0] Notification updated:", payload.new)
          setNotifications((prev) =>
            prev.map((notif) => (notif.id === payload.new.id ? (payload.new as Notification) : notif)),
          )
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          console.log("[v0] Notification deleted:", payload.old)
          setNotifications((prev) => prev.filter((notif) => notif.id !== payload.old.id))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [patientId, fetchNotifications, supabase])

  return {
    notifications,
    loading,
    error,
    markAsRead,
    markAsUnread,
    deleteNotification,
    markAllAsRead,
    refetch: fetchNotifications,
  }
}
