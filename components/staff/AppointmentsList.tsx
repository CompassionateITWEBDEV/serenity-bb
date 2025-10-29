"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  User,
  MapPin,
  Video,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Hourglass,
  AlertCircle,
  Activity,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Appointment = {
  id: string;
  patient_id: string;
  appointment_time: string;
  status: "scheduled" | "confirmed" | "pending" | "cancelled" | "completed";
  title: string | null;
  provider: string | null;
  duration_min: number | null;
  type: string | null;
  location: string | null;
  is_virtual: boolean;
  notes: string | null;
  created_at: string;
  // Patient info (joined)
  patient_name?: string;
  patient_email?: string;
};

type AppointmentStatus = "all" | "scheduled" | "confirmed" | "pending" | "cancelled" | "completed";

export default function AppointmentsList() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus>("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "upcoming" | "past">("all");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Appointment | null>(null);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      // Fetch appointments with patient info
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          patient_id,
          appointment_time,
          status,
          title,
          provider,
          duration_min,
          type,
          location,
          is_virtual,
          notes,
          created_at,
          patients:patient_id (
            full_name,
            email
          )
        `)
        .order("appointment_time", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading appointments:", error);
        return;
      }

      // Transform data to include patient info
      const transformed = (data || []).map((apt: any) => ({
        ...apt,
        patient_name: apt.patients?.full_name || "Unknown Patient",
        patient_email: apt.patients?.email || null,
      }));

      setAppointments(transformed);
    } catch (error) {
      console.error("Unexpected error loading appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();

    // Set up real-time subscription
    const channel = supabase
      .channel("staff-appointments-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
        },
        (payload) => {
          console.log("Appointment change detected:", payload.eventType);
          // Reload appointments when any change occurs
          loadAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredAppointments = useMemo(() => {
    let filtered = [...appointments];

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((apt) => apt.status === statusFilter);
    }

    // Filter by date
    const now = new Date();
    if (dateFilter === "today") {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      filtered = filtered.filter((apt) => {
        const aptDate = new Date(apt.appointment_time);
        return aptDate >= today && aptDate < tomorrow;
      });
    } else if (dateFilter === "upcoming") {
      filtered = filtered.filter((apt) => new Date(apt.appointment_time) >= now);
    } else if (dateFilter === "past") {
      filtered = filtered.filter((apt) => new Date(apt.appointment_time) < now);
    }

    // Filter by search term
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (apt) =>
          apt.patient_name?.toLowerCase().includes(lowerSearch) ||
          apt.title?.toLowerCase().includes(lowerSearch) ||
          apt.provider?.toLowerCase().includes(lowerSearch) ||
          apt.type?.toLowerCase().includes(lowerSearch) ||
          apt.location?.toLowerCase().includes(lowerSearch)
      );
    }

    return filtered;
  }, [appointments, statusFilter, dateFilter, searchTerm]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
      scheduled: { label: "Scheduled", className: "bg-blue-100 text-blue-700 border-blue-200", icon: Calendar },
      confirmed: { label: "Confirmed", className: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
      pending: { label: "Pending", className: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Hourglass },
      cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
      completed: { label: "Completed", className: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    };
    const variant = variants[status] || variants.pending;
    const Icon = variant.icon;
    return (
      <Badge className={`${variant.className} border text-xs font-medium px-2 py-1`}>
        <Icon className="h-3 w-3 mr-1" />
        {variant.label}
      </Badge>
    );
  };

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDateTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const openDetails = (apt: Appointment) => {
    setSelected(apt);
    setIsDetailOpen(true);
  };

  const deleteCancelled = async (apt: Appointment) => {
    if (apt.status !== "cancelled") return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch("/api/staff/appointments/delete", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id: apt.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Delete failed:", err);
        // Show minimal inline feedback
        alert(`Delete failed: ${err?.error || res.status}`);
        return;
      }
      await loadAppointments();
      setIsDetailOpen(false);
    } catch (e) {
      console.error("Failed to delete appointment", e);
    }
  };

  const getEndTime = (apt: Appointment) => {
    const start = new Date(apt.appointment_time);
    const duration = apt.duration_min || 60;
    const end = new Date(start.getTime() + duration * 60000);
    return formatTime(end.toISOString());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Patient Appointments</h2>
          <p className="text-slate-600 mt-1">Real-time appointment management</p>
        </div>
        <Badge variant="secondary" className="bg-cyan-100 text-cyan-700 border-cyan-200">
          <Activity className="h-3 w-3 mr-1" />
          Live Updates
        </Badge>
      </div>

      <Card className="shadow-lg border-slate-200">
        <CardHeader className="flex-row items-center justify-between space-y-0 p-4 border-b bg-gray-50">
          <div className="flex items-center gap-3 flex-1">
            <Search className="h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search by patient, title, provider, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
          <div className="flex items-center gap-3">
            <Filter className="h-5 w-5 text-gray-400" />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AppointmentStatus)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as any)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="past">Past</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent text-cyan-500"></div>
              <p className="text-gray-600 mt-4">Loading appointments...</p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Appointments Found</h3>
              <p className="text-gray-600">
                {appointments.length === 0
                  ? "No appointments have been created yet."
                  : "No appointments match your filters."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredAppointments.map((apt) => (
                <div key={apt.id} className="p-6 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => openDetails(apt)}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {apt.is_virtual ? (
                            <Video className="h-5 w-5 text-purple-500" />
                          ) : (
                            <Calendar className="h-5 w-5 text-cyan-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h4 className="font-semibold text-lg text-gray-900">
                              {apt.title || "Appointment"}
                            </h4>
                            {getStatusBadge(apt.status)}
                            {apt.status === "cancelled" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="ml-2"
                                onClick={(e) => { e.stopPropagation(); deleteCancelled(apt); }}
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                          {/* Prominent appointment time display */}
                          <div className="mb-3 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-blue-600" />
                                <span className="font-bold text-blue-900">{formatDate(apt.appointment_time)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-cyan-600" />
                                <span className="font-bold text-cyan-900">
                                  {formatTime(apt.appointment_time)} - {getEndTime(apt)}
                                </span>
                              </div>
                              {apt.duration_min && (
                                <div className="text-sm text-gray-600">
                                  ({apt.duration_min} minutes)
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="font-medium">{apt.patient_name}</span>
                              {apt.patient_email && (
                                <span className="text-gray-400">({apt.patient_email})</span>
                              )}
                            </div>
                            {apt.provider && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <User className="h-4 w-4 text-gray-400" />
                                <span>Provider: {apt.provider}</span>
                              </div>
                            )}
                            {apt.location && !apt.is_virtual && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <span>{apt.location}</span>
                              </div>
                            )}
                            {apt.is_virtual && (
                              <div className="flex items-center gap-2">
                                <Video className="h-4 w-4 text-purple-400" />
                                <span className="text-purple-600">Virtual Appointment</span>
                              </div>
                            )}
                            {apt.type && (
                              <Badge variant="outline" className="text-xs">
                                {apt.type}
                              </Badge>
                            )}
                          </div>
                          {apt.notes && (
                            <div className="mt-2 text-sm text-gray-500 bg-gray-50 p-2 rounded">
                              <strong>Notes:</strong> {apt.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    {/* Details Dialog */}
    <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Appointment Details</DialogTitle>
        </DialogHeader>
        {selected && (
          <div className="space-y-2 text-sm">
            <div><strong>Title:</strong> {selected.title || "Appointment"}</div>
            <div><strong>Status:</strong> {selected.status}</div>
            <div><strong>When:</strong> {formatDateTime(selected.appointment_time)} ({selected.duration_min || 60} min)</div>
            <div><strong>Patient:</strong> {selected.patient_name}{selected.patient_email ? ` (${selected.patient_email})` : ""}</div>
            {selected.provider && <div><strong>Provider:</strong> {selected.provider}</div>}
            {selected.location && !selected.is_virtual && <div><strong>Location:</strong> {selected.location}</div>}
            {selected.is_virtual && <div><strong>Type:</strong> Virtual Appointment</div>}
            {selected.notes && <div><strong>Notes:</strong> {selected.notes}</div>}
          </div>
        )}
        <DialogFooter>
          {selected?.status === "cancelled" && (
            <Button variant="destructive" onClick={() => selected && deleteCancelled(selected)}>
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </div>
  );
}



