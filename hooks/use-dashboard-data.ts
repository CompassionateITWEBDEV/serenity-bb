"use client"

import { useState, useEffect } from "react"
import { apiClient } from "@/lib/api-client"

export function useDashboardData() {
  const [appointments, setAppointments] = useState([])
  const [messages, setMessages] = useState([])
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        const [appointmentsData, messagesData, progressData] = await Promise.all([
          apiClient.getAppointments().catch(() => []),
          apiClient.getMessages().catch(() => []),
          apiClient.getProgress().catch(() => null),
        ])

        setAppointments(appointmentsData)
        setMessages(messagesData)
        setProgress(progressData)
      } catch (err) {
        setError("Failed to load dashboard data")
        console.error("Dashboard data fetch error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const createAppointment = async (appointmentData: any) => {
    try {
      const newAppointment = await apiClient.createAppointment(appointmentData)
      setAppointments((prev) => [...prev, newAppointment])
      return { success: true }
    } catch (error) {
      return { success: false, error: "Failed to create appointment" }
    }
  }

  const sendMessage = async (messageData: any) => {
    try {
      const newMessage = await apiClient.sendMessage(messageData)
      setMessages((prev) => [...prev, newMessage])
      return { success: true }
    } catch (error) {
      return { success: false, error: "Failed to send message" }
    }
  }

  const updateProgress = async (progressData: any) => {
    try {
      const updatedProgress = await apiClient.updateProgress(progressData)
      setProgress(updatedProgress)
      return { success: true }
    } catch (error) {
      return { success: false, error: "Failed to update progress" }
    }
  }

  return {
    appointments,
    messages,
    progress,
    loading,
    error,
    createAppointment,
    sendMessage,
    updateProgress,
  }
}
