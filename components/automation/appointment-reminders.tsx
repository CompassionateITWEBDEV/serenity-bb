"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Bell, 
  Calendar, 
  Clock, 
  Mail, 
  MessageSquare, 
  Settings, 
  Loader2, 
  RefreshCcw, 
  Zap,
  CheckCircle,
  AlertTriangle,
  Activity,
  TrendingUp,
  Smartphone,
  Bot,
  User,
  Stethoscope
} from "lucide-react";

type SettingsRow = { user_id: string; email: boolean; sms: boolean; push: boolean; days_before: number[] | null; time_of_day: string | null; };
type ApptRow = { 
  id: string; 
  user_id: string; 
  title: string | null; 
  start_at: string; 
  appointment_time?: string;
  provider: string | null; 
  type: string | null;
  status?: string;
  updated_at?: string;
  staff?: { id: string; first_name?: string; last_name?: string; full_name?: string } | null;
  staff_id?: string | null;
};
type ReminderRow = { id: string; user_id: string; appointment_id: string; channel: "email"|"sms"|"push"; scheduled_for: string; status: "scheduled"|"sent"|"canceled"|"failed"; message: string | null; };

const DEFAULT = { email: true, sms: true, push: true, daysBefore: [1,3], timeOfDay: "09:00" };

export default function AppointmentRemindersPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [queueing, setQueueing] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<"connected" | "disconnected" | "connecting">("connecting");

  const [settings, setSettings] = useState({ ...DEFAULT });
  const [appointments, setAppointments] = useState<ApptRow[]>([]);
  const [completedAppointments, setCompletedAppointments] = useState<ApptRow[]>([]);
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [automationInsights, setAutomationInsights] = useState({
    optimalReminderTime: "09:00",
    suggestedDays: [1, 3],
    efficiency: 0,
    nextScheduled: null as string | null
  });

  const authHeader = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const t = session?.access_token; return t ? { Authorization: `Bearer ${t}` } : {};
  }, []);

  const loadData = useCallback(async () => {
    if (!uid) return;
    
    try {
      setLoading(true);
      setRealtimeStatus("connecting");

      // Load settings
      const sRes = await fetch("/api/automation/reminder-settings", { headers: await authHeader(), cache: "no-store" });
      const sData: SettingsRow | { error: string } = await sRes.json();
      if ("error" in sData) { 
        console.warn(`Load settings: ${sData.error}`); 
      } else {
        const s = sData as SettingsRow;
        setSettings({
          email: !!s.email, sms: !!s.sms, push: !!s.push,
          daysBefore: (s.days_before ?? DEFAULT.daysBefore).map(Number).sort((a,b)=>a-b),
          timeOfDay: s.time_of_day ?? DEFAULT.timeOfDay,
        });
      }

      // Load upcoming appointments
      const from = new Date().toISOString();
      const to = new Date(Date.now() + 30 * 864e5).toISOString();
      const { data: apps, error: appErr } = await supabase
        .from("appointments")
        .select(`
          *,
          staff:staff_id (
            id,
            first_name,
            last_name,
            full_name
          )
        `)
        .eq("patient_id", uid)
        .gte("appointment_time", from)
        .lte("appointment_time", to)
        .order("appointment_time");
      
      if (!appErr) {
        setAppointments(apps ?? []);
      }

      // Also load recently completed appointments to track staff processing
      const { data: completedApps, error: completedErr } = await supabase
        .from("appointments")
        .select(`
          *,
          staff:staff_id (
            id,
            first_name,
            last_name,
            full_name
          )
        `)
        .eq("patient_id", uid)
        .eq("status", "completed")
        .order("updated_at", { ascending: false })
        .limit(10);
      
      if (!completedErr && completedApps) {
        // Store completed appointments for tracking staff processing
        setCompletedAppointments(completedApps);
      }

      // Load reminders
      const rRes = await fetch("/api/automation/reminders", { headers: await authHeader(), cache: "no-store" });
      const rData: ReminderRow[] = await rRes.json();
      setReminders(rData ?? []);

      // Calculate automation insights
      const now = new Date();
      const upcomingAppts = apps?.filter(a => new Date(a.appointment_time) > now) ?? [];
      const activeReminders = rData?.filter(r => r.status === "scheduled") ?? [];
      
      // Calculate efficiency based on reminder coverage with safe defaults
      const daysBeforeCount = Array.isArray(settings.daysBefore) && settings.daysBefore.length > 0 
        ? settings.daysBefore.length 
        : 1; // Default to 1 to avoid division by zero
      
      const efficiency = upcomingAppts.length > 0 && daysBeforeCount > 0
        ? Math.min(100, Math.max(0, (activeReminders.length / (upcomingAppts.length * daysBeforeCount)) * 100))
        : 0;
      
      // Ensure efficiency is a valid number
      const finalEfficiency = isNaN(efficiency) ? 0 : efficiency;
      
      // Find next scheduled reminder
      const nextScheduled = activeReminders
        .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime())[0]?.scheduled_for;

      setAutomationInsights({
        optimalReminderTime: settings.timeOfDay,
        suggestedDays: settings.daysBefore,
        efficiency: Math.round(finalEfficiency),
        nextScheduled
      });

      setRealtimeStatus("connected");
    } catch (error) {
      console.error("Error loading automation data:", error);
      setRealtimeStatus("disconnected");
    } finally {
      setLoading(false);
    }
  }, [uid, authHeader, settings.daysBefore.length, settings.timeOfDay]);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user;
      if (!user) { 
        alert("Sign in required"); 
        setLoading(false); 
        return; 
      }
      setUid(user.id);
    })();
  }, []);

  useEffect(() => {
    if (uid) {
      loadData();
    }
  }, [uid, loadData]);

  // Enhanced real-time subscriptions
  useEffect(() => {
    if (!uid) return;
    
    const appointmentChannel = supabase
      .channel(`automation_appointments_${uid}`)
      .on("postgres_changes", 
        { event: "*", schema: "public", table: "appointments", filter: `patient_id=eq.${uid}` },
        () => {
          console.log("Appointment data changed, refreshing...");
          loadData();
        }
      )
      .subscribe();

    const reminderChannel = supabase
      .channel(`automation_reminders_${uid}`)
      .on("postgres_changes", 
        { event: "*", schema: "public", table: "reminders", filter: `user_id=eq.${uid}` },
        (payload) => {
          console.log("Reminder data changed:", payload);
          setReminders((prev) => {
            if (payload.eventType === "INSERT") {
              return [...prev, payload.new as ReminderRow].sort((a,b)=>a.scheduled_for.localeCompare(b.scheduled_for));
            }
            if (payload.eventType === "UPDATE") {
              return prev.map((r)=> r.id === (payload.new as any).id ? (payload.new as ReminderRow) : r);
            }
            if (payload.eventType === "DELETE") {
              return prev.filter((r)=> r.id !== (payload.old as any).id);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => { 
      supabase.removeChannel(appointmentChannel);
      supabase.removeChannel(reminderChannel);
    };
  }, [uid, loadData]);

  async function saveSettings(patch: Partial<typeof settings>) {
    const next = { ...settings, ...patch };
    setSettings(next); setSaving(true);
    const res = await fetch("/api/automation/reminder-settings", {
      method: "PUT", headers: { "content-type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({
        email: next.email, sms: next.sms, push: next.push,
        days_before: next.daysBefore, time_of_day: next.timeOfDay,
      }),
    });
    if (!res.ok) { const e = await res.json().catch(()=>({})); alert(`Failed to save settings: ${e.error ?? res.status}`); }
    setSaving(false);
  }

  async function enqueue() {
    setQueueing(true);
    const res = await fetch("/api/automation/reminders/queue", { method: "POST", headers: await authHeader() });
    if (!res.ok) { const e = await res.json().catch(()=>({})); alert(`Queue failed: ${e.error ?? res.status}`); }
    setQueueing(false);
  }

  const unreadScheduled = useMemo(() => reminders.filter((r) => r.status === "scheduled").length, [reminders]);
  const toggleDay = (day: number) =>
    saveSettings({ daysBefore: settings.daysBefore.includes(day) ? settings.daysBefore.filter(d=>d!==day) : [...settings.daysBefore, day].sort((a,b)=>a-b) });

  if (loading) return <div className="p-6 flex items-center gap-2 text-gray-600"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  const toLocalDate = (iso: string) => new Date(iso).toLocaleDateString();
  const toLocalTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Real-time Status */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-xl shadow-lg">
              <Bell className="h-6 w-6 text-white" />
            </div>
            <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
              realtimeStatus === "connected" ? "bg-green-500" : 
              realtimeStatus === "connecting" ? "bg-yellow-500" : "bg-red-500"
            }`}></div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Smart Appointment Reminders</h2>
            <p className="text-gray-600">AI-powered automation for your recovery journey</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadData} 
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Refresh
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={enqueue} 
            disabled={queueing || appointments.length === 0}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {queueing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
            Queue Reminders
          </Button>
        </div>
      </div>

      {/* Automation Insights Alert */}
      {automationInsights.efficiency > 0 && (
        <Alert className="border-blue-200 bg-blue-50">
          <Bot className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Automation Insights:</strong> Your reminder system is {automationInsights.efficiency}% efficient. 
            {automationInsights.nextScheduled && (
              <span> Next reminder scheduled for {new Date(automationInsights.nextScheduled).toLocaleString()}.</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Enhanced Settings Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              Smart Reminder Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-gray-600" />
                Notification Methods
              </h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Mail className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <span className="font-medium">Email</span>
                      <p className="text-xs text-gray-500">Detailed appointment information</p>
                    </div>
                  </div>
                  <Switch checked={settings.email} onCheckedChange={(v)=>saveSettings({email:!!v})} />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <MessageSquare className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <span className="font-medium">SMS</span>
                      <p className="text-xs text-gray-500">Quick text reminders</p>
                    </div>
                  </div>
                  <Switch checked={settings.sms} onCheckedChange={(v)=>saveSettings({sms:!!v})} />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <Smartphone className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <span className="font-medium">Push Notifications</span>
                      <p className="text-xs text-gray-500">Instant mobile alerts</p>
                    </div>
                  </div>
                  <Switch checked={settings.push} onCheckedChange={(v)=>saveSettings({push:!!v})} />
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-600" />
                Reminder Schedule
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-3 block">Days Before Appointment</label>
                  <div className="flex gap-2 flex-wrap">
                    {[1,2,3,7].map((d)=>(
                      <Button 
                        key={d} 
                        variant={settings.daysBefore.includes(d)?"default":"outline"} 
                        size="sm" 
                        onClick={()=>toggleDay(d)} 
                        className={`h-9 px-4 ${
                          settings.daysBefore.includes(d) 
                            ? "bg-blue-600 hover:bg-blue-700 text-white" 
                            : "hover:bg-blue-50 hover:text-blue-600"
                        }`}
                      >
                        {d} day{d>1?"s":""}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Reminder Time</label>
                  <input 
                    type="time" 
                    value={settings.timeOfDay} 
                    onChange={(e)=>saveSettings({timeOfDay:e.target.value})} 
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full max-w-xs" 
                  />
                </div>
              </div>
            </div>
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 text-sm">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-blue-600">Saving changes...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">Changes saved automatically</span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Automation Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Automation Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {automationInsights.efficiency}%
              </div>
              <div className="text-sm text-gray-600">Efficiency Score</div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Active Reminders</span>
                <span className="font-medium">{reminders.filter(r => r.status === "scheduled").length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Upcoming Appointments</span>
                <span className="font-medium">{appointments.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Next Reminder</span>
                <span className="font-medium text-blue-600">
                  {automationInsights.nextScheduled ? 
                    new Date(automationInsights.nextScheduled).toLocaleDateString() : 
                    "None"
                  }
                </span>
              </div>
            </div>
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className={`w-2 h-2 rounded-full ${
                  realtimeStatus === "connected" ? "bg-green-500" : 
                  realtimeStatus === "connecting" ? "bg-yellow-500" : "bg-red-500"
                }`}></div>
                {realtimeStatus === "connected" ? "Live updates active" : 
                 realtimeStatus === "connecting" ? "Connecting..." : "Disconnected"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Appointments and Reminders Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Appointments Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Upcoming Appointments
              <Badge variant="outline" className="ml-2">{appointments.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No upcoming appointments</p>
                <p className="text-sm text-gray-400">Schedule appointments to enable automated reminders</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((a) => {
                  const appointmentDate = new Date(a.start_at);
                  const isToday = appointmentDate.toDateString() === new Date().toDateString();
                  const isTomorrow = appointmentDate.toDateString() === new Date(Date.now() + 86400000).toDateString();
                  
                  return (
                    <div key={a.id} className={`p-4 border rounded-lg transition-all hover:shadow-md ${
                      isToday ? "border-blue-200 bg-blue-50" : 
                      isTomorrow ? "border-green-200 bg-green-50" : "border-gray-200"
                    }`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{a.title ?? "Appointment"}</h4>
                          {a.provider && <p className="text-sm text-gray-600">with {a.provider}</p>}
                        </div>
                        <div className="flex gap-2">
                          {isToday && <Badge className="bg-blue-100 text-blue-700">Today</Badge>}
                          {isTomorrow && <Badge className="bg-green-100 text-green-700">Tomorrow</Badge>}
                          <Badge variant="outline">{a.type ?? "General"}</Badge>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 space-y-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{toLocalDate(a.start_at)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{toLocalTime(a.start_at)}</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex flex-wrap gap-1">
                          {settings.daysBefore.map((d) => (
                            <Badge key={d} variant="secondary" className="text-xs">
                              Reminder {d}d before @ {settings.timeOfDay}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Reminders Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-600" />
              Active Reminders
              <Badge variant="outline" className="ml-2">{unreadScheduled} scheduled</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reminders.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No reminders yet</p>
                <p className="text-sm text-gray-400">Queue reminders for your appointments</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reminders.map((r) => {
                  const reminderDate = new Date(r.scheduled_for);
                  const isUpcoming = reminderDate > new Date();
                  
                  return (
                    <div key={r.id} className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                      r.status === "scheduled" ? "bg-blue-50 border border-blue-200" :
                      r.status === "sent" ? "bg-green-50 border border-green-200" :
                      r.status === "failed" ? "bg-red-50 border border-red-200" :
                      "bg-gray-50 border border-gray-200"
                    }`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2 h-2 rounded-full ${
                            r.status === "scheduled" ? "bg-blue-500" :
                            r.status === "sent" ? "bg-green-500" :
                            r.status === "failed" ? "bg-red-500" : "bg-gray-400"
                          }`}></div>
                          <span className="font-medium text-sm">
                            {r.message ?? "Appointment Reminder"}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {r.channel.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500">
                          {isUpcoming ? "Scheduled for" : "Was scheduled for"}: {toLocalDate(r.scheduled_for)} at {toLocalTime(r.scheduled_for)}
                        </div>
                      </div>
                      <Badge 
                        variant={
                          r.status === "scheduled" ? "default" :
                          r.status === "sent" ? "secondary" :
                          r.status === "failed" ? "destructive" : "outline"
                        }
                        className="ml-3"
                      >
                        {r.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Staff Processing Tracking Section */}
      {completedAppointments.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-green-600" />
              Recently Completed Appointments
              <Badge variant="outline" className="ml-2">{completedAppointments.length}</Badge>
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Track when staff processes and applies procedures to your appointments
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {completedAppointments.map((apt) => {
                const completedDate = apt.updated_at ? new Date(apt.updated_at) : (apt.appointment_time ? new Date(apt.appointment_time) : new Date());
                const staffName = apt.staff?.full_name || 
                  (apt.staff?.first_name && apt.staff?.last_name 
                    ? `${apt.staff.first_name} ${apt.staff.last_name}` 
                    : apt.provider || "Staff Member");
                
                return (
                  <div key={apt.id} className="p-4 border rounded-lg bg-green-50 border-green-200">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <h4 className="font-semibold text-gray-900">{apt.title ?? "Appointment"}</h4>
                          <Badge className="bg-green-100 text-green-700">Completed</Badge>
                        </div>
                        {apt.type && (
                          <p className="text-sm text-gray-600 mb-2">Type: {apt.type}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-700">
                        <User className="h-4 w-4 text-blue-600" />
                        <span><strong>Processed by:</strong> {staffName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Calendar className="h-4 w-4 text-purple-600" />
                        <span><strong>Appointment Date:</strong> {toLocalDate(apt.appointment_time || apt.start_at)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Clock className="h-4 w-4 text-orange-600" />
                        <span><strong>Completed on:</strong> {completedDate.toLocaleDateString()} at {completedDate.toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
