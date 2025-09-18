"use client"
import { useOverview } from "@/context/patient-overview-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays, Clock, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"

function ApptBadge({ status }: { status: "Confirmed" | "Pending" | "Cancelled" }) {
  const map = {
    Confirmed: "bg-emerald-100 text-emerald-700",
    Pending: "bg-amber-100 text-amber-700",
    Cancelled: "bg-rose-100 text-rose-700",
  } as const
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${map[status]}`}>{status}</span>
}

export function LiveUpcomingAppointments() {
  const { overview, isLoading } = useOverview()
  if (isLoading || !overview) return <SkeletonAppts />

  const appts = [...overview.appointments].sort((a, b) => a.at.localeCompare(b.at)).slice(0, 3)

  if (!appts.length) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Upcoming Appointments</CardTitle></CardHeader>
        <CardContent><div className="text-gray-600 text-sm">No upcoming appointments. Schedule your next session.</div></CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Upcoming Appointments</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {appts.map((a) => (
          <div key={a.id} className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">{a.title}{a.provider ? ` with ${a.provider}` : ""}</div>
              <ApptBadge status={a.status} />
            </div>
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-700">
              <div className="flex items-center gap-1"><CalendarDays className="h-4 w-4" /> {new Date(a.at).toLocaleDateString()}</div>
              <div className="flex items-center gap-1"><Clock className="h-4 w-4" /> {new Date(a.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
              {a.location && <div className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {a.location}</div>}
            </div>
            <div className="mt-3">
              <Button variant="outline" size="sm">Reschedule</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function SkeletonAppts() {
  return (
    <Card>
      <CardHeader><div className="h-5 w-56 bg-gray-200 rounded animate-pulse" /></CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-20 w-full bg-gray-200 rounded animate-pulse" />
        ))}
      </CardContent>
    </Card>
  )
}
