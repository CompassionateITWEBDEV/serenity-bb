"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Calendar,
  Clock,
  Plus,
  Video,
  MapPin,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Trash2,
} from "lucide-react"

export default function AppointmentsPage() {
  const { isAuthenticated, loading, patient } = useAuth()
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isBookingOpen, setIsBookingOpen] = useState(false)

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
          <p className="text-gray-600">Loading appointments...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !patient) {
    return null
  }

  const upcomingAppointments = [
    {
      id: 1,
      title: "Individual Therapy Session",
      provider: "Dr. Sarah Johnson",
      date: "2024-01-20",
      time: "10:00 AM",
      duration: "60 min",
      type: "therapy",
      location: "Room 205",
      status: "confirmed",
      notes: "Weekly therapy session focusing on coping strategies",
      isVirtual: false,
    },
    {
      id: 2,
      title: "Group Counseling",
      provider: "Maria Rodriguez, LCSW",
      date: "2024-01-22",
      time: "2:00 PM",
      duration: "90 min",
      type: "group",
      location: "Conference Room A",
      status: "confirmed",
      notes: "Peer support group session",
      isVirtual: false,
    },
    {
      id: 3,
      title: "Medical Check-up",
      provider: "Dr. Michael Chen",
      date: "2024-01-25",
      time: "9:30 AM",
      duration: "30 min",
      type: "medical",
      location: "Medical Wing",
      status: "pending",
      notes: "Routine health assessment and medication review",
      isVirtual: false,
    },
    {
      id: 4,
      title: "Virtual Counseling Session",
      provider: "Dr. Emily Davis",
      date: "2024-01-27",
      time: "3:00 PM",
      duration: "45 min",
      type: "therapy",
      location: "Virtual Meeting",
      status: "confirmed",
      notes: "Online therapy session via secure video call",
      isVirtual: true,
    },
  ]

  const pastAppointments = [
    {
      id: 5,
      title: "Initial Assessment",
      provider: "Dr. Sarah Johnson",
      date: "2024-01-15",
      time: "11:00 AM",
      duration: "90 min",
      type: "assessment",
      location: "Room 205",
      status: "completed",
      notes: "Comprehensive intake assessment completed",
      isVirtual: false,
    },
    {
      id: 6,
      title: "Family Therapy Session",
      provider: "Maria Rodriguez, LCSW",
      date: "2024-01-12",
      time: "4:00 PM",
      duration: "60 min",
      type: "family",
      location: "Conference Room B",
      status: "completed",
      notes: "Family support session with spouse",
      isVirtual: false,
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "completed":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return CheckCircle
      case "pending":
        return AlertCircle
      case "cancelled":
        return XCircle
      case "completed":
        return CheckCircle
      default:
        return Clock
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "therapy":
        return "bg-purple-100 text-purple-600"
      case "group":
        return "bg-blue-100 text-blue-600"
      case "medical":
        return "bg-red-100 text-red-600"
      case "family":
        return "bg-green-100 text-green-600"
      case "assessment":
        return "bg-orange-100 text-orange-600"
      default:
        return "bg-gray-100 text-gray-600"
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader patient={patient} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-serif font-bold text-gray-900">Appointments</h1>
                <p className="text-gray-600">Manage your therapy sessions and medical appointments</p>
              </div>
            </div>
            <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Book Appointment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Book New Appointment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="appointment-type">Appointment Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select appointment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="therapy">Individual Therapy</SelectItem>
                        <SelectItem value="group">Group Counseling</SelectItem>
                        <SelectItem value="medical">Medical Check-up</SelectItem>
                        <SelectItem value="family">Family Therapy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="provider">Preferred Provider</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dr-johnson">Dr. Sarah Johnson</SelectItem>
                        <SelectItem value="maria-rodriguez">Maria Rodriguez, LCSW</SelectItem>
                        <SelectItem value="dr-chen">Dr. Michael Chen</SelectItem>
                        <SelectItem value="dr-davis">Dr. Emily Davis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Preferred Date</Label>
                    <Input type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Preferred Time</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="9:00">9:00 AM</SelectItem>
                        <SelectItem value="10:00">10:00 AM</SelectItem>
                        <SelectItem value="11:00">11:00 AM</SelectItem>
                        <SelectItem value="14:00">2:00 PM</SelectItem>
                        <SelectItem value="15:00">3:00 PM</SelectItem>
                        <SelectItem value="16:00">4:00 PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea placeholder="Any specific concerns or requests..." />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button className="flex-1">Request Appointment</Button>
                    <Button variant="outline" onClick={() => setIsBookingOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">4</div>
                  <div className="text-sm text-gray-600">Upcoming</div>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">2</div>
                  <div className="text-sm text-gray-600">This Week</div>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">1</div>
                  <div className="text-sm text-gray-600">Virtual</div>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Video className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">94%</div>
                  <div className="text-sm text-gray-600">Attendance</div>
                </div>
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upcoming">Upcoming Appointments</TabsTrigger>
            <TabsTrigger value="history">Appointment History</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-6">
            <div className="space-y-4">
              {upcomingAppointments.map((appointment) => {
                const StatusIcon = getStatusIcon(appointment.status)
                return (
                  <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{appointment.title}</h3>
                            <Badge className={getTypeColor(appointment.type)}>{appointment.type}</Badge>
                            <Badge variant="outline" className={getStatusColor(appointment.status)}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {appointment.status}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              {appointment.provider}
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {formatDate(appointment.date)}
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              {appointment.time} ({appointment.duration})
                            </div>
                            <div className="flex items-center gap-2">
                              {appointment.isVirtual ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                              {appointment.location}
                            </div>
                          </div>

                          {appointment.notes && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-700">{appointment.notes}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 ml-4">
                          {appointment.isVirtual && (
                            <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                              <Video className="h-4 w-4 mr-2" />
                              Join
                            </Button>
                          )}
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 bg-transparent"
                          >
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

          <TabsContent value="history" className="space-y-6">
            <div className="space-y-4">
              {pastAppointments.map((appointment) => {
                const StatusIcon = getStatusIcon(appointment.status)
                return (
                  <Card key={appointment.id} className="opacity-75">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{appointment.title}</h3>
                            <Badge className={getTypeColor(appointment.type)}>{appointment.type}</Badge>
                            <Badge variant="outline" className={getStatusColor(appointment.status)}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {appointment.status}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              {appointment.provider}
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {formatDate(appointment.date)}
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              {appointment.time} ({appointment.duration})
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {appointment.location}
                            </div>
                          </div>

                          {appointment.notes && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-700">{appointment.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
