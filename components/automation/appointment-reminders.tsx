"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Bell, Calendar, Clock, Mail, MessageSquare, Settings } from "lucide-react"

interface ReminderSettings {
  email: boolean
  sms: boolean
  push: boolean
  daysBefore: number[]
  timeOfDay: string
}

interface Appointment {
  id: string
  title: string
  date: string
  time: string
  provider: string
  type: string
}

export default function AppointmentReminders() {
  const [settings, setSettings] = useState<ReminderSettings>({
    email: true,
    sms: true,
    push: true,
    daysBefore: [1, 3],
    timeOfDay: "09:00",
  })

  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([
    {
      id: "1",
      title: "Counseling Session",
      date: "2024-01-15",
      time: "10:00 AM",
      provider: "Dr. Sarah Johnson",
      type: "Individual Therapy",
    },
    {
      id: "2",
      title: "Medical Check-up",
      date: "2024-01-18",
      time: "2:30 PM",
      provider: "Dr. Michael Chen",
      type: "Medical Consultation",
    },
  ])

  const [activeReminders, setActiveReminders] = useState([
    {
      id: "1",
      appointmentId: "1",
      type: "email",
      scheduledFor: "2024-01-14 09:00",
      status: "scheduled",
      message: "Reminder: You have a counseling session tomorrow at 10:00 AM with Dr. Sarah Johnson",
    },
  ])

  useEffect(() => {
    const scheduleReminders = () => {
      upcomingAppointments.forEach((appointment) => {
        settings.daysBefore.forEach((days) => {
          const reminderDate = new Date(appointment.date)
          reminderDate.setDate(reminderDate.getDate() - days)

          console.log(`Scheduling reminder for ${appointment.title} ${days} days before`)
        })
      })
    }

    scheduleReminders()
  }, [upcomingAppointments, settings])

  const updateSettings = (key: keyof ReminderSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const toggleReminderDay = (day: number) => {
    const newDays = settings.daysBefore.includes(day)
      ? settings.daysBefore.filter((d) => d !== day)
      : [...settings.daysBefore, day].sort((a, b) => a - b)

    updateSettings("daysBefore", newDays)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6 text-cyan-600" />
        <h2 className="text-2xl font-bold text-gray-900">Automated Appointment Reminders</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Reminder Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-medium mb-3">Notification Methods</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span>Email Notifications</span>
                  </div>
                  <Switch checked={settings.email} onCheckedChange={(checked) => updateSettings("email", checked)} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-gray-500" />
                    <span>SMS Notifications</span>
                  </div>
                  <Switch checked={settings.sms} onCheckedChange={(checked) => updateSettings("sms", checked)} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-gray-500" />
                    <span>Push Notifications</span>
                  </div>
                  <Switch checked={settings.push} onCheckedChange={(checked) => updateSettings("push", checked)} />
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Reminder Schedule</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-600 mb-2 block">Days Before Appointment</label>
                  <div className="flex gap-2 flex-wrap">
                    {[1, 2, 3, 7].map((day) => (
                      <Button
                        key={day}
                        variant={settings.daysBefore.includes(day) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleReminderDay(day)}
                        className="h-8"
                      >
                        {day} day{day > 1 ? "s" : ""}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-2 block">Reminder Time</label>
                  <input
                    type="time"
                    value={settings.timeOfDay}
                    onChange={(e) => updateSettings("timeOfDay", e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">{appointment.title}</h4>
                    <Badge variant="outline">{appointment.type}</Badge>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(appointment.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{appointment.time}</span>
                    </div>
                    <div>Provider: {appointment.provider}</div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {settings.daysBefore.map((days) => (
                      <Badge key={days} variant="secondary" className="text-xs">
                        Reminder {days}d before
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Reminders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeReminders.map((reminder) => (
              <div key={reminder.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-sm">{reminder.message}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Scheduled for: {new Date(reminder.scheduledFor).toLocaleString()}
                  </div>
                </div>
                <Badge variant={reminder.status === "scheduled" ? "default" : "secondary"} className="ml-3">
                  {reminder.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
