"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Target, Award, AlertTriangle, CheckCircle2 } from "lucide-react";

type GoalType = "medication_adherence" | "appointment_attendance" | "wellness_score" | "activity_completion";
type Timeframe = "daily" | "weekly" | "monthly";
type AlertType = "milestone" | "warning" | "achievement";

type AutomatedGoal = {
  id: string;
  user_id: string;
  title: string;
  type: GoalType;
  target: number;
  current: number;
  unit: string;
  timeframe: Timeframe;
  automated: boolean;
  last_updated: string; // ISO
};

type ProgressAlert = {
  id: string;
  user_id: string;
  goal_id: string;
  type: AlertType;
  message: string;
  timestamp: string;   // ISO
  acknowledged: boolean;
};

type AutomationSettings = {
  user_id: string;
  daily_updates: boolean;
  weekly_reports: boolean;
  goal_reminders: boolean;
  achievement_notifications: boolean;
  warning_alerts: boolean;
};

const DEFAULT_SETTINGS: AutomationSettings = {
  user_id: "",
  daily_updates: true,
  weekly_reports: true,
  goal_reminders: true,
  achievement_notifications: true,
  warning_alerts: true,
};

export default function ProgressAutomation() {
  const [uid, setUid] = useState<string | null>(null);
  const [goals, setGoals] = useState<AutomatedGoal[]>([]);
  const [alerts, setAlerts] = useState<ProgressAlert[]>([]);
  const [settings, setSettings] = useState<AutomationSettings>(DEFAULT_SETTINGS);

  // session + initial load
  const loadAll = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;
    if (!user) return;
    setUid(user.id);

    const [{ data: g }, { data: a }, { data: s }] = await Promise.all([
      supabase.from("automated_goals").select("*").eq("user_id", user.id).order("last_updated", { ascending: false }),
      supabase.from("progress_alerts").select("*").eq("user_id", user.id).order("timestamp", { ascending: false }),
      supabase.from("progress_automation_settings").select("*").eq("user_id", user.id).maybeSingle(),
    ]);

    setGoals((g as AutomatedGoal[]) ?? []);
    setAlerts((a as ProgressAlert[]) ?? []);
    setSettings((s as AutomationSettings) ?? { ...DEFAULT_SETTINGS, user_id: user.id });
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // realtime
  useEffect(() => {
    if (!uid) return;
    const ch = supabase
      .channel(`progress:${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "automated_goals", filter: `user_id=eq.${uid}` },
        async () => {
          const { data } = await supabase.from("automated_goals").select("*").eq("user_id", uid).order("last_updated", { ascending: false });
          setGoals((data as AutomatedGoal[]) ?? []);
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "progress_alerts", filter: `user_id=eq.${uid}` },
        async () => {
          const { data } = await supabase.from("progress_alerts").select("*").eq("user_id", uid).order("timestamp", { ascending: false });
          setAlerts((data as ProgressAlert[]) ?? []);
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "progress_automation_settings", filter: `user_id=eq.${uid}` },
        async () => {
          const { data } = await supabase.from("progress_automation_settings").select("*").eq("user_id", uid).maybeSingle();
          setSettings((data as AutomationSettings) ?? { ...DEFAULT_SETTINGS, user_id: uid });
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uid]);

  // helpers
  function pct(g: AutomatedGoal) { return Math.min(100, (g.current / (g.target || 1)) * 100); }
  function iconForAlert(t: AlertType) {
    return t === "achievement" ? <Award className="h-4 w-4 text-green-600" /> :
           t === "milestone"   ? <Target className="h-4 w-4 text-blue-600" /> :
                                 <AlertTriangle className="h-4 w-4 text-orange-600" />;
  }
  function colorForAlert(t: AlertType) {
    return t === "achievement" ? "bg-green-50 border-green-200" :
           t === "milestone"   ? "bg-blue-50 border-blue-200"   :
                                 "bg-orange-50 border-orange-200";
  }

  // actions
  async function toggleAutomation(goalId: string, next: boolean) {
    if (!uid) return;
    await supabase.from("automated_goals").update({ automated: next, last_updated: new Date().toISOString() })
      .eq("id", goalId).eq("user_id", uid);
  }
  async function acknowledgeAlert(id: string) {
    if (!uid) return;
    await supabase.from("progress_alerts").update({ acknowledged: true }).eq("id", id).eq("user_id", uid);
  }
  async function updateGoal(goal: AutomatedGoal, patch: Partial<AutomatedGoal>) {
    if (!uid) return;
    await supabase.from("automated_goals").update({ ...patch, last_updated: new Date().toISOString() })
      .eq("id", goal.id).eq("user_id", uid);
  }
  async function upsertSettings(patch: Partial<AutomationSettings>) {
    if (!uid) return;
    const next = { ...(settings.user_id ? settings : { ...DEFAULT_SETTINGS, user_id: uid }), ...patch };
    setSettings(next); // optimistic
    await supabase.from("progress_automation_settings").upsert(next, { onConflict: "user_id" });
  }

  const unacked = useMemo(() => alerts.filter(a => !a.acknowledged), [alerts]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-6 w-6 text-cyan-600" />
        <h2 className="text-2xl font-bold text-gray-900">Automated Progress Tracking</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Automated Goals</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-6">
                {goals.map((g) => (
                  <div key={g.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Input
                          value={g.title}
                          onChange={(e) => updateGoal(g, { title: e.target.value })}
                          className="w-56"
                        />
                        <Select
                          value={g.type}
                          onValueChange={(v) => updateGoal(g, { type: v as GoalType })}
                        >
                          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="medication_adherence">Medication Adherence</SelectItem>
                            <SelectItem value="appointment_attendance">Appointment Attendance</SelectItem>
                            <SelectItem value="wellness_score">Daily Wellness</SelectItem>
                            <SelectItem value="activity_completion">Recovery Activities</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={g.automated ? "default" : "secondary"}>{g.automated ? "Auto" : "Manual"}</Badge>
                        <Switch checked={g.automated} onCheckedChange={(v) => toggleAutomation(g.id, v)} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <span>Current</span>
                      <Input
                        value={g.current}
                        onChange={(e) => updateGoal(g, { current: Number(e.target.value) || 0 })}
                        className="w-24"
                      />
                      <span>Target</span>
                      <Input
                        value={g.target}
                        onChange={(e) => updateGoal(g, { target: Number(e.target.value) || 0 })}
                        className="w-24"
                      />
                      <span>Unit</span>
                      <Input
                        value={g.unit}
                        onChange={(e) => updateGoal(g, { unit: e.target.value })}
                        className="w-24"
                      />
                      <Select
                        value={g.timeframe}
                        onValueChange={(v) => updateGoal(g, { timeframe: v as Timeframe })}
                      >
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{Math.round(pct(g))}%</span>
                      </div>
                      <Progress value={pct(g)} className="h-2" />
                    </div>
                    <p className="text-xs text-gray-500">Last updated: {new Date(g.last_updated).toLocaleString()}</p>
                  </div>
                ))}
                {goals.length === 0 && <div className="text-sm text-gray-500">No goals yet.</div>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Automation Settings</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Row
                  title="Daily Progress Updates"
                  desc="Automatically track daily activities and medication"
                  checked={settings.daily_updates}
                  onChange={(v) => upsertSettings({ daily_updates: !!v })}
                />
                <Row
                  title="Weekly Reports"
                  desc="Generate automated weekly progress summaries"
                  checked={settings.weekly_reports}
                  onChange={(v) => upsertSettings({ weekly_reports: !!v })}
                />
                <Row
                  title="Goal Reminders"
                  desc="Send reminders when falling behind on goals"
                  checked={settings.goal_reminders}
                  onChange={(v) => upsertSettings({ goal_reminders: !!v })}
                />
                <Row
                  title="Achievement Notifications"
                  desc="Celebrate when reaching milestones"
                  checked={settings.achievement_notifications}
                  onChange={(v) => upsertSettings({ achievement_notifications: !!v })}
                />
                <Row
                  title="Warning Alerts"
                  desc="Alert when metrics drop below threshold"
                  checked={settings.warning_alerts}
                  onChange={(v) => upsertSettings({ warning_alerts: !!v })}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Progress Alerts</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unacked.map((a) => (
                <div key={a.id} className={`p-3 rounded-lg border ${colorForAlert(a.type)}`}>
                  <div className="flex items-start gap-2">
                    {iconForAlert(a.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{a.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{new Date(a.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => acknowledgeAlert(a.id)} className="mt-2 h-6 px-2 text-xs">
                    Acknowledge
                  </Button>
                </div>
              ))}
              {unacked.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No new alerts</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ title, desc, checked, onChange }: { title: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-gray-600">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
