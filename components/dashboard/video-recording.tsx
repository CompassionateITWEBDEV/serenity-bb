"use client"
import RealTimeVideoSystem from "./real-time-video-system"

interface VideoRecording {
  id: string
  title: string
  duration: string
  date: string
  size: string
  url: string
  type: "daily-checkin" | "medication" | "therapy-session" | "progress-update"
}

export function VideoRecording() {
  return <RealTimeVideoSystem />;
}
export default VideoRecording;   // ← add this
