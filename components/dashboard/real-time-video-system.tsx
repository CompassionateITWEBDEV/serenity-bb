// ./components/dashboard/real-time-video-system.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Video as VideoIcon,
  Upload,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Eye,
  Trash2,
  PlusCircle,
  Edit2,
  Info,
  X,
} from "lucide-react";

type VideoStatus = "uploading" | "processing" | "completed" | "failed";
type VideoType = "daily-checkin" | "medication" | "therapy-session" | "progress-update";

interface Row {
  id: string;
  patient_id: string | null;
  visitor_id: string | null;
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

/* ---------------------- local toast (no external deps) ---------------------- */
type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "destructive";
  timeout?: number;
};
function useLocalToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  function pushToast(t: Omit<ToastItem, "id">) {
    const item: ToastItem = { id: crypto.randomUUID(), timeout: 3500, variant: "default", ...t };
    setToasts((prev) => [...prev, item]);
    window.setTimeout(() => dismiss(item.id), item.timeout);
  }
  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }
  return { toasts, pushToast, dismiss };
}
function ToastHost({ items, onClose }: { items: ToastItem[]; onClose: (id: string) => void }) {
  return (
    <div className="pointer-events-none fixed top-3 right-3 z-[60] flex flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto w-80 rounded-lg border p-3 shadow-lg bg-white ${
            t.variant === "destructive" ? "border-red-300" : "border-gray-200"
          }`}
        >
          <div className="flex items-start gap-2">
            <div
              className={`mt-0.5 h-2 w-2 rounded-full ${
                t.variant === "destructive" ? "bg-red-500" : "bg-green-500"
              }`}
            />
            <div className="flex-1">
              <div className="text-sm font-medium">{t.title}</div>
              {t.description && <div className="text-xs text-muted-foreground">{t.description}</div>}
            </div>
            <button aria-label="Close" onClick={() => onClose(t.id)} className="opacity-60 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
/* --------------------------------------------------------------------------- */

export default function RealTimeVideoSystem() {
  const { toasts, pushToast, dismiss } = useLocalToast(); // local toast
  const [inlineNotice, setInlineNotice] = useState<{
    kind: "success" | "error" | null;
    title?: string;
    desc?: string;
    anchorId?: string | null;
  }>({ kind: null, title: "", desc: "", anchorId: null });

  // ------- identity (guest, no sign-in) -------
  const guestId = getGuestId();
  const ownerCol = "visitor_id";
  const ownerVal = guestId;

  // ------- list + realtime -------
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [lastSubmittedId, setLastSubmittedId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("video_submissions")
        .select("*")
        .eq(ownerCol, ownerVal)
        .order("submitted_at", { ascending: false });
      if (error) setErr(error.message);
      else setRows(data as Row[]);
    };
    load();
    const ch = supabase
      .channel(`video_subs_${ownerVal}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "video_submissions", filter: `${ownerCol}=eq.${ownerVal}` },
        load,
      )
      .subscribe();
    return () => ch.unsubscribe();
  }, [ownerVal]);

  // auto-scroll + highlight to last submitted
  useEffect(() => {
    if (!lastSubmittedId) return;
    const el = document.getElementById(`row-${lastSubmittedId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightId(lastSubmittedId);
      const t = window.setTimeout(() => setHighlightId(null), 2500);
      return () => window.clearTimeout(t);
    }
  }, [lastSubmittedId, rows.length]);

  // ------- recording -------
  const [isRecording, setIsRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const timerRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // recorded preview
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedPreviewUrl, setRecordedPreviewUrl] = useState<string | null>(null);

  // manual file preview
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);

  // cleanup URLs
  useEffect(() => {
    return () => {
      if (recordedPreviewUrl) URL.revokeObjectURL(recordedPreviewUrl);
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isRecording) {
      const h = window.setInterval(() => setRecSecs((s) => s + 1), 1000);
      timerRef.current = h;
    }
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [isRecording]);

  async function startRecording() {
    setErr(null);
    setInlineNotice({ kind: null, title: "", desc: "", anchorId: null });
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    if (videoRef.current) videoRef.current.srcObject = stream;

    const mr = new MediaRecorder(stream);
    mrRef.current = mr;
    chunksRef.current = [];
    setRecordedBlob(null);
    if (recordedPreviewUrl) {
      URL.revokeObjectURL(recordedPreviewUrl);
      setRecordedPreviewUrl(null);
    }

    mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
    mr.start();
    setRecSecs(0);
    setIsRecording(true);
  }

  function stopRecording() {
    if (!mrRef.current || !isRecording) return;
    mrRef.current.stop();
    setIsRecording(false);

    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;

    if (chunksRef.current.length > 0) {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setRecordedBlob(blob);
      const url = URL.createObjectURL(blob);
      setRecordedPreviewUrl(url); // immediate preview after recording
    }
  }

  function openUploadPicker() {
    uploadInputRef.current?.click();
  }
  function onUploadFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    const url = URL.createObjectURL(file);
    setPendingPreviewUrl(url);
    setForm((f) => ({ ...f, title: file.name.replace(/\.[^/.]+$/, "") }));
    e.currentTarget.value = "";
  }
  function clearPendingFile() {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingPreviewUrl(null);
    setPendingFile(null);
  }

  // ------- meta form -------
  const [form, setForm] = useState<{ title: string; description: string; type: VideoType }>({
    title: "",
    description: "",
    type: "daily-checkin",
  });

  // ------- progress -------
  const [prog, setProg] = useState<Record<string, number>>({});
  function smoothProgress(id: string, from: number, to: number) {
    let v = from;
    setProg((m) => ({ ...m, [id]: v }));
    const h = window.setInterval(() => {
      v += 5;
      if (v >= to) {
        v = to;
        window.clearInterval(h);
      }
      setProg((m) => ({ ...m, [id]: v }));
    }, 150);
  }

  // ------- core create/replace -------
  async function createOrReplaceVideo(args: {
    fileBlob: Blob;
    filenameHint: string;
    meta: { title: string; description?: string | null; type: VideoType };
    rowToReplaceId?: string;
  }) {
    const { fileBlob, filenameHint, meta, rowToReplaceId } = args;
    const duration = await getBlobDuration(fileBlob).catch(() => 0);
    const sizeMb = +(fileBlob.size / (1024 * 1024)).toFixed(2);
    const ext = filenameHint.includes(".") ? filenameHint.split(".").pop()! : "webm";

    let row: Row;
    if (!rowToReplaceId) {
      const { data, error } = await supabase
        .from("video_submissions")
        .insert({
          patient_id: null,
          visitor_id: ownerVal,
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
      if (error) throw error;
      row = data as Row;
    } else {
      const { data, error } = await supabase
        .from("video_submissions")
        .update({
          title: meta.title?.trim() || "Untitled Recording",
          description: meta.description ?? null,
          type: meta.type,
          status: "uploading",
        })
        .eq("id", rowToReplaceId)
        .select("*")
        .single();
      if (error) throw error;
      row = data as Row;

      if (row.storage_path) await supabase.storage.from(BUCKET).remove([row.storage_path]).catch(() => {});
    }

    setLastSubmittedId(row.id); // for scroll/highlight
    smoothProgress(row.id, 10, 85);

    const path = `${ownerVal}/${row.id}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, fileBlob, {
      contentType: fileBlob.type || "video/webm",
      upsert: true,
    });
    if (upErr) throw upErr;

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    await supabase
      .from("video_submissions")
      .update({ storage_path: path, video_url: pub?.publicUrl ?? null, status: "processing" })
      .eq("id", row.id);

    // mock processing → completed
    setTimeout(async () => {
      await supabase
        .from("video_submissions")
        .update({ status: "completed", processed_at: new Date().toISOString() })
        .eq("id", row.id);
      setProg((m) => ({ ...m, [row.id]: 100 }));
    }, 1000);

    // Smart alerts (local toast + inline)
    pushToast({
      title: "Video submitted",
      description: `${meta.title || "Untitled"} • ${formatClock(duration)} • ${sizeMb} MB`,
    });
    setInlineNotice({
      kind: "success",
      title: "Submission received",
      desc: "We’re processing your video. It will appear below. Click to jump to it.",
      anchorId: row.id,
    });

    return { id: row.id, duration, sizeMb };
  }

  // ------- submit flows -------
  async function submitRecorded() {
    if (!recordedBlob) return setErr("No recording. Click Stop first.");
    try {
      const { id } = await createOrReplaceVideo({
        fileBlob: recordedBlob,
        filenameHint: "recording.webm",
        meta: form,
      });
      if (recordedPreviewUrl) URL.revokeObjectURL(recordedPreviewUrl);
      setRecordedPreviewUrl(null);
      setRecordedBlob(null);
      setForm({ title: "", description: "", type: "daily-checkin" });
      setRecSecs(0);
      setInlineNotice((n) => ({ ...n, anchorId: id }));
    } catch (e: any) {
      setErr(e?.message ?? "Upload failed");
      pushToast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
      setInlineNotice({ kind: "error", title: "Upload failed", desc: "Please try again.", anchorId: null });
    }
  }

  async function submitPendingFile() {
    if (!pendingFile) return;
    try {
      const { id } = await createOrReplaceVideo({
        fileBlob: pendingFile,
        filenameHint: pendingFile.name,
        meta: form,
      });
      clearPendingFile();
      setForm({ title: "", description: "", type: "daily-checkin" });
      setInlineNotice((n) => ({ ...n, anchorId: id }));
    } catch (e: any) {
      setErr(e?.message ?? "Upload failed");
      pushToast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
      setInlineNotice({ kind: "error", title: "Upload failed", desc: "Please try again.", anchorId: null });
    }
  }

  async function handleDelete(id: string) {
    const row = rows.find((r) => r.id === id);
    if (row?.storage_path) await supabase.storage.from(BUCKET).remove([row.storage_path]).catch(() => {});
    await supabase.from("video_submissions").delete().eq("id", id).eq(ownerCol, ownerVal);
  }

  const grouped = useMemo(() => {
    const g = rows.reduce<Record<string, Row[]>>((acc, r) => {
      const key = new Date(r.submitted_at).toLocaleDateString();
      (acc[key] ||= []).push(r);
      return acc;
    }, {});
    return Object.entries(g).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());
  }, [rows]);

  return (
    <div className="space-y-6">
      {/* Toasts */}
      <ToastHost items={toasts} onClose={dismiss} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Mode: guest · <code className="bg-gray-100 px-1 rounded">{ownerVal}</code>
        </div>
        <div className="flex items-center gap-2">
          <input ref={uploadInputRef} type="file" accept="video/*" className="hidden" onChange={onUploadFileChange} />
          <Button variant="outline" size="sm" onClick={openUploadPicker}>
            <PlusCircle className="w-4 h-4 mr-1" /> Upload File
          </Button>
        </div>
      </div>

      {/* Smart Inline Alert */}
      {inlineNotice.kind && (
        <Alert variant={inlineNotice.kind === "error" ? "destructive" : "default"} className="border">
          <Info className="h-4 w-4" />
          <AlertTitle>{inlineNotice.title}</AlertTitle>
          <AlertDescription>
            {inlineNotice.desc}{" "}
            {inlineNotice.anchorId && (
              <button className="underline underline-offset-2" onClick={() => setLastSubmittedId(inlineNotice.anchorId!)}>
                View in history
              </button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Recorder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <VideoIcon className="h-5 w-5 text-red-600" /> Real-time Video Submission
          </CardTitle>
          <CardDescription>Record, preview instantly, then upload</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {err && <div className="text-sm text-red-600">{err}</div>}

          <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
            <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
            {!isRecording && !recordedPreviewUrl && (
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

          {/* Recorded preview */}
          {recordedPreviewUrl && !isRecording && (
            <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium">Preview & Submit</h4>
              <video key={recordedPreviewUrl} controls src={recordedPreviewUrl} className="w-full rounded-md" />
              <Meta form={form} setForm={setForm} />
              <div className="flex gap-2">
                <Button className="flex-1" onClick={submitRecorded}>
                  <Upload className="h-4 w-4 mr-2" /> Upload Recording
                </Button>
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => {
                    if (recordedPreviewUrl) URL.revokeObjectURL(recordedPreviewUrl);
                    setRecordedPreviewUrl(null);
                    setRecordedBlob(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Picked file preview */}
          {pendingFile && pendingPreviewUrl && (
            <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium">File Preview & Submit</h4>
              <video key={pendingPreviewUrl} controls src={pendingPreviewUrl} className="w-full rounded-md" />
              <Meta form={form} setForm={setForm} />
              <div className="flex gap-2">
                <Button className="flex-1" onClick={submitPendingFile}>
                  <Upload className="h-4 w-4 mr-2" /> Upload File
                </Button>
                <Button className="flex-1" variant="outline" onClick={clearPendingFile}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History with inline players */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" /> Submission Status
          </CardTitle>
          <CardDescription>Uploaded videos are playable below</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No video submissions yet.</p>
            ) : (
              groupedByDate(rows).map(([date, items]) => (
                <div key={date} className="space-y-3">
                  <div className="text-xs font-medium text-muted-foreground">{date}</div>
                  {items.map((s) => {
                    const p =
                      s.status === "completed" ? 100 : s.status === "failed" ? 0 : prog[s.id] ?? (s.status === "processing" ? 90 : 10);
                    const highlight = highlightId === s.id;
                    return (
                      <div
                        id={`row-${s.id}`}
                        key={s.id}
                        className={`border rounded-lg p-4 space-y-3 transition ${
                          highlight ? "ring-2 ring-green-500 animate-pulse" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{s.title}</h4>
                              {s.status === "completed" ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : s.status === "failed" ? (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              ) : (
                                <Clock className="h-4 w-4 text-yellow-500 animate-spin" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{s.description}</p>

                            {s.video_url && <video controls src={s.video_url} className="w-full max-w-2xl rounded-md mb-2" />}

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
                          <Button size="sm" variant="outline" onClick={() => openEditInline(s, setForm)}>
                            <Edit2 className="h-3 w-3 mr-1" /> Edit Meta
                          </Button>
                          {s.video_url && (
                            <>
                              <a href={s.video_url} target="_blank" rel="noreferrer">
                                <Button size="sm" variant="outline">
                                  <Play className="h-3 w-3 mr-1" /> Open
                                </Button>
                              </a>
                              <a href={s.video_url} download>
                                <Button size="sm" variant="outline">
                                  <Eye className="h-3 w-3 mr-1" /> Download
                                </Button>
                              </a>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 bg-transparent"
                            onClick={() => handleDelete(s.id)}
                          >
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
    </div>
  );
}

/* ---- small pieces ---- */
function Meta({
  form,
  setForm,
}: {
  form: { title: string; description: string; type: VideoType };
  setForm: React.Dispatch<React.SetStateAction<{ title: string; description: string; type: VideoType }>>;
}) {
  return (
    <>
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
        <Textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      </div>
    </>
  );
}

function groupedByDate(rows: Row[]) {
  const g = rows.reduce<Record<string, Row[]>>((acc, r) => {
    const k = new Date(r.submitted_at).toLocaleDateString();
    (acc[k] ||= []).push(r);
    return acc;
  }, {});
  return Object.entries(g).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());
}

function typeBadge(t: VideoType) {
  switch (t) {
    case "daily-checkin":
      return "bg-blue-100 text-blue-800";
    case "medication":
      return "bg-green-100 text-green-800";
    case "therapy-session":
      return "bg-purple-100 text-purple-800";
    case "progress-update":
      return "bg-orange-100 text-orange-800";
  }
}
function statusBadge(s: VideoStatus) {
  return s === "completed"
    ? "bg-green-100 text-green-800"
    : s === "failed"
    ? "bg-red-100 text-red-800"
    : s === "processing"
    ? "bg-yellow-100 text-yellow-800"
    : "bg-blue-100 text-blue-800";
}
function formatClock(sec: number) {
  const m = Math.floor(sec / 60),
    s = Math.max(0, sec % 60);
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
function getGuestId(): string {
  try {
    const KEY = "src-guest-id";
    const v = localStorage.getItem(KEY);
    if (v) return v;
    const id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    return `guest-${Math.random().toString(36).slice(2, 10)}`;
  }
}
function openEditInline(s: Row, setForm: (updater: any) => void) {
  // why: quick meta editing without opening another screen
  setForm({ title: s.title, description: s.description ?? "", type: s.type });
}
