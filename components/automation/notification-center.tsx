"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Mail, MessageSquare, Smartphone, Settings } from "lucide-react";

type RuleType = "appointment" | "medication" | "progress" | "emergency" | "wellness";
type Channel = "email" | "sms" | "push" | "in_app";
type Freq = "immediate" | "daily" | "weekly";
type NotifStatus = "sent" | "delivered" | "read" | "failed";
type Priority = "low" | "medium" | "high" | "urgent";

type NotificationRule = {
  id: string;
  user_id: string;
  name: string;
  type: RuleType;
  channels: Channel[];
  conditions: string | null;
  frequency: Freq;
  active: boolean;
  created_at: string;
  updated_at: string;
};
type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: RuleType;
  channel: Channel;
  status: NotifStatus;
  timestamp: string;
  priority: Priority;
};
type Prefs = {
  user_id: string;
  enable_notifications: boolean;
  quiet_start: string;
  quiet_end: string;
  max_daily_notifications: number;
  min_priority: Priority;
};

export default function NotificationCenter() {
  const [uid, setUid] = useState<string | null>(null);
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [prefs, setPrefs] = useState<Prefs | null>(null);

  // session + patient ensure + load data
  const loadAll = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;
    if (!user) return;
    setUid(user.id);

    // ensure patient exists (read-only guard)
    const { data: pat } = await supabase.from("patients").select("user_id").eq("user_id", user.id).maybeSingle();
    if (!pat) {
      // optional soft create via an admin path; keep read-only here
      console.warn("No patients row for current user_id");
    }

    const [{ data: r }, { data: n }, { data: p }] = await Promise.all([
      supabase.from("notification_rules").select("*").eq("user_id", user.id).order("created_at"),
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("timestamp", { ascending: false })
        .limit(50),
      supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle(),
    ]);

    setRules((r as NotificationRule[]) ?? []);
    setNotifs((n as Notification[]) ?? []);
    setPrefs((p as Prefs) ?? {
      user_id: user.id,
      enable_notifications: true,
      quiet_start: "22:00",
      quiet_end: "07:00",
      max_daily_notifications: 10,
      min_priority: "low",
    });
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // realtime
  useEffect(() => {
    if (!uid) return;
    const ch = supabase
      .channel(`notif:${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notification_rules", filter: `user_id=eq.${uid}` }, async () => {
        const { data } = await supabase.from("notification_rules").select("*").eq("user_id", uid).order("created_at");
        setRules((data as NotificationRule[]) ?? []);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` }, async () => {
        const { data } = await supabase
          .from("notifications").select("*").eq("user_id", uid).order("timestamp", { ascending: false }).limit(50);
        setNotifs((data as Notification[]) ?? []);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "notification_preferences", filter: `user_id=eq.${uid}` }, async () => {
        const { data } = await supabase.from("notification_preferences").select("*").eq("user_id", uid).maybeSingle();
        setPrefs((data as Prefs) ?? null);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uid]);

  // actions
  async function toggleRule(ruleId: string, next: boolean) {
    if (!uid) return;
    setRules((prev) => prev.map(r => r.id === ruleId ? { ...r, active: next } : r)); // optimistic
    await supabase.from("notification_rules").update({ active: next }).eq("id", ruleId).eq("user_id", uid);
  }
  async function updateRuleChannels(ruleId: string, channels: Channel[]) {
    if (!uid) return;
    setRules((prev) => prev.map(r => r.id === ruleId ? { ...r, channels } : r)); // optimistic
    await supabase.from("notification_rules").update({ channels }).eq("id", ruleId).eq("user_id", uid);
  }
  async function upsertPrefs(patch: Partial<Prefs>) {
    if (!uid) return;
    const next = { ...(prefs ?? { user_id: uid, enable_notifications: true, quiet_start: "22:00", quiet_end: "07:00", max_daily_notifications: 10, min_priority: "low" as Priority }), ...patch };
    setPrefs(next); // optimistic
    await supabase.from("notification_preferences").upsert(next, { onConflict: "user_id" });
  }

  // helpers
  const channelIcon = (c: Channel) =>
    c === "email" ? <Mail className="h-4 w-4" /> :
    c === "sms"   ? <MessageSquare className="h-4 w-4" /> :
    c === "push"  ? <Smartphone className="h-4 w-4" /> : <Bell className="h-4 w-4" />;

  const priorityBadge = (p: Priority) =>
    p === "urgent" ? "bg-red-100 text-red-800 border-red-200" :
    p === "high"   ? "bg-orange-100 text-orange-800 border-orange-200" :
    p === "medium" ? "bg-blue-100 text-blue-800 border-blue-200" :
                     "bg-gray-100 text-gray-800 border-gray-200";

  const statusColor = (s: NotifStatus) =>
    s === "delivered" ? "text-green-600"
    : s === "read"    ? "text-blue-600"
    : s === "failed"  ? "text-red-600"
    :                   "text-yellow-600";

  // render
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6 text-cyan-600" />
        <h2 className="text-2xl font-bold text-gray-900">Automated Notifications</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Notification Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {rules.map((rule) => (
                  <div key={rule.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{rule.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{rule.conditions ?? "—"}</p>
                      </div>
                      <Switch checked={rule.active} onCheckedChange={(v) => toggleRule(rule.id, !!v)} />
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Channels</label>
                        <div className="flex gap-2 flex-wrap">
                          {(["email","sms","push","in_app"] as Channel[]).map((ch) => {
                            const enabled = rule.channels.includes(ch);
                            const next = enabled ? rule.channels.filter(c => c !== ch) : [...rule.channels, ch];
                            return (
                              <Button key={ch} size="sm" variant={enabled ? "default" : "outline"} onClick={() => updateRuleChannels(rule.id, next)} className="h-8 px-3">
                                {channelIcon(ch)}
                                <span className="ml-1 capitalize">{ch === "in_app" ? "In-App" : ch}</span>
                              </Button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <Badge variant="outline">{rule.type}</Badge>
                        <Badge variant="secondary">{rule.frequency}</Badge>
                        <Badge variant={rule.active ? "default" : "secondary"}>{rule.active ? "Active" : "Inactive"}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
                {rules.length === 0 && <div className="text-sm text-gray-500">No rules configured.</div>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Global Settings</CardTitle></CardHeader>
            <CardContent>
              {prefs && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Enable Notifications</h4>
                      <p className="text-sm text-gray-600">Master switch for all notifications</p>
                    </div>
                    <Switch checked={!!prefs.enable_notifications} onCheckedChange={(v) => upsertPrefs({ enable_notifications: !!v })} />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Quiet Hours Start</label>
                      <input type="time" value={prefs.quiet_start} onChange={(e) => upsertPrefs({ quiet_start: e.target.value })} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-cyan-500" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Quiet Hours End</label>
                      <input type="time" value={prefs.quiet_end} onChange={(e) => upsertPrefs({ quiet_end: e.target.value })} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-cyan-500" />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Max Daily Notifications</label>
                      <input type="number" min={0} value={prefs.max_daily_notifications} onChange={(e) => upsertPrefs({ max_daily_notifications: Number(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-cyan-500" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Minimum Priority Level</label>
                      <Select value={prefs.min_priority} onValueChange={(v: Priority) => upsertPrefs({ min_priority: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low and above</SelectItem>
                          <SelectItem value="medium">Medium and above</SelectItem>
                          <SelectItem value="high">High and above</SelectItem>
                          <SelectItem value="urgent">Urgent only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle>Recent Notifications</CardTitle>
                {notifs.filter(n => n.status !== "read").length > 0 && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    {notifs.filter(n => n.status !== "read").length} unread
                  </Badge>
                )}
              </div>
              {notifs.filter(n => n.status !== "read").length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (!uid) return;
                    const unreadNotifs = notifs.filter(n => n.status !== "read");
                    if (unreadNotifs.length === 0) return;
                    
                    // Optimistically update UI
                    setNotifs(prev => prev.map(n => 
                      unreadNotifs.some(u => u.id === n.id) ? { ...n, status: "read" as NotifStatus } : n
                    ));
                    
                    // Update in database
                    const unreadIds = unreadNotifs.map(n => n.id);
                    const { error } = await supabase
                      .from("notifications")
                      .update({ status: "read" })
                      .in("id", unreadIds)
                      .eq("user_id", uid);
                    
                    if (error) {
                      console.error("Error marking all as read:", error);
                      // Revert on error
                      setNotifs(prev => prev.map(n => 
                        unreadNotifs.some(u => u.id === n.id) ? { ...n, status: unreadNotifs.find(u => u.id === n.id)?.status || "sent" } : n
                      ));
                    }
                  }}
                  className="text-xs"
                >
                  Mark All as Read
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifs.map((n) => (
                <div key={n.id} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {channelIcon(n.channel)}
                      <h4 className="font-medium text-sm">{n.title}</h4>
                    </div>
                    <Badge className={`text-xs ${priorityBadge(n.priority)}`}>{n.priority}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{n.message}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{new Date(n.timestamp).toLocaleString()}</span>
                    <div className="flex items-center gap-2">
                      <span className={
                        n.status === "delivered" ? "text-green-600" :
                        n.status === "read" ? "text-blue-600" :
                        n.status === "failed" ? "text-red-600" : "text-yellow-600"
                      }>
                        {n.status}
                      </span>
                      {n.status !== "read" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          onClick={async () => {
                            if (!uid) return;
                            
                            // Optimistically update UI
                            setNotifs(prev => prev.map(notif => 
                              notif.id === n.id ? { ...notif, status: "read" as NotifStatus } : notif
                            ));
                            
                            // Update in database
                            const { error } = await supabase
                              .from("notifications")
                              .update({ status: "read" })
                              .eq("id", n.id)
                              .eq("user_id", uid);
                            
                            if (error) {
                              console.error("Error marking as read:", error);
                              // Revert on error
                              setNotifs(prev => prev.map(notif => 
                                notif.id === n.id ? { ...notif, status: n.status } : notif
                              ));
                            }
                          }}
                        >
                          Mark as Read
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {notifs.length === 0 && <div className="text-sm text-gray-500">No notifications yet.</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
