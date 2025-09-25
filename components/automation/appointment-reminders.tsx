// path: app/dashboard/automation/appointment-reminders/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Bell, Calendar, Clock, Mail, MessageSquare, Settings, Loader2, RefreshCcw } from "lucide-react";

type ReminderSettingsRow = {
  user_id: string;
  email: boolean;
  sms: boolean;
  push: boolean;
  days_before: number[] | null;
  time_of_day: string | null; // "HH:MM"
};

type AppointmentRow = {
  id: string;
  user_id: string;
  title: string | null;
  start_at: string; // ISO
  provider: string | null;
  type: string | null;
};

type ReminderRow = {
  id: string;
  user_id: string;
  appointment_id: string;
  channel: "email" | "sms" | "push";
  scheduled_for: string; // ISO
  status: "scheduled" | "sent" | "canceled" | "failed";
  message: string | null;
};

type SettingsUI = {
  email: boolean;
  sms: boolean;
  push: boolean;
  daysBefore: number[];
  timeOfDay: string;
};

const DEFAULT_SETTINGS: SettingsUI = {
  email: true,
  sms: true,
  push: true,
  daysBefore: [1, 3],
  timeOfDay: "09:00",
};

function toLocalDate(iso: string) {
  return new Date(iso).toLocaleDateString();
}
function toLocalTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function combineDateTime(dateISO: string, hhmm: string) {
  const d = new Date(dateISO);
  const [hh, mm] = hhmm.split(":").map((x) => parseInt(x, 10));
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}
function minusDays(iso: string, days: number, timeOfDay: string) {
  const d = new Date(iso);
  d.setDate(d.getDate() - days);
  return combineDateTime(d.toISOString(), timeOfDay);
}

export default function AppointmentRemindersPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [queueing, setQueueing] = useState(false);

  const [settings, setSettings] = useState<SettingsUI>(DEFAULT_SETTINGS);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [reminders, setReminders] = useState<ReminderRow[]>([]);

  const unreadScheduled = useMemo(
    () => reminders.filter((r) => r.status === "scheduled").length,
    [reminders]
  );

  // Load session + data
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: sess } = await supabase.auth.getSession();
        const user = sess.session?.user;
        if (!user) throw new Error("Not authenticated");
        setUid(user.id);

        // SETTINGS (seed if missing)
        const { data: setRow, error: setErr } = await supabase
          .from<ReminderSettingsRow>("reminder_settings")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (setErr) console.error("settings select error", setErr);

        if (!setRow) {
          const seedRow: ReminderSettingsRow = {
            user_id: user.id,
            email: DEFAULT_SETTINGS.email,
            sms: DEFAULT_SETTINGS.sms,
            push: DEFAULT_SETTINGS.push,
            days_before: DEFAULT_SETTINGS.daysBefore,
            time_of_day: DEFAULT_SETTINGS.timeOfDay,
          };
          const ins = await supabase.from("reminder_settings").insert(seedRow);
          if (ins.error) console.error("settings seed error", ins.error);
          setSettings(DEFAULT_SETTINGS);
        } else {
          setSettings({
            email: !!setRow.email,
            sms: !!setRow.sms,
            push: !!setRow.push,
            daysBefore: (setRow.days_before ?? DEFAULT_SETTINGS.daysBefore).map((n) => Number(n)).sort((a, b) => a - b),
            timeOfDay: setRow.time_of_day ?? DEFAULT_SETTINGS.timeOfDay,
          });
        }

        // APPOINTMENTS (upcoming 30 days)
        const { data: apps, error: appErr } = await supabase
          .from<AppointmentRow>("appointments")
          .select("*")
          .eq("user_id", user.id)
          .gte("start_at", new Date().toISOString())
          .lte("start_at", new Date(Date.now() + 30 * 86400000).toISOString())
          .order("start_at", { ascending: true });
        if (appErr) console.error("appointments error", appErr);
        setAppointments(apps ?? []);

        // REMINDERS for this user (next 60 days recent)
        const { data: rms, error: rErr } = await supabase
          .from<ReminderRow>("reminders")
          .select("*")
          .eq("user_id", user.id)
          .gte("scheduled_for", new Date(Date.now() - 7 * 86400000).toISOString())
          .order("scheduled_for", { ascending: true });
        if (rErr) console.error("reminders error", rErr);
        setReminders(rms ?? []);
      } catch (e) {
        console.error(e);
        alert("Please sign in to manage reminders.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Realtime reminders
  useEffect(() => {
    if (!uid) return;
    const ch = supabase
      .channel(`reminders:${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reminders", filter: `user_id=eq.${uid}` },
        (payload) => {
          setReminders((prev) => {
            if (payload.eventType === "INSERT") return [...prev, payload.new as ReminderRow].sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for));
            if (payload.eventType === "UPDATE") {
              const up = payload.new as ReminderRow;
              return prev.map((r) => (r.id === up.id ? up : r));
            }
            if (payload.eventType === "DELETE") {
              const del = payload.old as ReminderRow;
              return prev.filter((r) => r.id !== del.id);
            }
            return prev;
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [uid]);

  // SETTINGS mutations
  const updateSettings = async (patch: Partial<SettingsUI>) => {
    if (!uid) return;
    const next: SettingsUI = { ...settings, ...patch };
    setSettings(next);
    setSaving(true);
    try {
      const { error } = await supabase
        .from("reminder_settings")
        .update({
          email: next.email,
          sms: next.sms,
          push: next.push,
          days_before: next.daysBefore,
          time_of_day: next.timeOfDay,
        })
        .eq("user_id", uid);
      if (error) throw error;
    } catch (e: any) {
      console.error("save settings error", e);
      alert(`Failed to save settings: ${e.message ?? e}`);
    } finally {
      setSaving(false);
    }
  };

  // ENQUEUE reminders (idempotent check by existence)
  const enqueueReminders = async () => {
    if (!uid) return;
    setQueueing(true);
    try {
      const channels = (["email", "sms", "push"] as const).filter((c) => (settings as any)[c]);
      if (channels.length === 0) {
        alert("Enable at least one channel.");
        return;
      }
      const rows: Omit<ReminderRow, "id">[] = [];
      appointments.forEach((a) => {
        channels.forEach((ch) => {
          settings.daysBefore.forEach((d) => {
            const scheduled_for = minusDays(a.start_at, d, settings.timeOfDay);
            const message = `Reminder: "${a.title ?? "Appointment"}" on ${toLocalDate(a.start_at)} at ${toLocalTime(a.start_at)} with ${a.provider ?? "your provider"}`;
            rows.push({
              user_id: uid,
              appointment_id: a.id,
              channel: ch,
              scheduled_for,
              status: "scheduled",
              message,
            } as any);
          });
        });
      });

      // Filter out ones already present (simple existence check by same triplet)
      for (const r of rows) {
        const { data: exists, error: exErr } = await supabase
          .from<ReminderRow>("reminders")
          .select("id")
          .eq("user_id", r.user_id)
          .eq("appointment_id", r.appointment_id)
          .eq("channel", r.channel)
          .eq("scheduled_for", r.scheduled_for)
          .maybeSingle();
        if (exErr) console.error(exErr);
        if (!exists) {
          const { error } = await supabase.from("reminders").insert(r as any);
          if (error) console.error("insert reminder error", error);
        }
      }

      alert("Reminders queued. A background worker should deliver them.");
    } catch (e: any) {
      console.error("enqueue error", e);
      alert(`Failed to queue reminders: ${e.message ?? e}`);
    } finally {
      setQueueing(false);
    }
  };

  const toggleReminderDay = (day: number) => {
    const next = settings.daysBefore.includes(day)
      ? settings.daysBefore.filter((d) => d !== day)
      : [...settings.daysBefore, day].sort((a, b) => a - b);
    updateSettings({ daysBefore: next });
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-gray-600">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-cyan-600" />
          <h2 className="text-2xl font-bold text-gray-900">Automated Appointment Reminders</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={enqueueReminders} disabled={queueing || appointments.length === 0}>
            {queueing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Queue Reminders
          </Button>
        </div>
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
                    <span>Email</span>
                  </div>
                  <Switch checked={settings.email} onCheckedChange={(v) => updateSettings({ email: !!v })} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-gray-500" />
                    <span>SMS</span>
                  </div>
                  <Switch checked={settings.sms} onCheckedChange={(v) => updateSettings({ sms: !!v })} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-gray-500" />
                    <span>Push</span>
                  </div>
                  <Switch checked={settings.push} onCheckedChange={(v) => updateSettings({ push: !!v })} />
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
                    onChange={(e) => updateSettings({ timeOfDay: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 text-xs text-gray-500">
              {saving ? "Saving…" : "Changes are saved automatically"}
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
            {appointments.length === 0 ? (
              <div className="text-sm text-gray-500">No upcoming appointments.</div>
            ) : (
              <div className="space-y-4">
                {appointments.map((a) => (
                  <div key={a.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{a.title ?? "Appointment"}</h4>
                      <Badge variant="outline">{a.type ?? "General"}</Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{toLocalDate(a.start_at)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{toLocalTime(a.start_at)}</span>
                      </div>
                      {a.provider && <div>Provider: {a.provider}</div>}
                    </div>
                    <div className="mt-3 flex gap-2">
                      {settings.daysBefore.map((d) => (
                        <Badge key={d} variant="secondary" className="text-xs">
                          Reminder {d}d before @ {settings.timeOfDay}
                        </Badge>
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Active Reminders
            <span className="ml-2 text-xs text-gray-500">({unreadScheduled} scheduled)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reminders.length === 0 ? (
            <div className="text-sm text-gray-500">No reminders yet.</div>
          ) : (
            <div className="space-y-3">
              {reminders.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {r.message ?? "Reminder"} — <span className="uppercase">{r.channel}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Scheduled for: {toLocalDate(r.scheduled_for)} {toLocalTime(r.scheduled_for)}
                    </div>
                  </div>
                  <Badge
                    variant={
                      r.status === "scheduled" ? "default" : r.status === "sent" ? "secondary" : "outline"
                    }
                    className="ml-3"
                  >
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
