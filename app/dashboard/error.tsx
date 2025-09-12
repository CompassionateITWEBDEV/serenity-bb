"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Dashboard error:", error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <AlertCircle className="h-16 w-16 text-red-500" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Error</h2>
          <p className="text-gray-600">There was a problem loading your dashboard. This might be a temporary issue.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={reset}>Retry Dashboard</Button>
          <Button variant="outline" onClick={() => (window.location.href = "/login")}>
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  )
}
