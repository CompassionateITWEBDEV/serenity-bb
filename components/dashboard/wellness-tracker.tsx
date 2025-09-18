// components/dashboard/wellness-tracker.tsx
"use client"

import { useOverview } from "@/context/patient-overview-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"

// Named export to satisfy: import { WellnessTracker } from "@/components/dashboard/wellness-tracker"
export function WellnessTracker() {
  const { overview, isLoading } = useOverview()

  if (isLoading || !overview) {
    return (
      <Card>
        <CardHeader>
          <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-2 w-full bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  const items = [
    { label: "Mood", value: overview.wellness.mood, max: 10 },
    { label: "Sleep", value: overview.wellness.sleep, max: 10 },
    { label: "Hydration", value: overview.wellness.hydration, max: 10 },
    { label: "Stress Level", value: overview.wellness.stress, max: 10 },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Daily Wellness</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((b) => (
          <div key={b.label} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{b.label}</span>
              <span>{b.value}/{b.max}</span>
            </div>
            <Progress value={(b.value / b.max) * 100} />
          </div>
        ))}
        <Button className="mt-2" variant="outline" size="sm">Update Today’s Metrics</Button>
      </CardContent>
    </Card>
  )
}

// Optional: keep a default export too, so either import style works
export default WellnessTracker
