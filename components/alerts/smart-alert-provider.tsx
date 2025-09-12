"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { useNotifications } from "@/hooks/use-notifications"
import { SmartAlert } from "./smart-alert"

interface Alert {
  id: string
  type: "info" | "success" | "warning" | "mindfulness" | "educational" | "progress"
  title: string
  message: string
  action?: {
    label: string
    onClick: () => void
  }
  duration?: number
  priority: "low" | "medium" | "high"
  context?: string
  interactive?: boolean
}

interface SmartAlertContextType {
  alerts: Alert[]
  addAlert: (alert: Omit<Alert, "id">) => void
  removeAlert: (id: string) => void
  clearAlerts: () => void
}

const SmartAlertContext = createContext<SmartAlertContextType | undefined>(undefined)

export function SmartAlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([])

  const addAlert = (alert: Omit<Alert, "id">) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newAlert = { ...alert, id }

    setAlerts((prev) => {
      // Remove existing alerts of same type if priority is high
      if (alert.priority === "high") {
        return [newAlert, ...prev.filter((a) => a.type !== alert.type)]
      }
      return [newAlert, ...prev]
    })

    // Auto-remove alert after duration
    if (alert.duration && alert.duration > 0) {
      setTimeout(() => {
        removeAlert(id)
      }, alert.duration)
    }
  }

  useNotifications({
    onNotification: (n) =>
      addAlert({
        type: n.type as Alert["type"],
        title: n.title,
        message: n.message,
        priority: n.priority as Alert["priority"],
      }),
  })

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id))
  }

  const clearAlerts = () => {
    setAlerts([])
  }

  return (
    <SmartAlertContext.Provider value={{ alerts, addAlert, removeAlert, clearAlerts }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {alerts.map((alert) => (
          <SmartAlert key={alert.id} alert={alert} onClose={() => removeAlert(alert.id)} />
        ))}
      </div>
    </SmartAlertContext.Provider>
  )
}

export function useSmartAlerts() {
  const context = useContext(SmartAlertContext)
  if (!context) {
    throw new Error("useSmartAlerts must be used within SmartAlertProvider")
  }
  return context
}
