"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Bell,
  Calendar,
  MessageCircle,
  Heart,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  BookMarkedIcon as MarkAsUnread,
  Settings,
} from "lucide-react"

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: "appointment",
      title: "Upcoming Appointment Reminder",
      message: "You have a group therapy session tomorrow at 2:00 PM",
      time: "2 hours ago",
      read: false,
      priority: "medium",
      icon: Calendar,
    },
    {
      id: 2,
      type: "medication",
      title: "Medication Reminder",
      message: "Time to take your morning medication",
      time: "4 hours ago",
      read: true,
      priority: "high",
      icon: Heart,
    },
    {
      id: 3,
      type: "message",
      title: "New Message from Dr. Smith",
      message: "Great progress in today's session! Keep up the excellent work.",
      time: "1 day ago",
      read: false,
      priority: "medium",
      icon: MessageCircle,
    },
    {
      id: 4,
      type: "achievement",
      title: "Milestone Achieved!",
      message: "Congratulations! You've completed 30 consecutive days of treatment.",
      time: "2 days ago",
      read: true,
      priority: "low",
      icon: CheckCircle,
    },
    {
      id: 5,
      type: "alert",
      title: "Emergency Contact Update",
      message: "Please update your emergency contact information in your profile.",
      time: "3 days ago",
      read: false,
      priority: "high",
      icon: AlertTriangle,
    },
  ])

  const markAsRead = (id: number) => {
    setNotifications(notifications.map((notif) => (notif.id === id ? { ...notif, read: true } : notif)))
  }

  const markAsUnread = (id: number) => {
    setNotifications(notifications.map((notif) => (notif.id === id ? { ...notif, read: false } : notif)))
  }

  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter((notif) => notif.id !== id))
  }

  const markAllAsRead = () => {
    setNotifications(notifications.map((notif) => ({ ...notif, read: true })))
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-l-red-500"
      case "medium":
        return "border-l-yellow-500"
      case "low":
        return "border-l-green-500"
      default:
        return "border-l-gray-300"
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">High</Badge>
      case "medium":
        return <Badge variant="secondary">Medium</Badge>
      case "low":
        return <Badge variant="outline">Low</Badge>
      default:
        return null
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600 mt-2">Stay updated with your treatment progress and important reminders</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={markAllAsRead}>
              Mark All Read
            </Button>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {unreadCount > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800">
              You have {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Bell className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
                  <p className="text-gray-600 text-center">You're all caught up! New notifications will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              notifications.map((notification) => {
                const IconComponent = notification.icon
                return (
                  <Card
                    key={notification.id}
                    className={`border-l-4 ${getPriorityColor(notification.priority)} ${
                      !notification.read ? "bg-blue-50/50" : ""
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div
                          className={`p-2 rounded-lg ${
                            notification.type === "appointment"
                              ? "bg-blue-100 text-blue-600"
                              : notification.type === "medication"
                                ? "bg-red-100 text-red-600"
                                : notification.type === "message"
                                  ? "bg-green-100 text-green-600"
                                  : notification.type === "achievement"
                                    ? "bg-purple-100 text-purple-600"
                                    : "bg-orange-100 text-orange-600"
                          }`}
                        >
                          <IconComponent className="h-5 w-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-medium ${!notification.read ? "text-gray-900" : "text-gray-700"}`}>
                              {notification.title}
                            </h3>
                            {!notification.read && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                            {getPriorityBadge(notification.priority)}
                          </div>
                          <p className="text-gray-600 text-sm mb-2">{notification.message}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            {notification.time}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {notification.read ? (
                            <Button variant="ghost" size="sm" onClick={() => markAsUnread(notification.id)}>
                              <MarkAsUnread className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" onClick={() => markAsRead(notification.id)}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => deleteNotification(notification.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="unread">
          <div className="space-y-4">
            {notifications
              .filter((n) => !n.read)
              .map((notification) => {
                const IconComponent = notification.icon
                return (
                  <Card
                    key={notification.id}
                    className={`border-l-4 ${getPriorityColor(notification.priority)} bg-blue-50/50`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div
                          className={`p-2 rounded-lg ${
                            notification.type === "appointment"
                              ? "bg-blue-100 text-blue-600"
                              : notification.type === "medication"
                                ? "bg-red-100 text-red-600"
                                : notification.type === "message"
                                  ? "bg-green-100 text-green-600"
                                  : notification.type === "achievement"
                                    ? "bg-purple-100 text-purple-600"
                                    : "bg-orange-100 text-orange-600"
                          }`}
                        >
                          <IconComponent className="h-5 w-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900">{notification.title}</h3>
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            {getPriorityBadge(notification.priority)}
                          </div>
                          <p className="text-gray-600 text-sm mb-2">{notification.message}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            {notification.time}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => markAsRead(notification.id)}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteNotification(notification.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        </TabsContent>

        <TabsContent value="appointments">
          <div className="space-y-4">
            {notifications
              .filter((n) => n.type === "appointment")
              .map((notification) => {
                const IconComponent = notification.icon
                return (
                  <Card key={notification.id} className={`border-l-4 ${getPriorityColor(notification.priority)}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{notification.title}</h3>
                          <p className="text-gray-600 text-sm">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        </TabsContent>

        <TabsContent value="messages">
          <div className="space-y-4">
            {notifications
              .filter((n) => n.type === "message")
              .map((notification) => {
                const IconComponent = notification.icon
                return (
                  <Card key={notification.id} className={`border-l-4 ${getPriorityColor(notification.priority)}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-green-100 text-green-600">
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{notification.title}</h3>
                          <p className="text-gray-600 text-sm">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        </TabsContent>

        <TabsContent value="health">
          <div className="space-y-4">
            {notifications
              .filter((n) => n.type === "medication" || n.type === "alert")
              .map((notification) => {
                const IconComponent = notification.icon
                return (
                  <Card key={notification.id} className={`border-l-4 ${getPriorityColor(notification.priority)}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div
                          className={`p-2 rounded-lg ${
                            notification.type === "medication"
                              ? "bg-red-100 text-red-600"
                              : "bg-orange-100 text-orange-600"
                          }`}
                        >
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{notification.title}</h3>
                          <p className="text-gray-600 text-sm">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        </TabsContent>

        <TabsContent value="achievements">
          <div className="space-y-4">
            {notifications
              .filter((n) => n.type === "achievement")
              .map((notification) => {
                const IconComponent = notification.icon
                return (
                  <Card key={notification.id} className={`border-l-4 ${getPriorityColor(notification.priority)}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{notification.title}</h3>
                          <p className="text-gray-600 text-sm">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
