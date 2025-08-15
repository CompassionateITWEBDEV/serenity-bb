import type React from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { SmartAlertProvider } from "@/components/alerts/smart-alert-provider"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <SmartAlertProvider>
        {children}

        {/* Keeping only the SmartAlertProvider for essential notifications */}
      </SmartAlertProvider>
    </ProtectedRoute>
  )
}
