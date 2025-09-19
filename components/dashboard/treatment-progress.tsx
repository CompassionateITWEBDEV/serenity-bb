import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Circle, Clock } from "lucide-react"

export function TreatmentProgress() {
  const milestones = [
    {
      title: "Initial Assessment",
      status: "completed",
      date: "Jan 15, 2024",
      description: "Comprehensive evaluation and treatment planning",
    },
    {
      title: "Detoxification Phase",
      status: "completed",
      date: "Jan 22, 2024",
      description: "Safe withdrawal management and stabilization",
    },
    {
      title: "Individual Therapy",
      status: "in-progress",
      date: "Ongoing",
      description: "Weekly one-on-one counseling sessions",
      progress: 75,
    },
    {
      title: "Group Therapy",
      status: "in-progress",
      date: "Ongoing",
      description: "Peer support and group counseling",
      progress: 60,
    },
    {
      title: "Relapse Prevention",
      status: "upcoming",
      date: "Mar 15, 2024",
      description: "Coping strategies and long-term planning",
    },
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "in-progress":
        return <Clock className="h-5 w-5 text-yellow-600" />
      default:
        return <Circle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Completed
          </Badge>
        )
      case "in-progress":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            In Progress
          </Badge>
        )
      default:
        return <Badge variant="outline">Upcoming</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="bg-cyan-100 p-2 rounded-lg">
            <CheckCircle className="h-5 w-5 text-cyan-600" />
          </div>
          Treatment Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {milestones.map((milestone, index) => (
            <div key={index} className="flex items-start space-x-4">
              <div className="flex-shrink-0 mt-1">{getStatusIcon(milestone.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium text-gray-900">{milestone.title}</h4>
                  {getStatusBadge(milestone.status)}
                </div>
                <p className="text-sm text-gray-600 mb-2">{milestone.description}</p>
                <p className="text-xs text-gray-500">{milestone.date}</p>
                {milestone.progress && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{milestone.progress}%</span>
                    </div>
                    <Progress value={milestone.progress} className="h-2" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
