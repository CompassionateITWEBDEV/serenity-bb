"use client";

import { Calendar as CalendarIcon, Clock, MapPin, Video } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCurrentPatientRealtime } from "@/hooks/use-current-patient-realtime";

function fmtDate(iso: string) { return new Date(iso).toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" }); }
function fmtTime(iso: string) { return new Date(iso).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }); }

export default function PatientDashboardPage() {
  const { loading, userId, patient, appointments, nextAppointment } = useCurrentPatientRealtime();
  if (loading) return <div className="p-6">Loading…</div>;
  if (!userId) return <div className="p-6">Please sign in.</div>;
  if (!patient) return <div className="p-6">No patient profile yet.</div>;

  const upcoming = appointments.filter(a => new Date(a.appointment_time) >= new Date() && a.status !== "cancelled");
  const history  = appointments.filter(a => new Date(a.appointment_time) <  new Date() || a.status === "completed" || a.status === "cancelled");

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold mb-1">Welcome, {patient.first_name ?? patient.full_name ?? "Patient"} 💙</h1>
      <p className="text-sm text-slate-600 mb-6">{patient.email ?? "—"} • {patient.phone_number ?? "—"}</p>

      {nextAppointment ? (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-900">{nextAppointment.title ?? "Upcoming appointment"}</div>
                <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2"><CalendarIcon className="h-4 w-4" />{fmtDate(nextAppointment.appointment_time)}</div>
                  <div className="flex items-center gap-2"><Clock className="h-4 w-4" />{fmtTime(nextAppointment.appointment_time)}</div>
                  <div className="flex items-center gap-2">{nextAppointment.is_virtual ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}{nextAppointment.location || (nextAppointment.is_virtual ? "Virtual" : "—")}</div>
                  <div className="flex items-center gap-2"><CalendarIcon className="h-4 w-4" />Provider: {nextAppointment.provider ?? "—"}</div>
                </div>
              </div>
              {nextAppointment.is_virtual && <Button size="sm">Join</Button>}
            </div>
          </CardContent>
        </Card>
      ) : (<div className="mb-6 text-sm text-slate-600">No upcoming appointments.</div>)}

      <h2 className="text-sm font-semibold text-slate-700 mb-2">Upcoming</h2>
      <div className="space-y-3 mb-6">
        {upcoming.map((a) => (
          <Card key={a.id}><CardContent className="p-4 text-sm text-slate-700">
            <div className="flex items-center gap-2"><CalendarIcon className="h-4 w-4" />{fmtDate(a.appointment_time)} • {fmtTime(a.appointment_time)} • {a.status}</div>
          </CardContent></Card>
        ))}
        {upcoming.length === 0 && <div className="text-sm text-slate-500">Nothing scheduled.</div>}
      </div>

      <h2 className="text-sm font-semibold text-slate-700 mb-2">History</h2>
      <div className="space-y-3">
        {history.map((a) => (
          <Card key={a.id}><CardContent className="p-4 text-sm text-slate-700">
            <div className="flex items-center gap-2"><CalendarIcon className="h-4 w-4" />{fmtDate(a.appointment_time)} • {fmtTime(a.appointment_time)} • {a.status}</div>
          </CardContent></Card>
        ))}
        {history.length === 0 && <div className="text-sm text-slate-500">No history yet.</div>}
      </div>
    </div>
  );
}
