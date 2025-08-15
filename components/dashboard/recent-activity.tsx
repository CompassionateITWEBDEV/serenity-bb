import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Calendar, MessageCircle, FileText, Gamepad2, Clock } from "lucide-react"

export function RecentActivity() {
  const activities = [
    {
      id: 1,
      type: "session",
      title: "Completed therapy session",
      description: "Individual session with Dr. Johnson",
      time: "2 hours ago",
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      id: 2,
      type: "game",
      title: "Played Mindfulness Maze",
      description: "Achieved new high score: 850 points",
      time: "5 hours ago",
      icon: Gamepad2,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      id: 3,
      type: "appointment",
      title: "Scheduled appointment",
      description: "Group therapy for Friday",
      time: "1 day ago",
      icon: Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      id: 4,
      type: "message",
      title: "Received message",
      description: "From your care coordinator",
      time: "2 days ago",
      icon: MessageCircle,
      color: "text-cyan-600",
      bgColor: "bg-cyan-100",
    },
    {
      id: 5,
      type: "resource",
      title: "Downloaded resource",
      description: "Coping strategies guide",
      time: "3 days ago",
      icon: FileText,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="bg-gray-100 p-2 rounded-lg">
            <Clock className="h-5 w-5 text-gray-600" />
          </div>
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = activity.icon
            return (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${activity.bgColor} flex-shrink-0`}>
                  <Icon className={`h-4 w-4 ${activity.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                  <p className="text-sm text-gray-600">{activity.description}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
