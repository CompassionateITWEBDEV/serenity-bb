import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Heart, Smile, Moon, Droplets } from "lucide-react"

export function WellnessTracker() {
  const metrics = [
    {
      title: "Mood",
      value: 8,
      max: 10,
      icon: Smile,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    {
      title: "Sleep",
      value: 7,
      max: 10,
      icon: Moon,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
    },
    {
      title: "Hydration",
      value: 6,
      max: 8,
      icon: Droplets,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Stress Level",
      value: 3,
      max: 10,
      icon: Heart,
      color: "text-green-600",
      bgColor: "bg-green-100",
      inverted: true, // Lower is better
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="bg-pink-100 p-2 rounded-lg">
            <Heart className="h-5 w-5 text-pink-600" />
          </div>
          Daily Wellness
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {metrics.map((metric) => {
            const Icon = metric.icon
            const percentage = (metric.value / metric.max) * 100
            const displayPercentage = metric.inverted ? 100 - percentage : percentage

            return (
              <div key={metric.title} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded ${metric.bgColor}`}>
                      <Icon className={`h-3 w-3 ${metric.color}`} />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{metric.title}</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {metric.value}/{metric.max}
                  </span>
                </div>
                <Progress value={displayPercentage} className="h-2" />
              </div>
            )
          })}

          <Button variant="outline" size="sm" className="w-full mt-4 bg-transparent">
            Update Today's Metrics
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
