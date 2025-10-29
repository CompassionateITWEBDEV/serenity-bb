"use client"

import { useRouter } from "next/navigation"
import { useNotifications } from "@/lib/useNotifications"
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
  KanbanSquareDashed as MarkAsUnread,
  Settings,
  Loader2,
  TestTube2,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

// Mock patient ID - in a real app, this would come from auth context
const MOCK_PATIENT_ID = "123e4567-e89b-12d3-a456-426614174000"

export default function NotificationsPage() {
  const router = useRouter()
  const { notifications, loading, error, markAsRead, markAsUnread, deleteNotification, markAllAsRead } =
    useNotifications(MOCK_PATIENT_ID)

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleNotificationClick = (notification: any) => {
    if (notification.type === 'drug_test') {
      router.push('/dashboard/drug-tests')
    } else if (notification.type === 'appointment') {
      router.push('/dashboard/appointments')
    } else if (notification.type === 'message') {
      router.push('/dashboard/messages')
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "appointment":
        return Calendar
      case "medication":
        return Heart
      case "message":
        return MessageCircle
      case "achievement":
        return CheckCircle
      case "alert":
        return AlertTriangle
      case "drug_test":
        return TestTube2
      default:
        return Bell
    }
  }

  const getPriorityColor = (type: string) => {
    switch (type) {
      case "alert":
        return "border-l-red-500"
      case "medication":
        return "border-l-orange-500"
      case "appointment":
        return "border-l-blue-500"
      case "message":
        return "border-l-green-500"
      case "achievement":
        return "border-l-purple-500"
      case "drug_test":
        return "border-l-yellow-500"
      default:
        return "border-l-gray-300"
    }
  }

  const getPriorityBadge = (type: string) => {
    switch (type) {
      case "alert":
        return <Badge variant="destructive">Alert</Badge>
      case "medication":
        return <Badge variant="secondary">Health</Badge>
      case "appointment":
        return <Badge variant="outline">Appointment</Badge>
      case "message":
        return <Badge variant="outline">Message</Badge>
      case "achievement":
        return <Badge variant="outline">Achievement</Badge>
      case "drug_test":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Drug Test</Badge>
      default:
        return null
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "appointment":
        return "bg-blue-100 text-blue-600"
      case "medication":
        return "bg-red-100 text-red-600"
      case "message":
        return "bg-green-100 text-green-600"
      case "achievement":
        return "bg-purple-100 text-purple-600"
      case "alert":
        return "bg-orange-100 text-orange-600"
      case "drug_test":
        return "bg-yellow-100 text-yellow-600"
      default:
        return "bg-gray-100 text-gray-600"
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading notifications...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading notifications</h3>
            <p className="text-gray-600 text-center">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
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
            <Button variant="outline" onClick={markAllAsRead} disabled={unreadCount === 0}>
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
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
          <TabsTrigger value="appointment">Appointments</TabsTrigger>
          <TabsTrigger value="message">Messages</TabsTrigger>
          <TabsTrigger value="drug_test">Drug Tests</TabsTrigger>
          <TabsTrigger value="medication">Health</TabsTrigger>
          <TabsTrigger value="achievement">Achievements</TabsTrigger>
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
                const IconComponent = getTypeIcon(notification.type)
                return (
                  <Card
                    key={notification.id}
                    className={`border-l-4 ${getPriorityColor(notification.type)} ${
                      !notification.read ? "bg-blue-50/50" : ""
                    } ${notification.type === 'drug_test' || notification.type === 'appointment' || notification.type === 'message' ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${getTypeColor(notification.type)}`}>
                          <IconComponent className="h-5 w-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-medium ${!notification.read ? "text-gray-900" : "text-gray-700"}`}>
                              {notification.title}
                            </h3>
                            {!notification.read && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                            {getPriorityBadge(notification.type)}
                          </div>
                          <p className="text-gray-600 text-sm mb-2">{notification.message}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
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
                const IconComponent = getTypeIcon(notification.type)
                return (
                  <Card
                    key={notification.id}
                    className={`border-l-4 ${getPriorityColor(notification.type)} bg-blue-50/50`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${getTypeColor(notification.type)}`}>
                          <IconComponent className="h-5 w-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900">{notification.title}</h3>
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            {getPriorityBadge(notification.type)}
                          </div>
                          <p className="text-gray-600 text-sm mb-2">{notification.message}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
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

        <TabsContent value="drug_test">
          <div className="space-y-4">
            {notifications
              .filter((n) => n.type === "drug_test")
              .map((notification) => {
                const IconComponent = getTypeIcon(notification.type)
                return (
                  <Card
                    key={notification.id}
                    className={`border-l-4 ${getPriorityColor(notification.type)} cursor-pointer hover:shadow-md transition-shadow`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${getTypeColor(notification.type)}`}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{notification.title}</h3>
                          <p className="text-gray-600 text-sm">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            {notifications.filter((n) => n.type === "drug_test").length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <TestTube2 className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No drug test notifications</h3>
                  <p className="text-gray-600 text-center">You'll be notified here when drug tests are assigned to you.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {["appointment", "message", "medication", "achievement"].map((filterType) => (
          <TabsContent key={filterType} value={filterType}>
            <div className="space-y-4">
              {notifications
                .filter((n) => n.type === filterType || (filterType === "medication" && n.type === "alert"))
                .map((notification) => {
                  const IconComponent = getTypeIcon(notification.type)
                  return (
                    <Card key={notification.id} className={`border-l-4 ${getPriorityColor(notification.type)}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={`p-2 rounded-lg ${getTypeColor(notification.type)}`}>
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium">{notification.title}</h3>
                            <p className="text-gray-600 text-sm">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
