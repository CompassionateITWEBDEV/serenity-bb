// ./components/dashboard/submission-history.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Pill, Activity, Heart, Brain, Plus, CheckCircle, AlertCircle, Play, Trash2, Save } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type EntryType = "medication" | "activity" | "mood" | "symptom" | "vitals" | "video";
type EntryStatus = "completed" | "missed" | "partial";

type SubmissionRow = {
  id: string;
  user_id: string;
  type: EntryType;
  title: string;
  description: string | null;
  status: EntryStatus;
  value: string | null;
  notes: string | null;
  occurred_at: string;   // ISO
  created_at: string;
  updated_at: string;
};

type VideoRow = {
  id: string;
  patient_id: string | null;
  title: string;
  description: string | null;
  type: "daily-checkin" | "medication" | "therapy-session" | "progress-update";
  status: "uploading" | "processing" | "completed" | "failed";
  video_url: string | null;
  size_mb: number | null;
  duration_seconds: number | null;
  submitted_at: string;
};

type SubmissionEntry = {
  id: string;
  type: EntryType;
  title: string;
  description: string;
  timestamp: string;
  status: EntryStatus;
  value?: string;
  notes?: string;
  videoUrl?: string | null;
  videoStatus?: "uploading" | "processing" | "completed" | "failed";
  _source?: "db" | "video";
};

export function SubmissionHistory() {
  const [uid, setUid] = useState<string | null>(null);
  const [entries, setEntries] = useState<SubmissionEntry[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState<{ type: EntryType; title: string; description: string; value: string; notes: string }>({
    type: "medication",
    title: "",
    description: "",
    value: "",
    notes: "",
  });

  // session + initial load
  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user;
      if (!user) return;
      setUid(user.id);

      await Promise.all([loadSubmissions(user.id), loadVideos(user.id)]);
    })();
  }, []);

  // realtime
  useEffect(() => {
    if (!uid) return;
    const ch = supabase
      .channel(`submissions:${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "submissions", filter: `user_id=eq.${uid}` }, async () => {
        await loadSubmissions(uid);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "video_submissions", filter: `patient_id=eq.${uid}` }, async () => {
        await loadVideos(uid);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uid]);

  async function loadSubmissions(userId: string) {
    const { data, error } = await supabase
      .from<SubmissionRow>("submissions")
      .select("*")
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false });
    if (error) { console.warn("submissions load error", error.message); return; }
    const mapped: SubmissionEntry[] = (data ?? []).map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      description: r.description ?? "",
      timestamp: r.occurred_at,
      status: r.status,
      value: r.value ?? undefined,
      notes: r.notes ?? undefined,
      _source: "db",
    }));
    setEntries((prev) => mergeEntriesWith(prev, mapped, (e) => e._source !== "db"));
  }

  async function loadVideos(userId: string) {
    const { data, error } = await supabase
      .from<VideoRow>("video_submissions")
      .select("id, patient_id, title, description, type, status, video_url, size_mb, duration_seconds, submitted_at")
      .eq("patient_id", userId)
      .order("submitted_at", { ascending: false });
    if (error) { console.warn("video_submissions load error", error.message); return; }

    const vids: SubmissionEntry[] = (data ?? []).map((r) => ({
      id: `video-${r.id}`,
      type: "video",
      title: r.title || "Video submission",
      description: r.description || r.type.replace("-", " "),
      timestamp: r.submitted_at,
      status: r.status === "failed" ? "partial" : r.status === "completed" ? "completed" : "partial",
      value:
        (r.duration_seconds != null ? `${r.duration_seconds}s` : "") +
        (r.size_mb != null ? (r.duration_seconds != null ? " • " : "") + `${r.size_mb} MB` : ""),
      notes: r.status === "processing" ? "Processing…" : undefined,
      videoUrl: r.video_url,
      videoStatus: r.status,
      _source: "video",
    }));

    setEntries((prev) => mergeEntriesWith(prev, vids, (e) => e._source !== "video"));
  }

  function mergeEntriesWith(current: SubmissionEntry[], incoming: SubmissionEntry[], keepPredicate: (e: SubmissionEntry) => boolean) {
    const kept = current.filter(keepPredicate);
    const merged = [...kept, ...incoming];
    return merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // CRUD
  async function addEntry() {
    if (!uid || !newEntry.title || !newEntry.description) return;
    const { error } = await supabase.from("submissions").insert({
      user_id: uid,
      type: newEntry.type,
      title: newEntry.title,
      description: newEntry.description || null,
      status: "completed",
      value: newEntry.value || null,
      notes: newEntry.notes || null,
      occurred_at: new Date().toISOString(),
    });
    if (error) { alert(error.message); return; }
    setNewEntry({ type: "medication", title: "", description: "", value: "", notes: "" });
    setShowAddForm(false);
  }

  async function updateEntry(id: string, patch: Partial<SubmissionRow>) {
    if (!uid) return;
    const { error } = await supabase.from("submissions").update({ ...patch }).eq("id", id).eq("user_id", uid);
    if (error) alert(error.message);
  }

  async function deleteEntry(id: string) {
    if (!uid) return;
    const { error } = await supabase.from("submissions").delete().eq("id", id).eq("user_id", uid);
    if (error) alert(error.message);
  }

  // UI helpers
  const getTypeIcon = (type: EntryType) =>
    type === "medication" ? <Pill className="h-4 w-4" /> :
    type === "activity" ? <Activity className="h-4 w-4" /> :
    type === "mood" ? <Brain className="h-4 w-4" /> :
    type === "symptom" ? <AlertCircle className="h-4 w-4" /> :
    type === "vitals" ? <Heart className="h-4 w-4" /> :
    <Play className="h-4 w-4" />;

  const typeColor = (type: EntryType) =>
    type === "medication" ? "bg-blue-100 text-blue-800" :
    type === "activity" ? "bg-green-100 text-green-800" :
    type === "mood" ? "bg-purple-100 text-purple-800" :
    type === "symptom" ? "bg-red-100 text-red-800" :
    type === "vitals" ? "bg-orange-100 text-orange-800" :
    "bg-cyan-100 text-cyan-800";

  const statusBadge = (s: EntryStatus) =>
    s === "completed" ? "bg-green-100 text-green-800" :
    s === "missed" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800";

  const groupedEntries = useMemo(() => {
    return entries.reduce((acc, e) => {
      const date = new Date(e.timestamp).toLocaleDateString();
      (acc[date] ||= []).push(e);
      return acc;
    }, {} as Record<string, SubmissionEntry[]>);
  }, [entries]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Submission History</CardTitle>
              <CardDescription>Track medication, activities, mood, health metrics, and videos</CardDescription>
            </div>
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </div>
        </CardHeader>
        {showAddForm && (
          <CardContent className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Type</label>
                <Select value={newEntry.type} onValueChange={(v: EntryType) => setNewEntry({ ...newEntry, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medication">Medication</SelectItem>
                    <SelectItem value="activity">Activity</SelectItem>
                    <SelectItem value="mood">Mood</SelectItem>
                    <SelectItem value="symptom">Symptom</SelectItem>
                    <SelectItem value="vitals">Vitals</SelectItem>
                    <SelectItem value="video" disabled>Video (readonly)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Title</label>
                <Input value={newEntry.title} onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })} placeholder="e.g., Methadone 40mg" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Input value={newEntry.description} onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })} placeholder="e.g., Morning dose" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Value (optional)</label>
              <Input value={newEntry.value} onChange={(e) => setNewEntry({ ...newEntry, value: e.target.value })} placeholder="e.g., 7/10, 120/80 mmHg" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Notes</label>
              <Textarea value={newEntry.notes} onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })} placeholder="Additional notes or observations" rows={3} />
            </div>
            <div className="flex gap-2">
              <Button onClick={addEntry}>Save</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="space-y-6">
        {Object.entries(groupedEntries)
          .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
          .map(([date, dayEntries]) => (
            <Card key={date}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {date}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dayEntries
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((e) => {
                      const time = new Date(e.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                      const isVideo = e.type === "video";
                      const isDb = e._source === "db";
                      return (
                        <div key={e.id} className="flex items-start gap-4 p-4 border rounded-lg">
                          <div className="flex-shrink-0 mt-1">{getTypeIcon(e.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{e.title}</h4>
                              <Badge className={typeColor(e.type)}>{e.type}</Badge>
                              <Badge className={statusBadge(e.status)} variant="outline">{e.status}</Badge>
                              {isVideo && e.videoStatus && <Badge variant="outline" className="capitalize">{e.videoStatus}</Badge>}
                            </div>

                            <p className="text-sm text-gray-600 mb-2">{e.description}</p>

                            {isVideo && (e.value || e.videoUrl) && (
                              <div className="text-xs text-gray-600 mb-2">{e.value ? <span>{e.value}</span> : null}</div>
                            )}

                            {!isVideo && e.value && <p className="text-sm font-medium text-blue-600 mb-2">Value: {e.value}</p>}
                            {e.notes && <p className="text-sm text-gray-500 italic">{e.notes}</p>}

                            {isVideo && e.videoUrl && (
                              <div className="mt-2">
                                <a href={e.videoUrl} target="_blank" rel="noreferrer">
                                  <Button size="sm" variant="outline">
                                    <Play className="h-3 w-3 mr-1" />
                                    Open video
                                  </Button>
                                </a>
                              </div>
                            )}

                            {isDb && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Button size="sm" variant="outline" onClick={() => updateEntry(e.id, { status: "completed" })}>Mark Completed</Button>
                                <Button size="sm" variant="outline" onClick={() => updateEntry(e.id, { status: "missed" })}>Mark Missed</Button>
                                <Button size="sm" variant="outline" onClick={() => updateEntry(e.id, { status: "partial" })}>Mark Partial</Button>
                                <Button size="sm" variant="destructive" onClick={() => deleteEntry(e.id)}>
                                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                                </Button>
                              </div>
                            )}
                          </div>

                          <div className="flex-shrink-0 text-sm text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {time}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
