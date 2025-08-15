import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, Video } from "lucide-react"

export function UpcomingAppointments() {
  const appointments = [
    {
      id: 1,
      title: "Individual Therapy Session",
      therapist: "Dr. Sarah Johnson",
      date: "Tomorrow",
      time: "2:00 PM - 3:00 PM",
      type: "in-person",
      location: "Room 205",
      status: "confirmed",
    },
    {
      id: 2,
      title: "Group Therapy",
      therapist: "Dr. Michael Chen",
      date: "Friday, Feb 16",
      time: "10:00 AM - 11:30 AM",
      type: "in-person",
      location: "Group Room A",
      status: "confirmed",
    },
    {
      id: 3,
      title: "Psychiatrist Consultation",
      therapist: "Dr. Emily Rodriguez",
      date: "Monday, Feb 19",
      time: "1:00 PM - 1:30 PM",
      type: "virtual",
      location: "Video Call",
      status: "pending",
    },
  ]

  const getTypeIcon = (type: string) => {
    return type === "virtual" ? (
      <Video className="h-4 w-4 text-blue-600" />
    ) : (
      <MapPin className="h-4 w-4 text-green-600" />
    )
  }

  const getStatusBadge = (status: string) => {
    return status === "confirmed" ? (
      <Badge variant="secondary" className="bg-green-100 text-green-800">
        Confirmed
      </Badge>
    ) : (
      <Badge variant="outline">Pending</Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <Calendar className="h-5 w-5 text-indigo-600" />
          </div>
          Upcoming Appointments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">{appointment.title}</h4>
                  <p className="text-sm text-gray-600">with {appointment.therapist}</p>
                </div>
                {getStatusBadge(appointment.status)}
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {appointment.date}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {appointment.time}
                </div>
                <div className="flex items-center gap-1">
                  {getTypeIcon(appointment.type)}
                  {appointment.location}
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  Reschedule
                </Button>
                {appointment.type === "virtual" && (
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    Join Call
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
