"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Calendar, Clock, Target, TrendingUp } from "lucide-react"
import { useOverview } from "@/context/patient-overview-context"

export function LiveDashboardStats() {
  const { overview, isNew, isLoading } = useOverview()

  if (isLoading || !overview) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardHeader className="flex justify-between pb-2"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /><div className="h-6 w-6 bg-gray-200 rounded animate-pulse" /></CardHeader><CardContent><div className="h-7 w-16 bg-gray-200 rounded animate-pulse" /></CardContent></Card>
        ))}
      </div>
    )
  }

  const s = overview.stats
  const stats = [
    { title: "Days in Program", value: String(s.daysInProgram), icon: Calendar, bubble: "bg-cyan-100", color: "text-cyan-600" },
    { title: "Sessions Completed", value: String(s.sessionsCompleted), icon: Clock, bubble: "bg-emerald-100", color: "text-emerald-600" },
    { title: "Goals Achieved", value: `${s.goalsAchieved}/${s.goalsTotal}`, icon: Target, bubble: "bg-amber-100", color: "text-amber-600" },
    { title: "Progress Score", value: `${s.progressPercent}%`, icon: TrendingUp, bubble: "bg-indigo-100", color: "text-indigo-600" },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map(({ title, value, icon: Icon, bubble, color }) => (
        <Card key={title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{title}{isNew && title === "Progress Score" ? " (New)" : ""}</CardTitle>
            <div className={`p-2 rounded-lg ${bubble}`}><Icon className={`h-4 w-4 ${color}`} /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            {title === "Progress Score" && <Progress value={s.progressPercent} className="mt-2" />}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
