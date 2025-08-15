"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { TrendingUp, Target, Award, AlertTriangle, CheckCircle2 } from "lucide-react"

interface AutomatedGoal {
  id: string
  title: string
  type: "medication_adherence" | "appointment_attendance" | "wellness_score" | "activity_completion"
  target: number
  current: number
  unit: string
  timeframe: "daily" | "weekly" | "monthly"
  automated: boolean
  lastUpdated: string
}

interface ProgressAlert {
  id: string
  type: "milestone" | "warning" | "achievement"
  message: string
  goalId: string
  timestamp: string
  acknowledged: boolean
}

export default function ProgressAutomation() {
  const [automatedGoals, setAutomatedGoals] = useState<AutomatedGoal[]>([
    {
      id: "1",
      title: "Medication Adherence",
      type: "medication_adherence",
      target: 95,
      current: 88,
      unit: "%",
      timeframe: "weekly",
      automated: true,
      lastUpdated: "2024-01-15T10:30:00Z",
    },
    {
      id: "2",
      title: "Appointment Attendance",
      type: "appointment_attendance",
      target: 100,
      current: 92,
      unit: "%",
      timeframe: "monthly",
      automated: true,
      lastUpdated: "2024-01-15T09:15:00Z",
    },
    {
      id: "3",
      title: "Daily Wellness Check-ins",
      type: "wellness_score",
      target: 7,
      current: 6.2,
      unit: "/10",
      timeframe: "weekly",
      automated: true,
      lastUpdated: "2024-01-15T08:45:00Z",
    },
    {
      id: "4",
      title: "Recovery Activities",
      type: "activity_completion",
      target: 5,
      current: 3,
      unit: "activities",
      timeframe: "weekly",
      automated: true,
      lastUpdated: "2024-01-15T07:20:00Z",
    },
  ])

  const [progressAlerts, setProgressAlerts] = useState<ProgressAlert[]>([
    {
      id: "1",
      type: "warning",
      message: "Medication adherence below target (88% vs 95% goal)",
      goalId: "1",
      timestamp: "2024-01-15T10:30:00Z",
      acknowledged: false,
    },
    {
      id: "2",
      type: "achievement",
      message: "Great job! You've maintained 92% appointment attendance this month",
      goalId: "2",
      timestamp: "2024-01-15T09:15:00Z",
      acknowledged: false,
    },
    {
      id: "3",
      type: "milestone",
      message: "You're 60% towards your weekly recovery activities goal",
      goalId: "4",
      timestamp: "2024-01-15T07:20:00Z",
      acknowledged: false,
    },
  ])

  const [automationSettings, setAutomationSettings] = useState({
    dailyProgressUpdates: true,
    weeklyReports: true,
    goalReminders: true,
    achievementNotifications: true,
    warningAlerts: true,
  })

  useEffect(() => {
    // Simulate automated progress tracking
    const interval = setInterval(() => {
      setAutomatedGoals((prev) =>
        prev.map((goal) => {
          if (goal.automated) {
            // Simulate small progress updates
            const increment = Math.random() * 2 - 1 // Random between -1 and 1
            const newCurrent = Math.max(0, Math.min(goal.target * 1.2, goal.current + increment))

            return {
              ...goal,
              current: Math.round(newCurrent * 10) / 10,
              lastUpdated: new Date().toISOString(),
            }
          }
          return goal
        }),
      )
    }, 30000) // Update every 30 seconds for demo

    return () => clearInterval(interval)
  }, [])

  const toggleGoalAutomation = (goalId: string) => {
    setAutomatedGoals((prev) =>
      prev.map((goal) => (goal.id === goalId ? { ...goal, automated: !goal.automated } : goal)),
    )
  }

  const acknowledgeAlert = (alertId: string) => {
    setProgressAlerts((prev) => prev.map((alert) => (alert.id === alertId ? { ...alert, acknowledged: true } : alert)))
  }

  const getProgressPercentage = (goal: AutomatedGoal) => {
    return Math.min(100, (goal.current / goal.target) * 100)
  }

  const getAlertIcon = (type: ProgressAlert["type"]) => {
    switch (type) {
      case "achievement":
        return <Award className="h-4 w-4 text-green-600" />
      case "milestone":
        return <Target className="h-4 w-4 text-blue-600" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      default:
        return <CheckCircle2 className="h-4 w-4 text-gray-600" />
    }
  }

  const getAlertColor = (type: ProgressAlert["type"]) => {
    switch (type) {
      case "achievement":
        return "bg-green-50 border-green-200"
      case "milestone":
        return "bg-blue-50 border-blue-200"
      case "warning":
        return "bg-orange-50 border-orange-200"
      default:
        return "bg-gray-50 border-gray-200"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-6 w-6 text-cyan-600" />
        <h2 className="text-2xl font-bold text-gray-900">Automated Progress Tracking</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Automated Goals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {automatedGoals.map((goal) => (
                  <div key={goal.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{goal.title}</h4>
                        <p className="text-sm text-gray-600">
                          {goal.current}
                          {goal.unit} of {goal.target}
                          {goal.unit} ({goal.timeframe})
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={goal.automated ? "default" : "secondary"}>
                          {goal.automated ? "Auto" : "Manual"}
                        </Badge>
                        <Switch checked={goal.automated} onCheckedChange={() => toggleGoalAutomation(goal.id)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{Math.round(getProgressPercentage(goal))}%</span>
                      </div>
                      <Progress value={getProgressPercentage(goal)} className="h-2" />
                    </div>
                    <p className="text-xs text-gray-500">Last updated: {new Date(goal.lastUpdated).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Automation Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Daily Progress Updates</h4>
                    <p className="text-sm text-gray-600">Automatically track daily activities and medication</p>
                  </div>
                  <Switch
                    checked={automationSettings.dailyProgressUpdates}
                    onCheckedChange={(checked) =>
                      setAutomationSettings((prev) => ({ ...prev, dailyProgressUpdates: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Weekly Reports</h4>
                    <p className="text-sm text-gray-600">Generate automated weekly progress summaries</p>
                  </div>
                  <Switch
                    checked={automationSettings.weeklyReports}
                    onCheckedChange={(checked) =>
                      setAutomationSettings((prev) => ({ ...prev, weeklyReports: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Goal Reminders</h4>
                    <p className="text-sm text-gray-600">Send reminders when falling behind on goals</p>
                  </div>
                  <Switch
                    checked={automationSettings.goalReminders}
                    onCheckedChange={(checked) =>
                      setAutomationSettings((prev) => ({ ...prev, goalReminders: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Achievement Notifications</h4>
                    <p className="text-sm text-gray-600">Celebrate when reaching milestones</p>
                  </div>
                  <Switch
                    checked={automationSettings.achievementNotifications}
                    onCheckedChange={(checked) =>
                      setAutomationSettings((prev) => ({ ...prev, achievementNotifications: checked }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Progress Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {progressAlerts
                .filter((alert) => !alert.acknowledged)
                .map((alert) => (
                  <div key={alert.id} className={`p-3 rounded-lg border ${getAlertColor(alert.type)}`}>
                    <div className="flex items-start gap-2">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{new Date(alert.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="mt-2 h-6 px-2 text-xs"
                    >
                      Acknowledge
                    </Button>
                  </div>
                ))}
              {progressAlerts.filter((alert) => !alert.acknowledged).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No new alerts</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
