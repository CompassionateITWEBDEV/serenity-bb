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
  X,
  Copy,
  Info,
  RotateCcw,
} from "lucide-react";

/* ---------------- Types ---------------- */
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

/* ---------------- Local toast (self-contained) ---------------- */
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
            <div className={`mt-0.5 h-2 w-2 rounded-full ${t.variant === "destructive" ? "bg-red-500" : "bg-green-500"}`} />
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

/* ---------------- Inline banner (no external UI deps) ---------------- */
function InlineBanner({
  kind,
  title,
  desc,
}: {
  kind: "success" | "error";
  title: string;
  desc?: React.ReactNode;
}) {
  const tone =
    kind === "success"
      ? "border-green-300 bg-green-50 text-green-900"
      : "border-red-300 bg-red-50 text-red-900";
  return (
    <div className={`flex items-start gap-3 rounded-md border p-3 ${tone}`}>
      <Info className="h-4 w-4 mt-0.5" />
      <div className="flex-1">
        <div className="text-sm font-medium">{title}</div>
        {desc && <div className="text-xs opacity-80">{desc}</div>}
      </div>
    </div>
  );
}

/* ---------------- Component ---------------- */
export default function RealTimeVideoSystem() {
  const { toasts, pushToast, dismiss } = useLocalToast();

  const [banner, setBanner] = useState<{
    kind: "success" | "error" | null;
    title?: string;
    desc?: string;
    anchorId?: string | null;
  }>({ kind: null, title: "", desc: "", anchorId: null });

  // identity (guest)
  const guestId = getGuestId();
  const ownerCol = "visitor_id";
  const ownerVal = guestId;

  // list + realtime
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

  // auto-scroll + highlight
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

  // recording
  const [isRecording, setIsRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const timerRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedPreviewUrl, setRecordedPreviewUrl] = useState<string | null>(null);
  const [showPreviewOverlay, setShowPreviewOverlay] = useState(false); // overlay cues on big player

  // manual upload
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

  // rec timer
  useEffect(() => {
    if (isRecording) {
      const h = window.setInterval(() => setRecSecs((s) => s + 1), 1000);
      timerRef.current = h;
    }
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // start recording (live camera in big box)
  async function startRecording() {
    setErr(null);
    setBanner({ kind: null, title: "", desc: "", anchorId: null });
    setShowPreviewOverlay(false);

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    const el = videoRef.current;
    if (el) {
      el.pause();
      el.removeAttribute("src");
      el.srcObject = stream;
      el.controls = false;
      el.muted = true;
      el.playsInline = true;
      await el.play().catch(() => {});
    }

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

  function recorderDone(mr: MediaRecorder) {
    // why: make sure the final dataavailable arrived before we read chunks
    return new Promise<void>((resolve) => {
      const onStop = () => {
        mr.removeEventListener("stop", onStop);
        resolve();
      };
      mr.addEventListener("stop", onStop);
    });
  }

  // stop recording (swap big box to recorded file w/ controls + overlay)
  async function stopRecording() {
    if (!mrRef.current || !isRecording) return;
    const mr = mrRef.current;
    mr.stop();
    await recorderDone(mr);
    setIsRecording(false);

    const liveStream = videoRef.current?.srcObject as MediaStream | null;
    liveStream?.getTracks().forEach((t) => t.stop());

    if (chunksRef.current.length > 0) {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setRecordedBlob(blob);
      const url = URL.createObjectURL(blob);
      setRecordedPreviewUrl(url);

      const el = videoRef.current;
      if (el) {
        el.srcObject = null;
        el.src = url;
        el.muted = false;
        el.controls = true;
        el.playsInline = true;
        el.load();
        // do not auto-play on all browsers; user will click Play in overlay
      }
      setShowPreviewOverlay(true);
    } else {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.removeAttribute("src");
        videoRef.current.controls = false;
      }
    }
  }

  // manual upload helpers
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

  // meta form
  const [form, setForm] = useState<{ title: string; description: string; type: VideoType }>({
    title: "",
    description: "",
    type: "daily-checkin",
  });

  // progress
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

  // create/replace
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

      // optimistic: show immediately
      setRows((prev) => [row, ...prev]);
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
      setRows((prev) => [row, ...prev.filter((r) => r.id !== row.id)]);
    }

    setLastSubmittedId(row.id);
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

    // reflect path/url right away
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, storage_path: path, video_url: pub?.publicUrl ?? null, status: "processing" } : r)),
    );

    // mock processing → completed
    setTimeout(async () => {
      await supabase
        .from("video_submissions")
        .update({ status: "completed", processed_at: new Date().toISOString() })
        .eq("id", row.id);
      setProg((m) => ({ ...m, [row.id]: 100 }));
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: "completed", processed_at: new Date().toISOString() } : r)));
    }, 1000);

    // smart alerts
    pushToast({ title: "Video submitted", description: `${meta.title || "Untitled"} • ${formatClock(duration)} • ${sizeMb} MB` });
    setBanner({
      kind: "success",
      title: "Submission received",
      desc: (
        <>
          We’re processing your video. It appears below now.{" "}
          <button className="underline underline-offset-2" onClick={() => setLastSubmittedId(row.id)}>
            View in history
          </button>
        </>
      ) as any,
      anchorId: row.id,
    });

    return { id: row.id, duration, sizeMb };
  }

  // submit flows
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
      setShowPreviewOverlay(false);
      setForm({ title: "", description: "", type: "daily-checkin" });
      setRecSecs(0);
      setBanner((n) => ({ ...n, anchorId: id }));
    } catch (e: any) {
      setErr(e?.message ?? "Upload failed");
      pushToast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
      setBanner({ kind: "error", title: "Upload failed", desc: "Please try again.", anchorId: null });
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
      setBanner((n) => ({ ...n, anchorId: id }));
    } catch (e: any) {
      setErr(e?.message ?? "Upload failed");
      pushToast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
      setBanner({ kind: "error", title: "Upload failed", desc: "Please try again.", anchorId: null });
    }
  }

  async function handleDelete(id: string) {
    const row = rows.find((r) => r.id === id);
    if (row?.storage_path) await supabase.storage.from(BUCKET).remove([row.storage_path]).catch(() => {});
    await supabase.from("video_submissions").delete().eq("id", id).eq(ownerCol, ownerVal);
    setRows((prev) => prev.filter((r) => r.id !== id));
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

      {/* Inline banner */}
      {banner.kind && <InlineBanner kind={banner.kind} title={banner.title || ""} desc={banner.desc} />}

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
            {/* start hint */}
            {!isRecording && !recordedPreviewUrl && (
              <div className="absolute inset-0 grid place-items-center text-white/80">
                <div className="text-center">
                  <VideoIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Click start to begin recording</p>
                </div>
              </div>
            )}
            {/* rec badge */}
            {isRecording && (
              <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                REC {formatClock(recSecs)}
              </div>
            )}
            {/* preview overlay */}
            {recordedPreviewUrl && !isRecording && showPreviewOverlay && (
              <div className="absolute inset-0 bg-black/50 grid place-items-center">
                <div className="bg-white rounded-xl p-4 shadow-md w-[92%] max-w-md text-center space-y-3">
                  <div className="text-sm font-medium">Preview ready</div>
                  <div className="text-xs text-muted-foreground">
                    Your recording has been captured. You can play it, retake, or open details to upload.
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button
                      size="sm"
                      onClick={() => {
                        const el = videoRef.current;
                        if (el) el.play().catch(() => {});
                        setShowPreviewOverlay(false);
                      }}
                    >
                      <Play className="h-3 w-3 mr-1" /> Play
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // retake: clear preview url & blob, go back to idle
                        if (recordedPreviewUrl) URL.revokeObjectURL(recordedPreviewUrl);
                        setRecordedPreviewUrl(null);
                        setRecordedBlob(null);
                        setShowPreviewOverlay(false);
                      }}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" /> Retake
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowPreviewOverlay(false);
                        // scroll to preview card
                        const el = document.getElementById("preview-card-anchor");
                        el?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                    >
                      Open details
                    </Button>
                  </div>
                </div>
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

          {/* Recorded preview card */}
          {recordedPreviewUrl && !isRecording && (
            <div id="preview-card-anchor" className="space-y-4 p-4 border rounded-lg bg-gray-50">
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
                    setShowPreviewOverlay(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Picked file preview card */}
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

      {/* History */}
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
                        className={`border rounded-lg p-4 space-y-3 transition ${highlight ? "ring-2 ring-green-500 animate-pulse" : ""}`}
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

                            {/* Path + URL */}
                            <div className="mt-2 text-xs">
                              {s.storage_path && (
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">path:</span>
                                  <code className="rounded bg-gray-100 px-1">{truncate(s.storage_path, 64)}</code>
                                  <IconCopy text={s.storage_path} onCopy={() => pushToast({ title: "Path copied" })} />
                                </div>
                              )}
                              {s.video_url && (
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">url:</span>
                                  <code className="rounded bg-gray-100 px-1">{truncate(s.video_url, 64)}</code>
                                  <IconCopy text={s.video_url} onCopy={() => pushToast({ title: "URL copied" })} />
                                </div>
                              )}
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

/* ---------------- Small pieces ---------------- */
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
  const m = Math.floor(sec / 60);
  const s = Math.max(0, sec % 60);
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
  setForm({ title: s.title, description: s.description ?? "", type: s.type });
}
function truncate(s: string, n = 64) {
  if (s.length <= n) return s;
  const half = Math.floor((n - 3) / 2);
  return `${s.slice(0, half)}...${s.slice(-half)}`;
}
function IconCopy({ text, onCopy }: { text: string; onCopy?: () => void }) {
  return (
    <button
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px]"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => onCopy && onCopy());
      }}
    >
      <Copy className="h-3 w-3" />
      Copy
    </button>
  );
}
