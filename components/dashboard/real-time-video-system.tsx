// /components/dashboard/real-time-video-system.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import SignInCard from "@/components/auth/sign-in-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Video as VideoIcon, Upload, Clock, CheckCircle, AlertCircle, Play, Eye, Trash2, LogOut, Edit2, PlusCircle } from "lucide-react";

type VideoStatus = "uploading" | "processing" | "completed" | "failed";
type VideoType = "daily-checkin" | "medication" | "therapy-session" | "progress-update";

interface Row {
  id: string;
  patient_id: string;
  title: string;
  description: string | null;
  type: VideoType;
  status: VideoStatus;
  storage_path: string | null;
  video_url: string | null;
  size_mb: number | null;
  duration_seconds: number | null;
  submitted_at: string;
  processed_at: string | null;
}

const BUCKET = "videos";

export default function RealTimeVideoSystem() {
  const [uid, setUid] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState<{ title: string; description: string; type: VideoType }>({
    title: "", description: "", type: "daily-checkin",
  });

  const [isRecording, setIsRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [prog, setProg] = useState<Record<string, number>>({});

  const videoRef = useRef<HTMLVideoElement>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const lastBlobRef = useRef<Blob | null>(null);
  const timerRef = useRef<any>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editType, setEditType] = useState<VideoType>("daily-checkin");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Session
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUid(data.user?.id ?? null);
      setErr(data.user ? null : "Auth session missing. Sign in to upload.");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUid(session?.user?.id ?? null);
      setErr(session?.user ? null : "Auth session missing. Sign in to upload.");
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  // Load + subscribe
  useEffect(() => {
    if (!uid) return;
    const load = async () => {
      const { data, error } = await supabase
        .from("video_submissions")
        .select("*")
        .eq("patient_id", uid)
        .order("submitted_at", { ascending: false });
      if (error) setErr(error.message);
      else setRows(data as Row[]);
    };
    load();
    channelRef.current?.unsubscribe();
    const ch = supabase
      .channel(`video_subs_${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "video_submissions", filter: `patient_id=eq.${uid}` }, load)
      .subscribe();
    channelRef.current = ch;
    return () => ch.unsubscribe();
  }, [uid]);

  // Recording timer
  useEffect(() => {
    if (isRecording) timerRef.current = setInterval(() => setRecSecs((s) => s + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  // ---- Recording flow ----
  async function startRecording() {
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      const mr = new MediaRecorder(stream);
      mrRef.current = mr; chunksRef.current = []; lastBlobRef.current = null;
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start();
      setRecSecs(0); setIsRecording(true);
    } catch (e: any) {
      setErr(e?.message ?? "Camera/mic access failed");
    }
  }
  function stopRecording() {
    if (!mrRef.current || !isRecording) return;
    mrRef.current.stop(); setIsRecording(false);
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop()); if (videoRef.current) videoRef.current.srcObject = null;
    if (chunksRef.current.length > 0) lastBlobRef.current = new Blob(chunksRef.current, { type: "video/webm" });
  }

  async function submitRecorded() {
    if (!uid) return setErr("Please sign in first.");
    if (!lastBlobRef.current) return setErr("No recording. Click Stop first.");
    await createOrReplaceVideo({ fileBlob: lastBlobRef.current, filenameHint: "recording.webm", meta: form });
    lastBlobRef.current = null; chunksRef.current = []; setForm({ title: "", description: "", type: "daily-checkin" }); setRecSecs(0);
  }

  // ---- Upload file flow ----
  function openUploadPicker() {
    uploadInputRef.current?.click();
  }
  async function onUploadFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await createOrReplaceVideo({
      fileBlob: file,
      filenameHint: file.name,
      meta: { title: file.name.replace(/\.[^/.]+$/, ""), description: "", type: "daily-checkin" },
    });
    e.currentTarget.value = "";
  }

  // ---- Core create/replace operation (Storage + DB) ----
  async function createOrReplaceVideo(args: {
    fileBlob: Blob;
    filenameHint: string;
    meta: { title: string; description?: string | null; type: VideoType };
    rowToReplaceId?: string; // optional replace
  }) {
    const { fileBlob, filenameHint, meta, rowToReplaceId } = args;
    if (!uid) return setErr("No session");

    const duration = await getBlobDuration(fileBlob).catch(() => Math.round(recSecs));
    const sizeMb = +(fileBlob.size / (1024 * 1024)).toFixed(2);
    const ext = filenameHint.includes(".") ? filenameHint.split(".").pop()! : "webm";

    let row: Row | null = null;

    // Create or update initial row to show progress
    if (!rowToReplaceId) {
      const { data, error } = await supabase
        .from("video_submissions")
        .insert({
          patient_id: uid,
          title: meta.title?.trim() || "Untitled Recording",
          description: meta.description ?? null,
          type: meta.type,
          status: "uploading",
          size_mb: sizeMb,
          duration_seconds: duration,
          submitted_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error) return setErr(error.message);
      row = data as Row;
    } else {
      const { data, error } = await supabase
        .from("video_submissions")
        .update({
          title: meta.title?.trim() || "Untitled Recording",
          description: meta.description ?? null,
          type: meta.type,
          status: "uploading",
          size_mb: sizeMb,
          duration_seconds: duration,
        })
        .eq("id", rowToReplaceId)
        .select("*")
        .single();
      if (error) return setErr(error.message);
      row = data as Row;

      // Why: keep bucket clean when replacing file
      if (row.storage_path) await supabase.storage.from(BUCKET).remove([row.storage_path]).catch(() => {});
    }

    smoothProgress(row.id, 10, 85);

    const path = `${uid}/${row.id}.${ext}`;
    try {
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, fileBlob, {
        contentType: fileBlob.type || "video/webm",
        upsert: true, // allow replace path for edit
      });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

      const { error: updErr } = await supabase
        .from("video_submissions")
        .update({ storage_path: path, video_url: pub?.publicUrl ?? null, status: "processing" })
        .eq("id", row.id);
      if (updErr) throw updErr;

      // TEMP complete
      setTimeout(async () => {
        await supabase.from("video_submissions").update({ status: "completed", processed_at: new Date().toISOString() }).eq("id", row!.id);
        setProg((m) => ({ ...m, [row!.id]: 100 }));
      }, 1200);
    } catch (e: any) {
      await supabase.from("video_submissions").update({ status: "failed" }).eq("id", row.id);
      setErr(e?.message ?? "Upload failed");
    }
  }

  async function handleDelete(id: string) {
    const row = rows.find((r) => r.id === id);
    if (row?.storage_path) await supabase.storage.from(BUCKET).remove([row.storage_path]).catch(() => {});
    await supabase.from("video_submissions").delete().eq("id", id);
  }

  async function signOut() { await supabase.auth.signOut(); }

  function smoothProgress(id: string, from: number, to: number) {
    let v = from; setProg((m) => ({ ...m, [id]: v }));
    const h = setInterval(() => { v += 5; if (v >= to) { v = to; clearInterval(h); } setProg((m) => ({ ...m, [id]: v })); }, 180);
  }

  const grouped = useMemo(() => {
    const g = rows.reduce<Record<string, Row[]>>((acc, r) => {
      const key = new Date(r.submitted_at).toLocaleDateString();
      (acc[key] ||= []).push(r); return acc;
    }, {});
    return Object.entries(g).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());
  }, [rows]);

  // ---- Edit dialog helpers ----
  function openEdit(row: Row) {
    setEditRow(row);
    setEditTitle(row.title);
    setEditDesc(row.description ?? "");
    setEditType(row.type);
    setEditFile(null);
    setEditOpen(true);
  }
  async function saveEdit() {
    if (!editRow) return;
    setSavingEdit(true);
    try {
      if (editFile) {
        // Replace file + update meta
        await createOrReplaceVideo({
          fileBlob: editFile,
          filenameHint: editFile.name,
          meta: { title: editTitle, description: editDesc, type: editType },
          rowToReplaceId: editRow.id,
        });
      } else {
        // Just metadata update
        const { error } = await supabase
          .from("video_submissions")
          .update({ title: editTitle.trim() || "Untitled Recording", description: editDesc || null, type: editType })
          .eq("id", editRow.id);
        if (error) throw error;
      }
      setEditOpen(false);
    } catch (e: any) {
      setErr(e?.message ?? "Update failed");
    } finally {
      setSavingEdit(false);
    }
  }

  if (!uid) {
    return (
      <div className="space-y-4">
        <SignInCard />
        {err && <div className="text-sm text-red-600 text-center">{err}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Session + quick actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Signed in as <code className="bg-gray-100 px-1 rounded">{uid}</code>
        </div>
        <div className="flex items-center gap-2">
          <input ref={uploadInputRef} type="file" accept="video/*" className="hidden" onChange={onUploadFileChange} />
          <Button variant="outline" size="sm" onClick={openUploadPicker}>
            <PlusCircle className="w-4 h-4 mr-1" /> Upload File
          </Button>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-1" /> Sign out
          </Button>
        </div>
      </div>

      {/* Recorder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <VideoIcon className="h-5 w-5 text-red-600" /> Real-time Video Submission
          </CardTitle>
          <CardDescription>Stored in Supabase (Storage + DB)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {err && <div className="text-sm text-red-600">{err}</div>}
          <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
            <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
            {!isRecording && !lastBlobRef.current && (
              <div className="absolute inset-0 grid place-items-center text-white/80">
                <div className="text-center">
                  <VideoIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Click start to begin recording</p>
                </div>
              </div>
            )}
            {isRecording && (
              <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                REC {formatClock(recSecs)}
              </div>
            )}
          </div>

          <div className="flex justify-center gap-4">
            {!isRecording ? (
              <Button onClick={startRecording} className="bg-red-600 hover:bg-red-700">
                <VideoIcon className="h-4 w-4 mr-2" /> Start Recording
              </Button>
            ) : (
              <Button onClick={stopRecording} variant="outline">
                <VideoIcon className="h-4 w-4 mr-2" /> Stop Recording
              </Button>
            )}
          </div>

          {lastBlobRef.current && !isRecording && (
            <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium">Submit Your Recording</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Title</Label>
                  <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Enter video title" />
                </div>
                <div>
                  <Label className="text-sm">Type</Label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as VideoType }))}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="daily-checkin">Daily Check-in</option>
                    <option value="medication">Medication</option>
                    <option value="therapy-session">Therapy Session</option>
                    <option value="progress-update">Progress Update</option>
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-sm">Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
              </div>
              <Button onClick={submitRecorded} className="w-full">
                <Upload className="h-4 w-4 mr-2" /> Submit Video
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" /> Submission Status
          </CardTitle>
          <CardDescription>Live from Supabase</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No video submissions yet.</p>
            ) : (
              grouped.map(([date, items]) => (
                <div key={date} className="space-y-3">
                  <div className="text-xs font-medium text-muted-foreground">{date}</div>
                  {items.map((s) => {
                    const p = s.status === "completed" ? 100 : s.status === "failed" ? 0 : prog[s.id] ?? (s.status === "processing" ? 90 : 10);
                    return (
                      <div key={s.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{s.title}</h4>
                              {s.status === "completed" ? <CheckCircle className="h-4 w-4 text-green-500" /> :
                               s.status === "failed" ? <AlertCircle className="h-4 w-4 text-red-500" /> :
                               <Clock className="h-4 w-4 text-yellow-500 animate-spin" />}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{s.description}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>{formatClock(s.duration_seconds ?? 0)}</span>
                              <span>{s.size_mb ? `${s.size_mb} MB` : "-"}</span>
                              <span>{new Date(s.submitted_at).toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={typeBadge(s.type)}>{s.type.replace("-", " ")}</Badge>
                            <Badge className={statusBadge(s.status)}>{s.status}</Badge>
                          </div>
                        </div>

                        {(s.status === "uploading" || s.status === "processing") && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="capitalize">{s.status}...</span>
                              <span>{p}%</span>
                            </div>
                            <Progress value={p} className="h-2" />
                          </div>
                        )}

                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                            <Edit2 className="h-3 w-3 mr-1" /> Edit
                          </Button>
                          {s.status === "completed" && s.video_url && (
                            <>
                              <a href={s.video_url} target="_blank" rel="noreferrer">
                                <Button size="sm" variant="outline"><Play className="h-3 w-3 mr-1" /> Play</Button>
                              </a>
                              <a href={s.video_url} target="_blank" rel="noreferrer">
                                <Button size="sm" variant="outline"><Eye className="h-3 w-3 mr-1" /> View</Button>
                              </a>
                            </>
                          )}
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 bg-transparent" onClick={() => handleDelete(s.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Title</Label>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </div>
              <div>
                <Label className="text-sm">Type</Label>
                <select value={editType} onChange={(e) => setEditType(e.target.value as VideoType)} className="w-full p-2 border rounded-md">
                  <option value="daily-checkin">Daily Check-in</option>
                  <option value="medication">Medication</option>
                  <option value="therapy-session">Therapy Session</option>
                  <option value="progress-update">Progress Update</option>
                </select>
              </div>
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Textarea rows={3} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
            </div>
            <div>
              <Label className="text-sm block mb-1">Replace video file (optional)</Label>
              <Input type="file" accept="video/*" onChange={(e) => setEditFile(e.target.files?.[0] ?? null)} />
              <p className="text-xs text-muted-foreground mt-1">Choosing a file will replace the stored video.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={savingEdit}>
              {savingEdit ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* helpers (only the 'why' matters: consistent formatting & UX) */
function statusBadge(s: VideoStatus) {
  return s === "completed" ? "bg-green-100 text-green-800"
    : s === "failed" ? "bg-red-100 text-red-800"
    : s === "processing" ? "bg-yellow-100 text-yellow-800"
    : "bg-blue-100 text-blue-800";
}
function typeBadge(t: VideoType) {
  switch (t) {
    case "daily-checkin": return "bg-blue-100 text-blue-800";
    case "medication": return "bg-green-100 text-green-800";
    case "therapy-session": return "bg-purple-100 text-purple-800";
    case "progress-update": return "bg-orange-100 text-orange-800";
  }
}
function formatClock(sec: number) {
  const m = Math.floor(sec / 60); const s = Math.max(0, sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
function getBlobDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      const d = isFinite(v.duration) ? v.duration : 0;
      URL.revokeObjectURL(v.src);
      resolve(Math.round(d));
    };
    v.onerror = () => reject(new Error("Unable to read duration"));
    v.src = URL.createObjectURL(blob);
  });
}
