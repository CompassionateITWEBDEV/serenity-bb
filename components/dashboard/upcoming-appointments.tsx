// components/dashboard/upcoming-appointments.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Video } from "lucide-react";

export type AppointmentItem = {
  id: string | number;
  at: string;                    // ISO datetime from DB: appointments.appointment_time
  title?: string | null;         // optional descriptive title
  staff?: string | null;         // e.g., clinician name
  status: string;                // scheduled | confirmed | pending | completed | cancelled | no_show
  type?: "virtual" | "in-person" | null;
  location?: string | null;      // optional
  notes?: string | null;
  joinUrl?: string | null;       // for virtual calls if available
};

export type UpcomingAppointmentsProps = {
  items: AppointmentItem[];
  loading?: boolean;
  onReschedule?: (id: AppointmentItem["id"]) => void;
  onJoin?: (item: AppointmentItem) => void;
  className?: string;
};

/* Why: consistent, locale-aware formatting without hard-coding timezones */
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: "—", time: "—" };
  const date = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(d);
  return { date, time };
}

function TypeIcon({ type }: { type?: AppointmentItem["type"] }) {
  return type === "virtual" ? (
    <Video className="h-4 w-4 text-blue-600" />
  ) : (
    <MapPin className="h-4 w-4 text-green-600" />
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "confirmed" || s === "scheduled")
    return <Badge variant="secondary" className="bg-green-100 text-green-800">Confirmed</Badge>;
  if (s === "pending")
    return <Badge variant="outline">Pending</Badge>;
  if (s === "completed")
    return <Badge variant="secondary" className="bg-gray-100 text-gray-700">Completed</Badge>;
  if (s === "cancelled" || s === "canceled")
    return <Badge variant="secondary" className="bg-red-100 text-red-700">Cancelled</Badge>;
  if (s === "no_show")
    return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">No Show</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

export function UpcomingAppointments({
  items,
  loading = false,
  onReschedule,
  onJoin,
  className = "",
}: UpcomingAppointmentsProps) {
  // Graceful empty/loading states
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <Calendar className="h-5 w-5 text-indigo-600" />
            </div>
            Upcoming Appointments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <Calendar className="h-5 w-5 text-indigo-600" />
          </div>
          Upcoming Appointments
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-gray-600">No upcoming appointments yet.</p>
        ) : (
          <div className="space-y-4">
            {items.map((a) => {
              const { date, time } = fmtDateTime(a.at);
              const title = a.title || "Therapy Session";
              const clinician = a.staff ? `with ${a.staff}` : undefined;
              const isVirtual = a.type === "virtual";
              const canJoin = isVirtual && a.joinUrl;
              return (
                <div key={a.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{title}</h4>
                      {clinician && <p className="text-sm text-gray-600">{clinician}</p>}
                    </div>
                    <StatusBadge status={a.status} />
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {date}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {time}
                    </div>
                    <div className="flex items-center gap-1">
                      <TypeIcon type={a.type} />
                      {a.location || (isVirtual ? "Video Call" : "On-site")}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onReschedule?.(a.id)}
                    >
                      Reschedule
                    </Button>
                    {isVirtual && (
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => (onJoin ? onJoin(a) : a.joinUrl ? (window.location.href = a.joinUrl) : void 0)}
                        disabled={!canJoin}
                      >
                        Join Call
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
