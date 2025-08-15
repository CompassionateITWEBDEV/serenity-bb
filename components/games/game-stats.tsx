import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Clock, Target, Zap } from "lucide-react"

export function GameStats() {
  const stats = [
    {
      title: "Games Played",
      value: "24",
      icon: Target,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      change: "+3 this week",
    },
    {
      title: "Total Play Time",
      value: "4.2h",
      icon: Clock,
      color: "text-green-600",
      bgColor: "bg-green-100",
      change: "+45m this week",
    },
    {
      title: "High Scores",
      value: "8",
      icon: Trophy,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
      change: "+2 this week",
    },
    {
      title: "Streak",
      value: "5 days",
      icon: Zap,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      change: "Keep it up!",
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
              <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <p className="text-xs text-gray-600">{stat.change}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
