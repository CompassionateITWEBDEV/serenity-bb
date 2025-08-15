import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Calendar, Clock, Target, TrendingUp } from "lucide-react"

export function DashboardStats() {
  const stats = [
    {
      title: "Days in Program",
      value: "45",
      icon: Calendar,
      color: "text-cyan-600",
      bgColor: "bg-cyan-100",
    },
    {
      title: "Sessions Completed",
      value: "12",
      icon: Clock,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Goals Achieved",
      value: "8/10",
      icon: Target,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
    },
    {
      title: "Progress Score",
      value: "85%",
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              {stat.title === "Progress Score" && <Progress value={85} className="mt-2" />}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
