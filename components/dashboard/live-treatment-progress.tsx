"use client"
import { useOverview } from "@/context/patient-overview-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

function Badge({ status }: { status: "Completed" | "In Progress" | "Upcoming" }) {
  const map = {
    Completed: "bg-emerald-100 text-emerald-700",
    "In Progress": "bg-amber-100 text-amber-700",
    Upcoming: "bg-gray-100 text-gray-700",
  } as const
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${map[status]}`}>{status}</span>
}

export function LiveTreatmentProgress() {
  const { overview, isLoading } = useOverview()
  if (isLoading || !overview) return <SkeletonCard />

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Treatment Progress</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        {overview.phases.map((p) => (
          <div key={p.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-medium">{p.name}</div>
              <Badge status={p.status} />
            </div>
            <div className="text-sm text-gray-600">{p.description}</div>
            <Progress value={p.progressPercent} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function SkeletonCard() {
  return (
    <Card>
      <CardHeader><div className="h-5 w-40 bg-gray-200 rounded animate-pulse" /></CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
              <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" />
            </div>
            <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
            <div className="h-2 w-full bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
