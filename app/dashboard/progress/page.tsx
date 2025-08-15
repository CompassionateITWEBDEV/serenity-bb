"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, Calendar, Target, Heart, Clock, CheckCircle, ArrowUp, ArrowDown } from "lucide-react"

export default function ProgressPage() {
  const { isAuthenticated, loading, patient } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading progress...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !patient) {
    return null
  }

  const overallProgress = 68
  const weeklyGoals = [
    { name: "Medication Adherence", current: 6, target: 7, percentage: 86 },
    { name: "Therapy Sessions", current: 2, target: 2, percentage: 100 },
    { name: "Group Activities", current: 3, target: 4, percentage: 75 },
    { name: "Wellness Check-ins", current: 5, target: 7, percentage: 71 },
  ]

  const milestones = [
    { name: "30 Days Clean", date: "2024-01-15", completed: true, type: "major" },
    { name: "First Group Session", date: "2024-01-08", completed: true, type: "minor" },
    { name: "60 Days Clean", date: "2024-02-14", completed: false, type: "major" },
    { name: "Family Therapy Session", date: "2024-02-01", completed: false, type: "minor" },
  ]

  const progressMetrics = [
    {
      title: "Treatment Days",
      value: "45",
      change: "+5",
      trend: "up",
      icon: Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Wellness Score",
      value: "8.2",
      change: "+0.8",
      trend: "up",
      icon: Heart,
      color: "text-pink-600",
      bgColor: "bg-pink-100",
    },
    {
      title: "Session Attendance",
      value: "94%",
      change: "+2%",
      trend: "up",
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Goal Completion",
      value: "78%",
      change: "-3%",
      trend: "down",
      icon: Target,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ]

  const weeklyData = [
    { week: "Week 1", wellness: 6.2, attendance: 85, goals: 60 },
    { week: "Week 2", wellness: 6.8, attendance: 90, goals: 70 },
    { week: "Week 3", wellness: 7.1, attendance: 88, goals: 75 },
    { week: "Week 4", wellness: 7.5, attendance: 92, goals: 80 },
    { week: "Week 5", wellness: 7.8, attendance: 95, goals: 82 },
    { week: "Week 6", wellness: 8.2, attendance: 94, goals: 78 },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader patient={patient} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-bold text-gray-900">Progress Tracking</h1>
              <p className="text-gray-600">Monitor your recovery journey and celebrate achievements</p>
            </div>
          </div>
        </div>

        {/* Overall Progress */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Overall Recovery Progress</span>
              <Badge variant="outline" className="text-lg px-3 py-1">
                {overallProgress}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={overallProgress} className="h-4 mb-4" />
            <div className="flex justify-between text-sm text-gray-600">
              <span>Started Treatment</span>
              <span>Current Progress</span>
              <span>Recovery Goals</span>
            </div>
          </CardContent>
        </Card>

        {/* Progress Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {progressMetrics.map((metric) => (
            <Card key={metric.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                    <metric.icon className={`h-6 w-6 ${metric.color}`} />
                  </div>
                  <div
                    className={`flex items-center gap-1 text-sm ${
                      metric.trend === "up" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {metric.trend === "up" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                    {metric.change}
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
                  <div className="text-sm text-gray-600">{metric.title}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="weekly" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="weekly">Weekly Goals</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>This Week's Goals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {weeklyGoals.map((goal) => (
                  <div key={goal.name} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{goal.name}</span>
                      <span className="text-sm text-gray-600">
                        {goal.current}/{goal.target}
                      </span>
                    </div>
                    <Progress value={goal.percentage} className="h-2" />
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{goal.percentage}% complete</span>
                      <span>{goal.target - goal.current} remaining</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="milestones" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recovery Milestones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {milestones.map((milestone, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 rounded-lg border">
                      <div
                        className={`p-2 rounded-full ${
                          milestone.completed ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {milestone.completed ? <CheckCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{milestone.name}</div>
                        <div className="text-sm text-gray-600">{milestone.date}</div>
                      </div>
                      <Badge variant={milestone.type === "major" ? "default" : "outline"}>
                        {milestone.type === "major" ? "Major" : "Minor"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Progress Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {weeklyData.map((week, index) => (
                    <div key={week.week} className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{week.week}</span>
                        <div className="flex gap-4 text-sm">
                          <span className="text-pink-600">Wellness: {week.wellness}/10</span>
                          <span className="text-green-600">Attendance: {week.attendance}%</span>
                          <span className="text-blue-600">Goals: {week.goals}%</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Progress value={week.wellness * 10} className="h-2" />
                        <Progress value={week.attendance} className="h-2" />
                        <Progress value={week.goals} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
