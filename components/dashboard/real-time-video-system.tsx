// /components/dashboard/real-time-video-system.tsx
"use client";

/**
 * Realtime Video Submissions (Supabase)
 * Requires:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 * - Storage bucket: "videos" (public or use signed URLs server-side)
 *
 * DB one-time (run in Supabase SQL editor if not already):
 *
 * do $$
 * begin
 *   if not exists (
 *     select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace
 *     where t.typname='video_status' and n.nspname='public'
 *   ) then
 *     execute 'create type public.video_status as enum (''uploading'',''processing'',''completed'',''failed'')';
 *   end if;
 * end $$;
 *
 * create table if not exists public.video_submissions (
 *   id uuid primary key default gen_random_uuid(),
 *   patient_id uuid not null references public.patients(user_id) on delete cascade,
 *   title text not null,
 *   description text,
 *   type text not null check (type in ('daily-checkin','medication','therapy-session','progress-update')),
 *   status public.video_status not null default 'uploading',
 *   storage_path text,
 *   video_url text,
 *   thumbnail_url text,
 *   size_mb numeric,
 *   duration_seconds integer,
 *   submitted_at timestamptz not null default now(),
 *   processed_at timestamptz
 * );
 * alter table public.video_submissions enable row level security;
 * do $$
 * begin
 *   if not exists (select 1 from pg_policies where tablename='video_submissions' and policyname='r:videos') then
 *     create policy "r:videos" on public.video_submissions for select using (true);
 *   end if;
 *   if not exists (select 1 from pg_policies where tablename='video_submissions' and policyname='w:videos') then
 *     create policy "w:videos" on public.video_submissions for insert with check (true);
 *   end if;
 *   if not exists (select 1 from pg_policies where tablename='video_submissions' and policyname='u:videos') then
 *     create policy "u:videos" on public.video_submissions for update using (true);
 *   end if;
 *   if not exists (select 1 from pg_policies where tablename='video_submissions' and policyname='d:videos') then
 *     create policy "d:videos" on public.video_submissions for delete using (true);
 *   end if;
 * end $$;
 * grant usage on schema public to anon, authenticated;
 * grant select, insert, update, delete on public.video_submissions to anon, authenticated;
 * notify pgrst, 'reload schema';
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video as VideoIcon, Upload, Clock, CheckCircle, AlertCircle, Play, Eye, Trash2, Users } from "lucide-react";

type VideoStatus = "uploading" | "processing" | "completed" | "failed";
type VideoType = "daily-checkin" | "medication" | "therapy-session" | "progress-update";

interface Patient {
  user_id: string;
  full_name: string | null;
}

interface VideoSubmissionRow {
  id: string;
  patient_id: string;
  title: string;
  description: string | null;
  status: VideoStatus;
  type: VideoType;
  storage_path: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  size_mb: number | null;
  duration_seconds: number | null;
  submitted_at: string;
  processed_at: string | null;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BUCKET = "videos";

export default function RealTimeVideoSystem() {
  // Patients
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState<string | null>(null);

  // Recorder
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [form, setForm] = useState<{ title: string; description: string; type: VideoType }>({
    title: "",
    description: "",
    type: "daily-checkin",
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Submissions
  const [subs, setSubs] = useState<VideoSubmissionRow[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Load patients
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("user_id, full_name")
        .order("created_at", { ascending: false });
      if (error) {
        alert(error.message);
        return;
      }
      setPatients(data as Patient[]);
      if (!patientId && data && data.length) setPatientId((data[0] as any).user_id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load + subscribe per patient
  useEffect(() => {
    if (!patientId) return;

    const load = async () => {
      const { data, error } = await supabase
        .from("video_submissions")
        .select("*")
        .eq("patient_id", patientId)
        .order("submitted_at", { ascending: false });
      if (error) {
        alert(error.message);
        return;
      }
      setSubs(data as VideoSubmissionRow[]);
    };
    load();

    channelRef.current?.unsubscribe();
    const ch = supabase
      .channel(`video_subs_${patientId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "video_submissions", filter: `patient_id=eq.${patientId}` },
        () => load()
      )
      .subscribe();
    channelRef.current = ch;
    return () => ch.unsubscribe();
  }, [patientId]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Start/Stop recording
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) videoRef.current.srcObject = stream;

      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      recordedChunks.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.current.push(e.data);
      };

      mr.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (e: any) {
      alert(`Camera/mic error: ${e.message ?? e}`);
    }
  }

  function stopRecording() {
    if (!mediaRecorderRef.current || !isRecording) return;
    mediaRecorderRef.current.stop();
    setIsRecording(false);

    const v = videoRef.current;
    if (v?.srcObject) {
      (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      v.srcObject = null;
    }
  }

  // Submit video: insert row → upload file → update row → (simulate) processing done
  async function submitVideo() {
    if (!patientId) return alert("Select a patient first.");
    if (recordedChunks.current.length === 0) return;

    const blob = new Blob(recordedChunks.current, { type: "video/webm" });
    const durationSeconds = await getBlobDuration(blob).catch(() => Math.round(recordingTime));
    const sizeMb = +(blob.size / (1024 * 1024)).toFixed(2);
    const submittedAt = new Date().toISOString();

    // Create DB row
    const { data: row, error: insertErr } = await supabase
      .from("video_submissions")
      .insert({
        patient_id: patientId,
        title: form.title?.trim() || "Untitled Recording",
        description: form.description?.trim() || null,
        type: form.type,
        status: "uploading",
        size_mb: sizeMb,
        duration_seconds: durationSeconds,
        submitted_at: submittedAt,
      })
      .select("*")
      .single();

    if (insertErr) {
      alert(`Failed to create submission: ${insertErr.message}`);
      return;
    }

    // Simulated progress while uploading (why: supabase-js has no upload progress)
    smoothProgress(row.id, 10, 85);

    // Upload to Storage
    const path = `${patientId}/${Date.now()}.webm`;
    try {
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, {
        contentType: "video/webm",
        upsert: false,
      });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

      // Update row to processing
      const { error: updErr } = await supabase
        .from("video_submissions")
        .update({ storage_path: path, video_url: pub?.publicUrl ?? null, status: "processing" })
        .eq("id", row.id);
      if (updErr) throw updErr;

      // Simulate transcoder completion (replace with your worker callback)
      setTimeout(async () => {
        await supabase
          .from("video_submissions")
          .update({ status: "completed", processed_at: new Date().toISOString() })
          .eq("id", row.id);
        progressTick(row.id, 100);
      }, 1500);
    } catch (e: any) {
      await supabase.from("video_submissions").update({ status: "failed" }).eq("id", row.id);
      alert(`Upload failed: ${e.message ?? e}`);
    } finally {
      recordedChunks.current = [];
      setForm({ title: "", description: "", type: "daily-checkin" });
      setRecordingTime(0);
    }
  }

  // Delete submission + file
  async function handleDelete(id: string) {
    const row = subs.find((s) => s.id === id);
    if (!row) return;
    if (row.storage_path) {
      await supabase.storage.from(BUCKET).remove([row.storage_path]).catch(() => {});
    }
    await supabase.from("video_submissions").delete().eq("id", id);
  }

  // Helpers: progress + formatting
  function progressTick(id: string, value: number) {
    setProgressMap((p) => ({ ...p, [id]: value }));
  }
  function smoothProgress(id: string, from: number, to: number) {
    let v = from;
    progressTick(id, v);
    const h = setInterval(() => {
      v += 5;
      if (v >= to) {
        v = to;
        clearInterval(h);
      }
      progressTick(id, v);
    }, 200);
  }
  function getStatusIcon(s: VideoStatus) {
    if (s === "completed") return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (s === "failed") return <AlertCircle className="h-4 w-4 text-red-500" />;
    return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
  }
  function getStatusColor(s: VideoStatus) {
    if (s === "completed") return "bg-green-100 text-green-800";
    if (s === "failed") return "bg-red-100 text-red-800";
    if (s === "processing") return "bg-yellow-100 text-yellow-800";
    return "bg-blue-100 text-blue-800";
  }
  function getTypeColor(t: VideoType) {
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
  const grouped = useMemo(() => {
    const g = subs.reduce<Record<string, VideoSubmissionRow[]>>((acc, s) => {
      const key = new Date(s.submitted_at).toLocaleDateString();
      (acc[key] ||= []).push(s);
      return acc;
    }, {});
    return Object.entries(g).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());
  }, [subs]);

  return (
    <div className="space-y-6">
      {/* Patient selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle>Patients</CardTitle>
            </div>
          </div>
          <CardDescription>Select a patient to record and view submissions.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={patientId ?? ""} onValueChange={setPatientId}>
            <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
            <SelectContent>
              {patients.map((p) => (
                <SelectItem key={p.user_id} value={p.user_id}>
                  {p.full_name ?? p.user_id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Recording */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <VideoIcon className="h-5 w-5 text-red-600" />
            Real-time Video Submission
          </CardTitle>
          <CardDescription>Record and submit videos with live status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
            <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
            {!isRecording && recordedChunks.current.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800/50">
                <div className="text-center text-white">
                  <VideoIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Click start to begin recording</p>
                </div>
              </div>
            )}
            {isRecording && (
              <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                REC {formatClock(recordingTime)}
              </div>
            )}
          </div>

          <div className="flex justify-center gap-4">
            {!isRecording ? (
              <Button onClick={startRecording} className="bg-red-600 hover:bg-red-700" disabled={!patientId}>
                <VideoIcon className="h-4 w-4 mr-2" />
                Start Recording
              </Button>
            ) : (
              <Button onClick={stopRecording} variant="outline">
                <VideoIcon className="h-4 w-4 mr-2" />
                Stop Recording
              </Button>
            )}
          </div>

          {recordedChunks.current.length > 0 && !isRecording && (
            <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium">Submit Your Recording</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Enter video title"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Select value={form.type} onValueChange={(v: VideoType) => setForm((f) => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily-checkin">Daily Check-in</SelectItem>
                      <SelectItem value="medication">Medication</SelectItem>
                      <SelectItem value="therapy-session">Therapy Session</SelectItem>
                      <SelectItem value="progress-update">Progress Update</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Describe your video content"
                  rows={3}
                />
              </div>
              <Button onClick={submitVideo} className="w-full" disabled={!patientId}>
                <Upload className="h-4 w-4 mr-2" />
                Submit Video
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Realtime list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            Submission Status
          </CardTitle>
          <CardDescription>Live tracking of your video submissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {subs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No video submissions yet.</p>
            ) : (
              grouped.map(([date, items]) => (
                <div key={date} className="space-y-3">
                  <div className="text-xs font-medium text-gray-600">{date}</div>
                  {items.map((s) => {
                    const prog =
                      s.status === "completed" ? 100 :
                      s.status === "failed" ? 0 :
                      progressMap[s.id] ?? (s.status === "processing" ? 90 : 10);

                    return (
                      <div key={s.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{s.title}</h4>
                              {getStatusIcon(s.status)}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{s.description}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>{formatClock(s.duration_seconds ?? 0)}</span>
                              <span>{s.size_mb ? `${s.size_mb} MB` : "-"}</span>
                              <span>{new Date(s.submitted_at).toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getTypeColor(s.type)}>{s.type.replace("-", " ")}</Badge>
                            <Badge className={getStatusColor(s.status)}>{s.status}</Badge>
                          </div>
                        </div>

                        {(s.status === "uploading" || s.status === "processing") && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="capitalize">{s.status}...</span>
                              <span>{prog}%</span>
                            </div>
                            <Progress value={prog} className="h-2" />
                          </div>
                        )}

                        <div className="flex justify-end gap-2">
                          {s.status === "completed" && s.video_url && (
                            <>
                              <a href={s.video_url} target="_blank" rel="noreferrer">
                                <Button size="sm" variant="outline">
                                  <Play className="h-3 w-3 mr-1" /> Play
                                </Button>
                              </a>
                              <a href={s.video_url} target="_blank" rel="noreferrer">
                                <Button size="sm" variant="outline">
                                  <Eye className="h-3 w-3 mr-1" /> View
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

/** Utils */
function formatClock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.max(0, seconds % 60);
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
