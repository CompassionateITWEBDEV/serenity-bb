"use client";

import * as React from "react";
import { startOfDay, isSameDay, format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, MapPin, CheckCircle, XCircle } from "lucide-react";

type Appt = {
  id: string;
  appointment_time: string; // ISO
  title: string | null;
  status: "scheduled" | "confirmed" | "pending" | "cancelled" | "completed";
  is_virtual: boolean | null;
};

type Props = {
  appointments: Appt[];
};

export default function AppointmentCalendar({ appointments }: Props) {
  const [selected, setSelected] = React.useState<Date>(startOfDay(new Date()));

  const dayItems = React.useMemo(() => {
    return appointments
      .filter((a) => isSameDay(new Date(a.appointment_time), selected))
      .sort((a, b) => new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime());
  }, [appointments, selected]);

  const dots = React.useMemo(() => {
    const map = new Map<number, number>();
    for (const a of appointments) {
      const d = startOfDay(new Date(a.appointment_time)).getTime();
      map.set(d, (map.get(d) || 0) + 1);
    }
    return map;
  }, [appointments]);

  return (
    <Card className="border-0 shadow-none">
      <CardContent className="p-0">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border p-3">
            <Calendar
              selected={selected}
              onSelect={(d) => d && setSelected(d)}
              // Why: Small dot indicator for days with events.
              components={{
                DayContent: (props) => {
                  const ts = startOfDay(props.date).getTime();
                  const count = dots.get(ts) || 0;
                  return (
                    <div className="relative flex items-center justify-center w-10 h-10">
                      <span>{props.date.getDate()}</span>
                      {count > 0 && (
                        <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-cyan-600" />
                      )}
                    </div>
                  );
                },
              }}
            />
          </div>

          <div className="rounded-2xl border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">{format(selected, "EEEE, dd MMM yyyy")}</h3>
              <Badge variant="secondary">{dayItems.length} scheduled</Badge>
            </div>

            {dayItems.length === 0 ? (
              <p className="text-gray-500">No appointments for this day.</p>
            ) : (
              <ul className="space-y-3">
                {dayItems.map((a) => {
                  const dt = new Date(a.appointment_time);
                  const time = format(dt, "HH:mm");
                  const status =
                    a.status === "cancelled"
                      ? { icon: <XCircle className="h-4 w-4" />, cls: "bg-red-50 text-red-700" }
                      : a.status === "completed"
                      ? { icon: <CheckCircle className="h-4 w-4" />, cls: "bg-emerald-50 text-emerald-700" }
                      : { icon: null, cls: "bg-blue-50 text-blue-700" };
                  return (
                    <li key={a.id} className="flex items-center justify-between rounded-xl border p-3">
                      <div>
                        <p className="font-medium">{a.title ?? "Appointment"}</p>
                        <p className="text-sm text-gray-500">{time}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {a.is_virtual ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                        <span className={`text-xs px-2 py-1 rounded-full ${status.cls}`}>
                          {a.status}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
