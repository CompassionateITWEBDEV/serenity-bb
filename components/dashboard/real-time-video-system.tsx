"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Video, Upload, Clock, CheckCircle, AlertCircle, Play, Eye, Trash2 } from "lucide-react"

interface VideoSubmission {
  id: string
  title: string
  description: string
  status: "uploading" | "processing" | "completed" | "failed"
  progress: number
  duration: string
  size: string
  submittedAt: string
  processedAt?: string
  thumbnailUrl?: string
  videoUrl?: string
  type: "daily-checkin" | "medication" | "therapy-session" | "progress-update"
}

export default function RealTimeVideoSystem() {
  const [submissions, setSubmissions] = useState<VideoSubmission[]>([
    {
      id: "1",
      title: "Morning Check-in",
      description: "Daily mood and medication status",
      status: "completed",
      progress: 100,
      duration: "2:34",
      size: "12.5 MB",
      submittedAt: "2024-01-15T08:30:00Z",
      processedAt: "2024-01-15T08:32:00Z",
      type: "daily-checkin",
    },
    {
      id: "2",
      title: "Medication Compliance",
      description: "Taking prescribed medication",
      status: "processing",
      progress: 75,
      duration: "1:45",
      size: "8.2 MB",
      submittedAt: "2024-01-15T12:15:00Z",
      type: "medication",
    },
  ])

  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [currentSubmission, setCurrentSubmission] = useState<Partial<VideoSubmission>>({
    title: "",
    description: "",
    type: "daily-checkin",
  })

  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunks = useRef<Blob[]>([])

  // Real-time status updates simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setSubmissions((prev) =>
        prev.map((submission) => {
          if (submission.status === "uploading" && submission.progress < 100) {
            return { ...submission, progress: Math.min(submission.progress + 10, 100) }
          }
          if (submission.status === "uploading" && submission.progress === 100) {
            return { ...submission, status: "processing", progress: 0 }
          }
          if (submission.status === "processing" && submission.progress < 100) {
            return { ...submission, progress: Math.min(submission.progress + 15, 100) }
          }
          if (submission.status === "processing" && submission.progress === 100) {
            return {
              ...submission,
              status: "completed",
              processedAt: new Date().toISOString(),
            }
          }
          return submission
        }),
      )
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  // Recording timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>

    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRecording])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      recordedChunks.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.current.push(event.data)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
    } catch (error) {
      console.error("Error accessing camera:", error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      // Stop video stream
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
        videoRef.current.srcObject = null
      }
    }
  }

  const submitVideo = () => {
    if (recordedChunks.current.length === 0) return

    const videoBlob = new Blob(recordedChunks.current, { type: "video/webm" })
    const newSubmission: VideoSubmission = {
      id: Date.now().toString(),
      title: currentSubmission.title || "Untitled Recording",
      description: currentSubmission.description || "",
      status: "uploading",
      progress: 0,
      duration: `${Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, "0")}`,
      size: `${(videoBlob.size / (1024 * 1024)).toFixed(1)} MB`,
      submittedAt: new Date().toISOString(),
      type: currentSubmission.type as VideoSubmission["type"],
    }

    setSubmissions((prev) => [newSubmission, ...prev])
    setCurrentSubmission({ title: "", description: "", type: "daily-checkin" })
    setRecordingTime(0)
    recordedChunks.current = []
  }

  const getStatusIcon = (status: VideoSubmission["status"]) => {
    switch (status) {
      case "uploading":
      case "processing":
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusColor = (status: VideoSubmission["status"]) => {
    switch (status) {
      case "uploading":
        return "bg-blue-100 text-blue-800"
      case "processing":
        return "bg-yellow-100 text-yellow-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "failed":
        return "bg-red-100 text-red-800"
    }
  }

  const getTypeColor = (type: VideoSubmission["type"]) => {
    switch (type) {
      case "daily-checkin":
        return "bg-blue-100 text-blue-800"
      case "medication":
        return "bg-green-100 text-green-800"
      case "therapy-session":
        return "bg-purple-100 text-purple-800"
      case "progress-update":
        return "bg-orange-100 text-orange-800"
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="space-y-6">
      {/* Recording Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-red-600" />
            Real-time Video Submission
          </CardTitle>
          <CardDescription>Record and submit videos with real-time processing status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Video Preview */}
          <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
            <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
            {!isRecording && recordedChunks.current.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800/50">
                <div className="text-center text-white">
                  <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
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

          {/* Recording Controls */}
          <div className="flex justify-center gap-4">
            {!isRecording ? (
              <Button onClick={startRecording} className="bg-red-600 hover:bg-red-700">
                <Video className="h-4 w-4 mr-2" />
                Start Recording
              </Button>
            ) : (
              <Button onClick={stopRecording} variant="outline">
                <Video className="h-4 w-4 mr-2" />
                Stop Recording
              </Button>
            )}
          </div>

          {/* Submission Form */}
          {recordedChunks.current.length > 0 && !isRecording && (
            <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium">Submit Your Recording</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={currentSubmission.title}
                    onChange={(e) => setCurrentSubmission((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter video title"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <select
                    value={currentSubmission.type}
                    onChange={(e) =>
                      setCurrentSubmission((prev) => ({
                        ...prev,
                        type: e.target.value as VideoSubmission["type"],
                      }))
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
                  onChange={(e) => setCurrentSubmission((prev) => ({ ...prev, description: e.target.value }))}
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

      {/* Real-time Submissions Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            Submission Status
          </CardTitle>
          <CardDescription>Real-time tracking of your video submissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {submissions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No video submissions yet. Record your first video above!
              </p>
            ) : (
              submissions.map((submission) => (
                <div key={submission.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{submission.title}</h4>
                        {getStatusIcon(submission.status)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{submission.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{submission.duration}</span>
                        <span>{submission.size}</span>
                        <span>{new Date(submission.submittedAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getTypeColor(submission.type)}>{submission.type.replace("-", " ")}</Badge>
                      <Badge className={getStatusColor(submission.status)}>{submission.status}</Badge>
                    </div>
                  </div>

                  {/* Progress Bar for Active Submissions */}
                  {(submission.status === "uploading" || submission.status === "processing") && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">{submission.status}...</span>
                        <span>{submission.progress}%</span>
                      </div>
                      <Progress value={submission.progress} className="h-2" />
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-2">
                    {submission.status === "completed" && (
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
  )
}
