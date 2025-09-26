"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Bell, Calendar, Clock, Mail, MessageSquare, Settings, Loader2, RefreshCcw } from "lucide-react";

type SettingsRow = { user_id: string; email: boolean; sms: boolean; push: boolean; days_before: number[] | null; time_of_day: string | null; };
type ApptRow = { id: string; user_id: string; title: string | null; start_at: string; provider: string | null; type: string | null; };
type ReminderRow = { id: string; user_id: string; appointment_id: string; channel: "email"|"sms"|"push"; scheduled_for: string; status: "scheduled"|"sent"|"canceled"|"failed"; message: string | null; };

const DEFAULT = { email: true, sms: true, push: true, daysBefore: [1,3], timeOfDay: "09:00" };

export default function AppointmentRemindersPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [queueing, setQueueing] = useState(false);

  const [settings, setSettings] = useState({ ...DEFAULT });
  const [appointments, setAppointments] = useState<ApptRow[]>([]);
  const [reminders, setReminders] = useState<ReminderRow[]>([]);

  const authHeader = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const t = session?.access_token; return t ? { Authorization: `Bearer ${t}` } : {};
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user;
      if (!user) { alert("Sign in required"); setLoading(false); return; }
      setUid(user.id);

      // settings
      const sRes = await fetch("/api/automation/reminder-settings", { headers: await authHeader(), cache: "no-store" });
      const sData: SettingsRow | { error: string } = await sRes.json();
      if ("error" in sData) { alert(`Load settings: ${sData.error}`); }
      const s = sData as SettingsRow;
      setSettings({
        email: !!s.email, sms: !!s.sms, push: !!s.push,
        daysBefore: (s.days_before ?? DEFAULT.daysBefore).map(Number).sort((a,b)=>a-b),
        timeOfDay: s.time_of_day ?? DEFAULT.timeOfDay,
      });

      // upcoming appointments via view
      const from = new Date().toISOString();
      const to = new Date(Date.now() + 30 * 864e5).toISOString();
      const { data: apps, error: appErr } = await supabase
        .from<ApptRow>("automation_appointments")
        .select("*").eq("user_id", user.id).gte("start_at", from).lte("start_at", to).order("start_at");
      if (!appErr) setAppointments(apps ?? []);

      // reminders
      const rRes = await fetch("/api/automation/reminders", { headers: await authHeader(), cache: "no-store" });
      const rData: ReminderRow[] = await rRes.json();
      setReminders(rData ?? []);

      setLoading(false);
    })();
  }, [authHeader]);

  // realtime reminders
  useEffect(() => {
    if (!uid) return;
    const ch = supabase.channel(`reminders:${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reminders", filter: `user_id=eq.${uid}` }, (p) => {
        setReminders((prev) => {
          if (p.eventType === "INSERT") return [...prev, p.new as ReminderRow].sort((a,b)=>a.scheduled_for.localeCompare(b.scheduled_for));
          if (p.eventType === "UPDATE") return prev.map((r)=> r.id === (p.new as any).id ? (p.new as ReminderRow) : r);
          if (p.eventType === "DELETE") return prev.filter((r)=> r.id !== (p.old as any).id);
          return prev;
        });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uid]);

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-cyan-600" />
          <h2 className="text-2xl font-bold text-gray-900">Automated Appointment Reminders</h2>
        </div>
        <Button variant="outline" size="sm" onClick={enqueue} disabled={queueing || appointments.length === 0}>
          {queueing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
          Queue Reminders
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" />Reminder Settings</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-medium mb-3">Notification Methods</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Mail className="h-4 w-4 text-gray-500" /><span>Email</span></div><Switch checked={settings.email} onCheckedChange={(v)=>saveSettings({email:!!v})} /></div>
                <div className="flex items-center justify-between"><div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-gray-500" /><span>SMS</span></div><Switch checked={settings.sms} onCheckedChange={(v)=>saveSettings({sms:!!v})} /></div>
                <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Bell className="h-4 w-4 text-gray-500" /><span>Push</span></div><Switch checked={settings.push} onCheckedChange={(v)=>saveSettings({push:!!v})} /></div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3">Reminder Schedule</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-600 mb-2 block">Days Before Appointment</label>
                  <div className="flex gap-2 flex-wrap">
                    {[1,2,3,7].map((d)=>(
                      <Button key={d} variant={settings.daysBefore.includes(d)?"default":"outline"} size="sm" onClick={()=>toggleDay(d)} className="h-8">
                        {d} day{d>1?"s":""}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-2 block">Reminder Time</label>
                  <input type="time" value={settings.timeOfDay} onChange={(e)=>saveSettings({timeOfDay:e.target.value})} className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-cyan-500" />
                </div>
              </div>
            </div>
            <div className="pt-2 text-xs text-gray-500">{saving ? "Saving…" : "Changes are saved automatically"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Upcoming Appointments</CardTitle></CardHeader>
          <CardContent>
            {appointments.length===0 ? <div className="text-sm text-gray-500">No upcoming appointments.</div> : (
              <div className="space-y-4">
                {appointments.map((a)=>(
                  <div key={a.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{a.title ?? "Appointment"}</h4>
                      <Badge variant="outline">{a.type ?? "General"}</Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span>{toLocalDate(a.start_at)}</span></div>
                      <div className="flex items-center gap-2"><Clock className="h-4 w-4" /><span>{toLocalTime(a.start_at)}</span></div>
                      {a.provider && <div>Provider: {a.provider}</div>}
                    </div>
                    <div className="mt-3 flex gap-2">
                      {settings.daysBefore.map((d)=>(
                        <Badge key={d} variant="secondary" className="text-xs">Reminder {d}d before @ {settings.timeOfDay}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Active Reminders <span className="ml-2 text-xs text-gray-500">({unreadScheduled} scheduled)</span></CardTitle></CardHeader>
        <CardContent>
          {reminders.length===0 ? <div className="text-sm text-gray-500">No reminders yet.</div> : (
            <div className="space-y-3">
              {reminders.map((r)=>(
                <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{r.message ?? "Reminder"} — <span className="uppercase">{r.channel}</span></div>
                    <div className="text-xs text-gray-500 mt-1">Scheduled: {toLocalDate(r.scheduled_for)} {toLocalTime(r.scheduled_for)}</div>
                  </div>
                  <Badge variant={r.status==="scheduled"?"default":r.status==="sent"?"secondary":"outline"} className="ml-3">{r.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
