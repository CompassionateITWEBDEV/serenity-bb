// ./components/dashboard/real-time-video-system.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Video as VideoIcon,
  Video,
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
  Settings,
  Camera,
  Mic,
  MicOff,
  CameraOff,
  Download,
  Share,
  Calendar,
} from "lucide-react";

/* ---------- Build tag so you can verify the new bundle ---------- */
const BUILD_TAG = "rtvs-0923-1417"; // <- must appear on the page header

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
type ToastItem = { id: string; title: string; description?: string; variant?: "default" | "destructive"; timeout?: number };
function useLocalToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  function pushToast(t: Omit<ToastItem, "id">) {
    const item: ToastItem = { id: crypto.randomUUID(), timeout: 3500, variant: "default", ...t };
    setToasts((prev) => [...prev, item]);
    window.setTimeout(() => dismiss(item.id), item.timeout);
  }
  function dismiss(id: string) { setToasts((prev) => prev.filter((t) => t.id !== id)); }
  return { toasts, pushToast, dismiss };
}
function ToastHost({ items, onClose }: { items: ToastItem[]; onClose: (id: string) => void }) {
  return (
    <div className="pointer-events-none fixed top-3 right-3 z-[60] flex flex-col gap-2">
      {items.map((t) => (
        <div key={t.id} className={`pointer-events-auto w-80 rounded-lg border p-3 shadow-lg bg-white ${t.variant === "destructive" ? "border-red-300" : "border-gray-200"}`}>
          <div className="flex items-start gap-2">
            <div className={`mt-0.5 h-2 w-2 rounded-full ${t.variant === "destructive" ? "bg-red-500" : "bg-green-500"}`} />
            <div className="flex-1">
              <div className="text-sm font-medium">{t.title}</div>
              {t.description && <div className="text-xs text-muted-foreground">{t.description}</div>}
            </div>
            <button aria-label="Close" onClick={() => onClose(t.id)} className="opacity-60 hover:opacity-100"><X className="h-4 w-4" /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Inline banner ---------------- */
function InlineBanner({ kind, title, desc }: { kind: "success" | "error"; title: string; desc?: React.ReactNode }) {
  const tone = kind === "success" ? "border-green-300 bg-green-50 text-green-900" : "border-red-300 bg-red-50 text-red-900";
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

export default function RealTimeVideoSystem() {
  const { toasts, pushToast, dismiss } = useLocalToast();
  const { patient, isAuthenticated, loading: authLoading } = useAuth();

  const [banner, setBanner] = useState<{ kind: "success" | "error" | null; title?: string; desc?: React.ReactNode; anchorId?: string | null }>({ kind: null, title: "", desc: "", anchorId: null });

  // Get patient ID from authentication
  const patientId = patient?.user_id || patient?.id;
  const ownerCol = "patient_id";
  const ownerVal = patientId;

  // list + realtime
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [lastSubmittedId, setLastSubmittedId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !patientId || authLoading) return;
    
    const load = async () => {
      const { data, error } = await supabase.from("video_submissions").select("*").eq(ownerCol, ownerVal).order("submitted_at", { ascending: false });
      if (error) setErr(error.message); else setRows(data as Row[]);
    };
    load();
    const ch = supabase
      .channel(`video_subs_${ownerVal}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "video_submissions", filter: `${ownerCol}=eq.${ownerVal}` }, load)
      .subscribe();
    return () => ch.unsubscribe();
  }, [ownerVal, isAuthenticated, patientId, authLoading]);

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
  const [showPreviewOverlay, setShowPreviewOverlay] = useState(false);

  // manual upload
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);

  // cleanup URLs
  useEffect(() => () => { if (recordedPreviewUrl) URL.revokeObjectURL(recordedPreviewUrl); if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl); }, []);

  // rec timer
  useEffect(() => {
    if (isRecording) { const h = window.setInterval(() => setRecSecs((s) => s + 1), 1000); timerRef.current = h as unknown as number; }
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [isRecording]);

  // start
  async function startRecording() {
    console.log("[RTVS]", BUILD_TAG, "startRecording()");
    setErr(null);
    setBanner({ kind: null, title: "", desc: "", anchorId: null });
    setShowPreviewOverlay(false);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (e) {
      setErr("Camera/mic permission denied or not available.");
      console.error("[RTVS] getUserMedia error", e);
      return;
    }

    const el = videoRef.current;
    if (el) {
      el.pause();
      el.removeAttribute("src");
      el.srcObject = stream;
      el.controls = false;
      el.muted = true;
      el.playsInline = true;
      await el.play().catch((e) => console.warn("[RTVS] live preview play() blocked", e));
    }

    const mr = new MediaRecorder(stream);
    mrRef.current = mr;
    chunksRef.current = [];
    setRecordedBlob(null);
    if (recordedPreviewUrl) { URL.revokeObjectURL(recordedPreviewUrl); setRecordedPreviewUrl(null); }

    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.start();
    setRecSecs(0);
    setIsRecording(true);
  }

  function recorderDone(mr: MediaRecorder) {
    return new Promise<void>((resolve) => { const onStop = () => { mr.removeEventListener("stop", onStop); resolve(); }; mr.addEventListener("stop", onStop); });
  }

  // stop
  async function stopRecording() {
    console.log("[RTVS]", BUILD_TAG, "stopRecording()");
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
      }
      setShowPreviewOverlay(true);
      console.log("[RTVS] preview URL set", url);
    } else {
      if (videoRef.current) { videoRef.current.srcObject = null; videoRef.current.removeAttribute("src"); videoRef.current.controls = false; }
      console.warn("[RTVS] chunks empty after stop");
    }
  }

  // manual upload
  function openUploadPicker() { uploadInputRef.current?.click(); }
  function onUploadFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setPendingFile(file);
    const url = URL.createObjectURL(file);
    setPendingPreviewUrl(url);
    setForm((f) => ({ ...f, title: file.name.replace(/\.[^/.]+$/, "") }));
    e.currentTarget.value = "";
  }
  function clearPendingFile() { if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl); setPendingPreviewUrl(null); setPendingFile(null); }

  // meta form
  const [form, setForm] = useState<{ title: string; description: string; type: VideoType }>({ title: "", description: "", type: "daily-checkin" });

  // progress
  const [prog, setProg] = useState<Record<string, number>>({});
  function smoothProgress(id: string, from: number, to: number) {
    let v = from; setProg((m) => ({ ...m, [id]: v }));
    const h = window.setInterval(() => { v += 5; if (v >= to) { v = to; window.clearInterval(h); } setProg((m) => ({ ...m, [id]: v })); }, 150);
  }

  // create/replace
  async function createOrReplaceVideo(args: { fileBlob: Blob; filenameHint: string; meta: { title: string; description?: string | null; type: VideoType }; rowToReplaceId?: string; }) {
    if (!isAuthenticated || !patientId) {
      throw new Error("User must be authenticated to upload videos");
    }

    const { fileBlob, filenameHint, meta, rowToReplaceId } = args;
    const duration = await getBlobDuration(fileBlob).catch(() => 0);
    const sizeMb = +(fileBlob.size / (1024 * 1024)).toFixed(2);
    const ext = filenameHint.includes(".") ? filenameHint.split(".").pop()! : "webm";

    let row: Row;
    if (!rowToReplaceId) {
      const { data, error } = await supabase.from("video_submissions").insert({
        patient_id: patientId, visitor_id: null, title: meta.title?.trim() || "Untitled Recording",
        description: meta.description ?? null, type: meta.type, status: "uploading",
        size_mb: sizeMb, duration_seconds: duration, submitted_at: new Date().toISOString(),
      }).select("*").single();
      if (error) throw error;
      row = data as Row;
      setRows((prev) => [row, ...prev]); // optimistic
    } else {
      const { data, error } = await supabase.from("video_submissions").update({
        title: meta.title?.trim() || "Untitled Recording", description: meta.description ?? null, type: meta.type, status: "uploading",
      }).eq("id", rowToReplaceId).select("*").single();
      if (error) throw error;
      row = data as Row;
      if (row.storage_path) await supabase.storage.from(BUCKET).remove([row.storage_path]).catch(() => {});
      setRows((prev) => [row, ...prev.filter((r) => r.id !== row.id)]);
    }

    setLastSubmittedId(row.id);
    smoothProgress(row.id, 10, 85);

    const path = `${ownerVal}/${row.id}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, fileBlob, { contentType: fileBlob.type || "video/webm", upsert: true });
    if (upErr) throw upErr;

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    await supabase.from("video_submissions").update({ storage_path: path, video_url: pub?.publicUrl ?? null, status: "processing" }).eq("id", row.id);

    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, storage_path: path, video_url: pub?.publicUrl ?? null, status: "processing" } : r)));

    setTimeout(async () => {
      await supabase.from("video_submissions").update({ status: "completed", processed_at: new Date().toISOString() }).eq("id", row.id);
      setProg((m) => ({ ...m, [row.id]: 100 }));
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: "completed", processed_at: new Date().toISOString() } : r)));
    }, 1000);

    pushToast({ title: "Video submitted", description: `${meta.title || "Untitled"} • ${formatClock(duration)} • ${sizeMb} MB` });
    setBanner({
      kind: "success",
      title: "Submission received",
      desc: <>We’re processing your video. It appears below now.{" "}
        <button className="underline underline-offset-2" onClick={() => setLastSubmittedId(row.id)}>View in history</button></>,
      anchorId: row.id,
    });

    return { id: row.id, duration, sizeMb };
  }

  // submit
  async function submitRecorded() {
    if (!recordedBlob) return setErr("No recording. Click Stop first.");
    try {
      const { id } = await createOrReplaceVideo({ fileBlob: recordedBlob, filenameHint: "recording.webm", meta: form });
      if (recordedPreviewUrl) URL.revokeObjectURL(recordedPreviewUrl);
      setRecordedPreviewUrl(null); setRecordedBlob(null); setShowPreviewOverlay(false);
      setForm({ title: "", description: "", type: "daily-checkin" }); setRecSecs(0);
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
      const { id } = await createOrReplaceVideo({ fileBlob: pendingFile, filenameHint: pendingFile.name, meta: form });
      clearPendingFile(); setForm({ title: "", description: "", type: "daily-checkin" });
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

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading video system...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show authentication required message
  if (!isAuthenticated || !patientId) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Authentication Required</h3>
            <p className="text-gray-600">Please sign in to access the video recording system.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastHost items={toasts} onClose={dismiss} />

      {/* Enhanced Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Recording Mode:</span> patient · <code className="bg-gray-100 px-2 py-1 rounded text-xs">{patient?.first_name || 'User'}</code>
          </div>
          <div className="text-xs text-gray-500 font-mono">
            build: {BUILD_TAG}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input ref={uploadInputRef} type="file" accept="video/*" className="hidden" onChange={onUploadFileChange} />
          <Button variant="outline" size="sm" onClick={openUploadPicker}>
            <PlusCircle className="w-4 h-4 mr-2" /> 
            Upload File
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {banner.kind && <InlineBanner kind={banner.kind} title={banner.title || ""} desc={banner.desc} />}

      {/* Enhanced Recorder */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 border-b">
          <CardTitle className="flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-lg">
              <VideoIcon className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">Real-time Video Submission</div>
              <div className="text-sm text-gray-600 font-normal">Record, preview instantly, then upload</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {err && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{err}</AlertDescription>
            </Alert>
          )}

          {/* Enhanced Video Container */}
          <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video shadow-2xl">
            <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
            
            {/* Placeholder when not recording */}
            {!isRecording && !recordedPreviewUrl && (
              <div className="absolute inset-0 grid place-items-center text-white/90">
                <div className="text-center space-y-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-full p-6">
                    <VideoIcon className="h-16 w-16 mx-auto opacity-80" />
                  </div>
                  <div>
                    <p className="text-lg font-medium">Ready to Record</p>
                    <p className="text-sm opacity-80">Click start to begin your video recording</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recording indicator */}
            {isRecording && (
              <div className="absolute top-4 left-4 bg-red-600 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-3 shadow-lg">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                <span className="font-mono">REC {formatClock(recSecs)}</span>
              </div>
            )}

            {/* Recording controls overlay */}
            {isRecording && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-black/50 backdrop-blur-sm rounded-full px-6 py-3 flex items-center gap-4">
                  <div className="flex items-center gap-2 text-white">
                    <Camera className="h-4 w-4" />
                    <span className="text-sm">Recording</span>
                  </div>
                  <div className="w-px h-4 bg-white/30" />
                  <div className="flex items-center gap-2 text-white">
                    <Mic className="h-4 w-4" />
                    <span className="text-sm">Audio</span>
                  </div>
                </div>
              </div>
            )}

            {/* Preview overlay */}
            {recordedPreviewUrl && !isRecording && showPreviewOverlay && (
              <div className="absolute inset-0 grid place-items-start p-4">
                <div className="rounded-lg bg-green-600 text-white px-4 py-2 text-sm font-medium shadow-lg flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Preview Ready
                </div>
                <div className="absolute inset-0 grid place-items-center bg-black/60 backdrop-blur-sm">
                  <div className="bg-white rounded-2xl p-6 shadow-2xl w-[95%] max-w-lg text-center space-y-4">
                    <div className="space-y-2">
                      <div className="text-lg font-semibold text-gray-900">Recording Complete!</div>
                      <div className="text-sm text-gray-600">Your video is ready for review and upload</div>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center">
                      <Button size="sm" onClick={() => { videoRef.current?.play().catch(() => {}); setShowPreviewOverlay(false); }}>
                        <Play className="h-4 w-4 mr-2" /> Play Preview
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { if (recordedPreviewUrl) URL.revokeObjectURL(recordedPreviewUrl); setRecordedPreviewUrl(null); setRecordedBlob(null); setShowPreviewOverlay(false); }}>
                        <RotateCcw className="h-4 w-4 mr-2" /> Retake
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setShowPreviewOverlay(false); document.getElementById("preview-card-anchor")?.scrollIntoView({ behavior: "smooth" }); }}>
                        <Settings className="h-4 w-4 mr-2" /> Configure & Upload
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Controls */}
          <div className="flex justify-center gap-4">
            {!isRecording ? (
              <Button 
                onClick={startRecording} 
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <VideoIcon className="h-5 w-5 mr-3" /> 
                Start Recording
              </Button>
            ) : (
              <Button 
                onClick={stopRecording} 
                size="lg"
                variant="outline" 
                className="border-red-300 text-red-600 hover:bg-red-50 px-8 py-3 rounded-xl"
              >
                <VideoIcon className="h-5 w-5 mr-3" /> 
                Stop Recording
              </Button>
            )}
          </div>

          {/* Enhanced Recorded preview card */}
          {recordedPreviewUrl && !isRecording && (
            <div id="preview-card-anchor" className="space-y-6 p-6 border-2 border-blue-200 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Play className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">Preview & Submit</h4>
                  <p className="text-sm text-gray-600">Review your recording and add details before uploading</p>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <video key={recordedPreviewUrl} controls src={recordedPreviewUrl} className="w-full rounded-lg shadow-sm" />
              </div>
              
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <Meta form={form} setForm={setForm} />
              </div>
              
              <div className="flex gap-3">
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200" 
                  onClick={submitRecorded}
                >
                  <Upload className="h-5 w-5 mr-2" /> 
                  Upload Recording
                </Button>
                <Button 
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-lg" 
                  variant="outline" 
                  onClick={() => { if (recordedPreviewUrl) URL.revokeObjectURL(recordedPreviewUrl); setRecordedPreviewUrl(null); setRecordedBlob(null); setShowPreviewOverlay(false); }}
                >
                  <X className="h-5 w-5 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Enhanced Picked file preview card */}
          {pendingFile && pendingPreviewUrl && (
            <div className="space-y-6 p-6 border-2 border-green-200 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <Upload className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">File Preview & Submit</h4>
                  <p className="text-sm text-gray-600">Review your uploaded file and add details before submitting</p>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <video key={pendingPreviewUrl} controls src={pendingPreviewUrl} className="w-full rounded-lg shadow-sm" />
              </div>
              
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <Meta form={form} setForm={setForm} />
              </div>
              
              <div className="flex gap-3">
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200" 
                  onClick={submitPendingFile}
                >
                  <Upload className="h-5 w-5 mr-2" /> 
                  Upload File
                </Button>
                <Button 
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-lg" 
                  variant="outline" 
                  onClick={clearPendingFile}
                >
                  <X className="h-5 w-5 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced History */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Upload className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">Submission Status</div>
              <div className="text-sm text-gray-600 font-normal">Uploaded videos are playable below</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {rows.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                  <Video className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Video Submissions Yet</h3>
                <p className="text-gray-600 mb-6">Start recording or upload videos to see them here</p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={startRecording}>
                    <Video className="h-4 w-4 mr-2" />
                    Start Recording
                  </Button>
                  <Button variant="outline" onClick={openUploadPicker}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </Button>
                </div>
              </div>
            ) : (
              groupedByDate(rows).map(([date, items]) => (
                <div key={date} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-blue-500 rounded-full" />
                    <h3 className="text-lg font-semibold text-gray-900">{date}</h3>
                    <Badge variant="outline" className="text-xs">{items.length} video{items.length !== 1 ? 's' : ''}</Badge>
                  </div>
                  <div className="grid gap-4">
                    {items.map((s) => {
                      const p = s.status === "completed" ? 100 : s.status === "failed" ? 0 : prog[s.id] ?? (s.status === "processing" ? 90 : 10);
                      const highlight = highlightId === s.id;
                      return (
                        <div 
                          id={`row-${s.id}`} 
                          key={s.id} 
                          className={`border-2 rounded-xl p-6 space-y-4 transition-all duration-200 ${
                            highlight 
                              ? "ring-2 ring-green-500 bg-green-50 border-green-200 shadow-lg" 
                              : "bg-white hover:shadow-md border-gray-200"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-3">
                                <h4 className="text-lg font-semibold text-gray-900">{s.title}</h4>
                                {s.status === "completed" ? (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : s.status === "failed" ? (
                                  <AlertCircle className="h-5 w-5 text-red-500" />
                                ) : (
                                  <Clock className="h-5 w-5 text-yellow-500 animate-spin" />
                                )}
                              </div>
                              
                              {s.description && (
                                <p className="text-gray-600">{s.description}</p>
                              )}
                              
                              {s.video_url && (
                                <div className="bg-gray-900 rounded-lg overflow-hidden">
                                  <video controls src={s.video_url} className="w-full max-w-2xl" />
                                </div>
                              )}
                              
                              <div className="flex items-center gap-6 text-sm text-gray-500">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  <span>{formatClock(s.duration_seconds ?? 0)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Upload className="h-4 w-4" />
                                  <span>{s.size_mb ? `${s.size_mb} MB` : "-"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  <span>{new Date(s.submitted_at).toLocaleString()}</span>
                                </div>
                              </div>
                              
                              {(s.storage_path || s.video_url) && (
                                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                                  {s.storage_path && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium text-gray-600">Storage Path:</span>
                                      <code className="text-xs bg-white px-2 py-1 rounded border">{truncate(s.storage_path, 64)}</code>
                                      <IconCopy text={s.storage_path} onCopy={() => pushToast({ title: "Path copied" })} />
                                    </div>
                                  )}
                                  {s.video_url && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium text-gray-600">Video URL:</span>
                                      <code className="text-xs bg-white px-2 py-1 rounded border">{truncate(s.video_url, 64)}</code>
                                      <IconCopy text={s.video_url} onCopy={() => pushToast({ title: "URL copied" })} />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex flex-col items-end gap-2">
                              <div className="flex items-center gap-2">
                                <Badge className={typeBadge(s.type)}>{s.type.replace("-", " ")}</Badge>
                                <Badge className={statusBadge(s.status)}>{s.status}</Badge>
                              </div>
                            </div>
                          </div>
                          
                          {(s.status === "uploading" || s.status === "processing") && (
                            <div className="space-y-3">
                              <div className="flex justify-between text-sm font-medium">
                                <span className="capitalize text-gray-700">{s.status}...</span>
                                <span className="text-gray-600">{p}%</span>
                              </div>
                              <Progress value={p} className="h-3" />
                            </div>
                          )}
                          
                          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                            <Button size="sm" variant="outline" onClick={() => openEditInline(s, setForm)}>
                              <Edit2 className="h-4 w-4 mr-2" /> 
                              Edit Details
                            </Button>
                            {s.video_url && (
                              <>
                                <a href={s.video_url} target="_blank" rel="noreferrer">
                                  <Button size="sm" variant="outline">
                                    <Play className="h-4 w-4 mr-2" /> 
                                    Open
                                  </Button>
                                </a>
                                <a href={s.video_url} download>
                                  <Button size="sm" variant="outline">
                                    <Download className="h-4 w-4 mr-2" /> 
                                    Download
                                  </Button>
                                </a>
                                <Button size="sm" variant="outline">
                                  <Share className="h-4 w-4 mr-2" /> 
                                  Share
                                </Button>
                              </>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" 
                              onClick={() => handleDelete(s.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- Helpers ---------------- */
function Meta({ form, setForm }: { form: { title: string; description: string; type: VideoType }; setForm: React.Dispatch<React.SetStateAction<{ title: string; description: string; type: VideoType }>>; }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label className="text-sm">Title</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Enter video title" /></div>
        <div>
          <Label className="text-sm">Type</Label>
          <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as VideoType }))} className="w-full p-2 border rounded-md">
            <option value="daily-checkin">Daily Check-in</option><option value="medication">Medication</option>
            <option value="therapy-session">Therapy Session</option><option value="progress-update">Progress Update</option>
          </select>
        </div>
      </div>
      <div><Label className="text-sm">Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
    </>
  );
}
function groupedByDate(rows: Row[]) { const g = rows.reduce<Record<string, Row[]>>((acc, r) => { const k = new Date(r.submitted_at).toLocaleDateString(); (acc[k] ||= []).push(r); return acc; }, {}); return Object.entries(g).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime()); }
function typeBadge(t: VideoType) { switch (t) { case "daily-checkin": return "bg-blue-100 text-blue-800"; case "medication": return "bg-green-100 text-green-800"; case "therapy-session": return "bg-purple-100 text-purple-800"; case "progress-update": return "bg-orange-100 text-orange-800"; } }
function statusBadge(s: VideoStatus) { return s === "completed" ? "bg-green-100 text-green-800" : s === "failed" ? "bg-red-100 text-red-800" : s === "processing" ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800"; }
function formatClock(sec: number) { const m = Math.floor(sec / 60), s = Math.max(0, sec % 60); return `${m}:${String(s).padStart(2, "0")}`; }
function getBlobDuration(blob: Blob): Promise<number> { return new Promise((resolve, reject) => { const v = document.createElement("video"); v.preload = "metadata"; v.onloadedmetadata = () => { const d = isFinite(v.duration) ? v.duration : 0; URL.revokeObjectURL(v.src); resolve(Math.round(d)); }; v.onerror = () => reject(new Error("Unable to read duration")); v.src = URL.createObjectURL(blob); }); }
function getGuestId(): string { try { const KEY = "src-guest-id"; const v = localStorage.getItem(KEY); if (v) return v; const id = crypto.randomUUID(); localStorage.setItem(KEY, id); return id; } catch { return `guest-${Math.random().toString(36).slice(2, 10)}`; } }
function openEditInline(s: Row, setForm: (updater: any) => void) { setForm({ title: s.title, description: s.description ?? "", type: s.type }); }
function truncate(s: string, n = 64) { if (s.length <= n) return s; const half = Math.floor((n - 3) / 2); return `${s.slice(0, half)}...${s.slice(-half)}`; }
function IconCopy({ text, onCopy }: { text: string; onCopy?: () => void }) {
  return (
    <button className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px]" onClick={() => { navigator.clipboard.writeText(text).then(() => onCopy && onCopy()); }}>
      <Copy className="h-3 w-3" /> Copy
    </button>
  );
}
