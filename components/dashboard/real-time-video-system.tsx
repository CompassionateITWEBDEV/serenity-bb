// /components/dashboard/real-time-video-system.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Video as VideoIcon, Upload, Clock, CheckCircle, AlertCircle, Play, Eye, Trash2 } from "lucide-react";

const AUTO_SUBMIT_ON_STOP = true; // auto-create a submission when you stop

interface VideoSubmission {
  id: string;
  title: string;
  description: string;
  status: "uploading" | "processing" | "completed" | "failed";
  progress: number;
  duration: string;
  size: string;
  submittedAt: string;
  processedAt?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  type: "daily-checkin" | "medication" | "therapy-session" | "progress-update";
}

export default function RealTimeVideoSystem() {
  const [submissions, setSubmissions] = useState<VideoSubmission[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentSubmission, setCurrentSubmission] = useState<Partial<VideoSubmission>>({
    title: "",
    description: "",
    type: "daily-checkin",
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const lastBlobRef = useRef<Blob | null>(null);

  // Simulated realtime processing
  useEffect(() => {
    const interval = setInterval(() => {
      setSubmissions((prev) =>
        prev.map((s) => {
          if (s.status === "uploading" && s.progress < 100) return { ...s, progress: Math.min(s.progress + 10, 100) };
          if (s.status === "uploading" && s.progress === 100) return { ...s, status: "processing", progress: 0 };
          if (s.status === "processing" && s.progress < 100) return { ...s, progress: Math.min(s.progress + 15, 100) };
          if (s.status === "processing" && s.progress === 100)
            return { ...s, status: "completed", processedAt: new Date().toISOString(), progress: 100 };
          return s;
        })
      );
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  // Recording timer
  useEffect(() => {
    let h: any;
    if (isRecording) h = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    return () => clearInterval(h);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) videoRef.current.srcObject = stream;

      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      recordedChunks.current = [];
      lastBlobRef.current = null;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.current.push(e.data);
      };

      mr.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    mediaRecorderRef.current.stop();
    setIsRecording(false);

    // stop stream
    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    }

    // prepare blob
    if (recordedChunks.current.length > 0) {
      const blob = new Blob(recordedChunks.current, { type: "video/webm" });
      lastBlobRef.current = blob;

      if (AUTO_SUBMIT_ON_STOP) {
        // immediately create a submission so user sees it right away
        createSubmissionFromBlob(blob, currentSubmission.title, currentSubmission.description, currentSubmission.type);
      }
    }
  };

  const submitVideo = () => {
    // manual submit (if AUTO_SUBMIT_ON_STOP=false or user edits title first)
    if (!lastBlobRef.current) return;
    createSubmissionFromBlob(
      lastBlobRef.current,
      currentSubmission.title,
      currentSubmission.description,
      currentSubmission.type
    );
  };

  function createSubmissionFromBlob(
    blob: Blob,
    title?: string,
    description?: string,
    type?: VideoSubmission["type"]
  ) {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const duration = `${Math.floor(recordingTime / 60)}:${String(recordingTime % 60).padStart(2, "0")}`;
    const size = `${(blob.size / (1024 * 1024)).toFixed(1)} MB`;

    const row: VideoSubmission = {
      id,
      title: (title || "").trim() || "Untitled Recording",
      description: (description || "").trim(),
      status: "uploading",
      progress: 1,
      duration,
      size,
      submittedAt: new Date().toISOString(),
      type: (type as VideoSubmission["type"]) || "daily-checkin",
    };

    setSubmissions((prev) => [row, ...prev]);

    // reset form/buffer
    setCurrentSubmission({ title: "", description: "", type: "daily-checkin" });
    setRecordingTime(0);
    recordedChunks.current = [];
    lastBlobRef.current = null;
  }

  const getStatusIcon = (status: VideoSubmission["status"]) => {
    if (status === "completed") return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === "failed") return <AlertCircle className="h-4 w-4 text-red-500" />;
    return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
  };

  const getStatusColor = (status: VideoSubmission["status"]) => {
    switch (status) {
      case "uploading":
        return "bg-blue-100 text-blue-800";
      case "processing":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
    }
  };

  const getTypeColor = (type: VideoSubmission["type"]) => {
    switch (type) {
      case "daily-checkin":
        return "bg-blue-100 text-blue-800";
      case "medication":
        return "bg-green-100 text-green-800";
      case "therapy-session":
        return "bg-purple-100 text-purple-800";
      case "progress-update":
        return "bg-orange-100 text-orange-800";
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <VideoIcon className="h-5 w-5 text-red-600" />
            Real-time Video Submission
          </CardTitle>
          <CardDescription>Record and submit videos with real-time status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
            <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
            {!isRecording && recordedChunks.current.length === 0 && !lastBlobRef.current && (
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
                REC {formatTime(recordingTime)}
              </div>
            )}
          </div>

          <div className="flex justify-center gap-4">
            {!isRecording ? (
              <Button onClick={startRecording} className="bg-red-600 hover:bg-red-700">
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

          {/* Manual submit still available when auto-submit is disabled */}
          {lastBlobRef.current && !isRecording && !AUTO_SUBMIT_ON_STOP && (
            <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium">Submit Your Recording</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={currentSubmission.title}
                    onChange={(e) => setCurrentSubmission((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Enter video title"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <select
                    value={currentSubmission.type}
                    onChange={(e) =>
                      setCurrentSubmission((p) => ({ ...p, type: e.target.value as VideoSubmission["type"] }))
                    }
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
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={currentSubmission.description}
                  onChange={(e) => setCurrentSubmission((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Describe your video content"
                  rows={3}
                />
              </div>
              <Button onClick={submitVideo} className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Submit Video
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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
            {submissions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No video submissions yet.</p>
            ) : (
              submissions.map((s) => (
                <div key={s.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{s.title}</h4>
                        {getStatusIcon(s.status)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{s.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{s.duration}</span>
                        <span>{s.size}</span>
                        <span>{new Date(s.submittedAt).toLocaleString()}</span>
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
                        <span>{s.progress}%</span>
                      </div>
                      <Progress value={s.progress} className="h-2" />
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    {s.status === "completed" && (
                      <>
                        <Button size="sm" variant="outline">
                          <Play className="h-3 w-3 mr-1" />
                          Play
                        </Button>
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3 mr-1" />
                          View Details
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 bg-transparent">
                      <Trash2 className="h-3 w-3" />
                    </Button>
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

function getStatusIcon(status: VideoSubmission["status"]) {
  if (status === "completed") return <CheckCircle className="h-4 w-4 text-green-500" />;
  if (status === "failed") return <AlertCircle className="h-4 w-4 text-red-500" />;
  return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
}
function getStatusColor(status: VideoSubmission["status"]) {
  switch (status) {
    case "uploading":
      return "bg-blue-100 text-blue-800";
    case "processing":
      return "bg-yellow-100 text-yellow-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "failed":
      return "bg-red-100 text-red-800";
  }
}
function getTypeColor(type: VideoSubmission["type"]) {
  switch (type) {
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
