"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bell, Mail, MessageSquare, Smartphone, Settings } from "lucide-react"

interface NotificationRule {
  id: string
  name: string
  type: "appointment" | "medication" | "progress" | "emergency" | "wellness"
  channels: ("email" | "sms" | "push" | "in_app")[]
  conditions: string
  frequency: "immediate" | "daily" | "weekly"
  active: boolean
}

interface Notification {
  id: string
  title: string
  message: string
  type: "appointment" | "medication" | "progress" | "emergency" | "wellness"
  channel: "email" | "sms" | "push" | "in_app"
  status: "sent" | "delivered" | "read" | "failed"
  timestamp: string
  priority: "low" | "medium" | "high" | "urgent"
}

export default function NotificationCenter() {
  const [notificationRules, setNotificationRules] = useState<NotificationRule[]>([
    {
      id: "1",
      name: "Appointment Reminders",
      type: "appointment",
      channels: ["email", "sms", "push"],
      conditions: "24 hours before appointment",
      frequency: "immediate",
      active: true,
    },
    {
      id: "2",
      name: "Medication Alerts",
      type: "medication",
      channels: ["push", "sms"],
      conditions: "Scheduled medication time",
      frequency: "immediate",
      active: true,
    },
    {
      id: "3",
      name: "Progress Milestones",
      type: "progress",
      channels: ["email", "in_app"],
      conditions: "Goal achievement or warning",
      frequency: "immediate",
      active: true,
    },
    {
      id: "4",
      name: "Weekly Wellness Check",
      type: "wellness",
      channels: ["email", "push"],
      conditions: "Every Sunday at 6 PM",
      frequency: "weekly",
      active: true,
    },
    {
      id: "5",
      name: "Emergency Alerts",
      type: "emergency",
      channels: ["email", "sms", "push", "in_app"],
      conditions: "Critical health events",
      frequency: "immediate",
      active: true,
    },
  ])

  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([
    {
      id: "1",
      title: "Appointment Reminder",
      message: "You have a counseling session tomorrow at 10:00 AM with Dr. Sarah Johnson",
      type: "appointment",
      channel: "email",
      status: "delivered",
      timestamp: "2024-01-15T09:00:00Z",
      priority: "medium",
    },
    {
      id: "2",
      title: "Medication Time",
      message: "Time to take your Methadone (40mg)",
      type: "medication",
      channel: "push",
      status: "read",
      timestamp: "2024-01-15T08:00:00Z",
      priority: "high",
    },
    {
      id: "3",
      title: "Progress Achievement",
      message: "Congratulations! You've completed 5 recovery activities this week",
      type: "progress",
      channel: "in_app",
      status: "read",
      timestamp: "2024-01-14T18:30:00Z",
      priority: "low",
    },
    {
      id: "4",
      title: "Wellness Check-in",
      message: "How are you feeling today? Complete your daily wellness check-in",
      type: "wellness",
      channel: "push",
      status: "delivered",
      timestamp: "2024-01-14T19:00:00Z",
      priority: "medium",
    },
  ])

  const [globalSettings, setGlobalSettings] = useState({
    enableNotifications: true,
    quietHours: { start: "22:00", end: "07:00" },
    maxDailyNotifications: 10,
    priorityFilter: "low" as "low" | "medium" | "high" | "urgent",
  })

  const toggleRule = (ruleId: string) => {
    setNotificationRules((prev) => prev.map((rule) => (rule.id === ruleId ? { ...rule, active: !rule.active } : rule)))
  }

  const updateRuleChannels = (ruleId: string, channels: ("email" | "sms" | "push" | "in_app")[]) => {
    setNotificationRules((prev) => prev.map((rule) => (rule.id === ruleId ? { ...rule, channels } : rule)))
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email":
        return <Mail className="h-4 w-4" />
      case "sms":
        return <MessageSquare className="h-4 w-4" />
      case "push":
        return <Smartphone className="h-4 w-4" />
      case "in_app":
        return <Bell className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200"
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "medium":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "low":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "text-green-600"
      case "read":
        return "text-blue-600"
      case "failed":
        return "text-red-600"
      case "sent":
        return "text-yellow-600"
      default:
        return "text-gray-600"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6 text-cyan-600" />
        <h2 className="text-2xl font-bold text-gray-900">Automated Notifications</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Notification Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {notificationRules.map((rule) => (
                  <div key={rule.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{rule.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{rule.conditions}</p>
                      </div>
                      <Switch checked={rule.active} onCheckedChange={() => toggleRule(rule.id)} />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Channels</label>
                        <div className="flex gap-2 flex-wrap">
                          {["email", "sms", "push", "in_app"].map((channel) => (
                            <Button
                              key={channel}
                              size="sm"
                              variant={rule.channels.includes(channel as any) ? "default" : "outline"}
                              onClick={() => {
                                const newChannels = rule.channels.includes(channel as any)
                                  ? rule.channels.filter((c) => c !== channel)
                                  : [...rule.channels, channel as any]
                                updateRuleChannels(rule.id, newChannels)
                              }}
                              className="h-8 px-3"
                            >
                              {getChannelIcon(channel)}
                              <span className="ml-1 capitalize">{channel === "in_app" ? "In-App" : channel}</span>
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <Badge variant="outline">{rule.type}</Badge>
                        <Badge variant="secondary">{rule.frequency}</Badge>
                        <Badge variant={rule.active ? "default" : "secondary"}>
                          {rule.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Global Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Enable Notifications</h4>
                    <p className="text-sm text-gray-600">Master switch for all notifications</p>
                  </div>
                  <Switch
                    checked={globalSettings.enableNotifications}
                    onCheckedChange={(checked) =>
                      setGlobalSettings((prev) => ({ ...prev, enableNotifications: checked }))
                    }
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Quiet Hours Start</label>
                    <input
                      type="time"
                      value={globalSettings.quietHours.start}
                      onChange={(e) =>
                        setGlobalSettings((prev) => ({
                          ...prev,
                          quietHours: { ...prev.quietHours, start: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Quiet Hours End</label>
                    <input
                      type="time"
                      value={globalSettings.quietHours.end}
                      onChange={(e) =>
                        setGlobalSettings((prev) => ({
                          ...prev,
                          quietHours: { ...prev.quietHours, end: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Minimum Priority Level</label>
                  <Select
                    value={globalSettings.priorityFilter}
                    onValueChange={(value: any) => setGlobalSettings((prev) => ({ ...prev, priorityFilter: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low and above</SelectItem>
                      <SelectItem value="medium">Medium and above</SelectItem>
                      <SelectItem value="high">High and above</SelectItem>
                      <SelectItem value="urgent">Urgent only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentNotifications.map((notification) => (
                <div key={notification.id} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getChannelIcon(notification.channel)}
                      <h4 className="font-medium text-sm">{notification.title}</h4>
                    </div>
                    <Badge className={`text-xs ${getPriorityColor(notification.priority)}`}>
                      {notification.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{new Date(notification.timestamp).toLocaleString()}</span>
                    <span className={getStatusColor(notification.status)}>{notification.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
