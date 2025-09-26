// components/automation/medication-reminders.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pill, Clock, Plus, CheckCircle } from "lucide-react";

type Frequency = "daily" | "twice-daily" | "three-times-daily" | "weekly";
type Status = "pending" | "taken" | "missed" | "skipped";

type Medication = {
  id: string;
  user_id: string;
  name: string;
  dosage: string;
  frequency: Frequency;
  times: string[];                 // "HH:MM"
  start_date: string;              // YYYY-MM-DD
  end_date: string | null;
  instructions: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type MedicationLog = {
  id: string;
  user_id: string;
  medication_id: string;
  scheduled_at: string;            // ISO
  taken_at: string | null;
  status: Status;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export default function MedicationReminders() {
  const [uid, setUid] = useState<string | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [todayLogs, setTodayLogs] = useState<MedicationLog[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMedication, setNewMedication] = useState<Partial<Medication>>({
    name: "",
    dosage: "",
    frequency: "daily",
    times: ["08:00"],
    instructions: "",
    active: true,
  });

  // time helpers
  const startOfToday = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
  const endOfToday = () => { const d = new Date(); d.setHours(23,59,59,999); return d; };
  const isoFromHHMM = (hhmm: string) => { const [h,m] = hhmm.split(":").map(Number); const d = new Date(); d.setHours(h||0,m||0,0,0); return d.toISOString(); };

  // session + initial data
  const loadAll = useCallback(async () => {
    const { data: s } = await supabase.auth.getSession();
    const u = s.session?.user;
    if (!u) return;
    setUid(u.id);

    const { data: meds } = await supabase
      .from("medications")
      .select("*")
      .eq("user_id", u.id)
      .order("created_at", { ascending: true });
    setMedications((meds as Medication[]) ?? []);

    const { data: logs } = await supabase
      .from("medication_logs")
      .select("*")
      .eq("user_id", u.id)
      .gte("scheduled_at", startOfToday().toISOString())
      .lte("scheduled_at", endOfToday().toISOString())
      .order("scheduled_at", { ascending: true });
    setTodayLogs((logs as MedicationLog[]) ?? []);
  }, []);

  // create missing logs for today
  const ensureTodayLogs = useCallback(async () => {
    if (!uid) return;
    const existing = new Set(todayLogs.map(l => `${l.medication_id}|${new Date(l.scheduled_at).toISOString()}`));
    const rows: Partial<MedicationLog>[] = [];

    medications.filter(m => m.active).forEach(m => {
      (m.times || []).forEach(t => {
        const iso = isoFromHHMM(t);
        const key = `${m.id}|${new Date(iso).toISOString()}`;
        if (!existing.has(key)) {
          rows.push({ user_id: uid, medication_id: m.id, scheduled_at: iso, status: "pending" });
        }
      });
    });

    if (rows.length) {
      await supabase.from("medication_logs").insert(rows);
      const { data: logs } = await supabase
        .from("medication_logs").select("*")
        .eq("user_id", uid)
        .gte("scheduled_at", startOfToday().toISOString())
        .lte("scheduled_at", endOfToday().toISOString())
        .order("scheduled_at", { ascending: true });
      setTodayLogs((logs as MedicationLog[]) ?? []);
    }
  }, [uid, medications, todayLogs]);

  // init + realtime
  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { if (uid) ensureTodayLogs(); }, [uid, medications, ensureTodayLogs]);

  useEffect(() => {
    if (!uid) return;
    const ch = supabase
      .channel(`meds:${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "medications", filter: `user_id=eq.${uid}` }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "medication_logs", filter: `user_id=eq.${uid}` }, async () => {
        const { data: logs } = await supabase
          .from("medication_logs").select("*")
          .eq("user_id", uid)
          .gte("scheduled_at", startOfToday().toISOString())
          .lte("scheduled_at", endOfToday().toISOString())
          .order("scheduled_at", { ascending: true });
        setTodayLogs((logs as MedicationLog[]) ?? []);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uid, loadAll]);

  // CRUD
  async function addMedication() {
    if (!uid || !newMedication.name || !newMedication.dosage) return;
    const row = {
      user_id: uid,
      name: newMedication.name,
      dosage: newMedication.dosage,
      frequency: (newMedication.frequency as Frequency) ?? "daily",
      times: newMedication.times ?? ["08:00"],
      start_date: new Date().toISOString().slice(0,10),
      instructions: newMedication.instructions ?? "",
      active: true,
    };
    const { error } = await supabase.from("medications").insert(row);
    if (error) { alert(error.message); return; } // why: surface RLS/constraint errors
    setShowAddForm(false);
    setNewMedication({ name: "", dosage: "", frequency: "daily", times: ["08:00"], instructions: "", active: true });
    await loadAll();
    await ensureTodayLogs();
  }

  async function toggleMedication(id: string, next: boolean) {
    if (!uid) return;
    await supabase.from("medications").update({ active: next }).eq("id", id).eq("user_id", uid);
    await loadAll();
    await ensureTodayLogs();
  }

  async function markAsTaken(logId: string) {
    if (!uid) return;
    const nowIso = new Date().toISOString();
    await supabase.from("medication_logs").update({ status: "taken", taken_at: nowIso }).eq("id", logId).eq("user_id", uid);
  }
  async function markAsSkipped(logId: string) {
    if (!uid) return;
    await supabase.from("medication_logs").update({ status: "skipped" }).eq("id", logId).eq("user_id", uid);
  }

  const getMed = (id: string) => medications.find(m => m.id === id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Pill className="h-6 w-6 text-cyan-600" />
          <h2 className="text-2xl font-bold text-gray-900">Medication Reminders</h2>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="bg-cyan-600 hover:bg-cyan-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Medication
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todayLogs.map((log) => {
                const med = getMed(log.medication_id);
                return (
                  <div key={log.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{med?.name ?? "Medication"}</div>
                      <div className="text-sm text-gray-600">
                        {(med?.dosage ?? "")} at {new Date(log.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      {log.taken_at && (
                        <div className="text-xs text-green-600 mt-1">
                          Taken at {new Date(log.taken_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          log.status === "taken" ? "default" :
                          log.status === "pending" ? "secondary" :
                          log.status === "missed" ? "destructive" : "outline"
                        }
                      >
                        {log.status}
                      </Badge>
                      {log.status === "pending" && (
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => markAsTaken(log.id)} className="h-8 px-2">
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => markAsSkipped(log.id)} className="h-8 px-2">
                            Skip
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {todayLogs.length === 0 && <div className="text-sm text-gray-500">No doses scheduled for today.</div>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Medications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {medications.map((m) => (
                <div key={m.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium">{m.name}</h4>
                      <p className="text-sm text-gray-600">{m.dosage}</p>
                    </div>
                    <Switch checked={m.active} onCheckedChange={(v) => toggleMedication(m.id, v)} />
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Frequency: {m.frequency.replaceAll("-", " ")}</div>
                    <div>Times: {(m.times || []).join(", ")}</div>
                    {m.instructions && <div>Instructions: {m.instructions}</div>}
                  </div>
                  <Badge variant={m.active ? "default" : "secondary"} className="mt-2">
                    {m.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))}
              {medications.length === 0 && <div className="text-sm text-gray-500">No medications added yet.</div>}
            </div>
          </CardContent>
        </Card>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader><CardTitle>Add New Medication</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-2 block">Medication Name</label>
                <Input value={newMedication.name || ""} onChange={(e) => setNewMedication(p => ({ ...p, name: e.target.value }))} placeholder="Enter medication name" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Dosage</label>
                <Input value={newMedication.dosage || ""} onChange={(e) => setNewMedication(p => ({ ...p, dosage: e.target.value }))} placeholder="e.g., 40mg, 1 tablet" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Frequency</label>
                <Select value={newMedication.frequency as Frequency} onValueChange={(v) => setNewMedication(p => ({ ...p, frequency: v as Frequency }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="twice-daily">Twice Daily</SelectItem>
                    <SelectItem value="three-times-daily">Three Times Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Time</label>
                <Input type="time" value={newMedication.times?.[0] || "08:00"} onChange={(e) => setNewMedication(p => ({ ...p, times: [e.target.value] }))} />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-2 block">Instructions</label>
                <Input value={newMedication.instructions || ""} onChange={(e) => setNewMedication(p => ({ ...p, instructions: e.target.value }))} placeholder="Special instructions (optional)" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={addMedication} className="bg-cyan-600 hover:bg-cyan-700">Add Medication</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
