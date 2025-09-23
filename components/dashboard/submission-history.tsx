// ./components/dashboard/submission-history.tsx
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, Pill, Activity, Heart, Brain, Plus, CheckCircle, AlertCircle, Play } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

type EntryType = "medication" | "activity" | "mood" | "symptom" | "vitals" | "video"
type EntryStatus = "completed" | "missed" | "partial"

interface SubmissionEntry {
  id: string
  type: EntryType
  title: string
  description: string
  timestamp: string
  status: EntryStatus
  value?: string
  notes?: string
  // video-only extras
  videoUrl?: string | null
  videoStatus?: "uploading" | "processing" | "completed" | "failed"
}

type VideoRow = {
  id: string
  visitor_id: string | null
  patient_id: string | null
  title: string
  description: string | null
  type: "daily-checkin" | "medication" | "therapy-session" | "progress-update"
  status: "uploading" | "processing" | "completed" | "failed"
  video_url: string | null
  size_mb: number | null
  duration_seconds: number | null
  submitted_at: string
}

const VIDEO_BUCKET = "videos"

/* same guest id logic as recorder; keeps the owner filter aligned */
function getGuestId(): string {
  try {
    const KEY = "src-guest-id"
    const v = localStorage.getItem(KEY)
    if (v) return v
    const id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
    return id
  } catch {
    return `guest-${Math.random().toString(36).slice(2, 10)}`
  }
}

export function SubmissionHistory() {
  const ownerVal = getGuestId()
  const ownerCol = "visitor_id"

  const [entries, setEntries] = useState<SubmissionEntry[]>([
    // your seed examples (kept)
    {
      id: "1",
      type: "medication",
      title: "Methadone 40mg",
      description: "Morning dose",
      timestamp: "2024-01-15T08:00:00",
      status: "completed",
      notes: "Taken with breakfast, no side effects",
    },
    {
      id: "2",
      type: "activity",
      title: "Group Therapy Session",
      description: "Addiction recovery group",
      timestamp: "2024-01-15T14:00:00",
      status: "completed",
      notes: "Discussed coping strategies, felt supported",
    },
    {
      id: "3",
      type: "mood",
      title: "Daily Mood Check",
      description: "Mood assessment",
      timestamp: "2024-01-15T20:00:00",
      status: "completed",
      value: "7/10",
      notes: "Feeling optimistic about recovery",
    },
    {
      id: "4",
      type: "medication",
      title: "Methadone 40mg",
      description: "Evening dose",
      timestamp: "2024-01-14T20:00:00",
      status: "missed",
      notes: "Forgot to take, will discuss with counselor",
    },
    {
      id: "5",
      type: "vitals",
      title: "Blood Pressure Check",
      description: "Weekly vitals monitoring",
      timestamp: "2024-01-14T10:00:00",
      status: "completed",
      value: "120/80 mmHg",
      notes: "Normal range, stable",
    },
  ])

  const [showAddForm, setShowAddForm] = useState(false)
  const [newEntry, setNewEntry] = useState({
    type: "medication" as EntryType,
    title: "",
    description: "",
    value: "",
    notes: "",
  })

  // ---- Video integration: initial load + realtime ----
  useEffect(() => {
    let alive = true

    const mapVideoToEntry = (r: VideoRow): SubmissionEntry => ({
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
    })

    async function load() {
      const { data, error } = await supabase
        .from("video_submissions")
        .select(
          "id, visitor_id, patient_id, title, description, type, status, video_url, size_mb, duration_seconds, submitted_at",
        )
        .eq(ownerCol, ownerVal)
        .order("submitted_at", { ascending: false })
      if (error) {
        console.warn("[history] video_submissions load error:", error.message)
        return
      }
      const vids = (data as VideoRow[]).map(mapVideoToEntry)
      if (!alive) return
      setEntries((prev) => upsertMany(prev, vids))
    }

    load()

    const ch = supabase
      .channel(`video_subs_history_${ownerVal}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "video_submissions", filter: `${ownerCol}=eq.${ownerVal}` },
        (payload) => {
          const row = (payload.new || payload.old) as VideoRow
          if (!row) return
          const entry = mapVideoToEntry(row)
          setEntries((prev) => upsertOne(prev, entry))
        },
      )
      .subscribe()

    return () => {
      alive = false
      ch.unsubscribe()
    }
  }, [ownerVal])

  // ---- helpers to upsert entries by id and keep sorted ----
  function upsertOne(list: SubmissionEntry[], e: SubmissionEntry) {
    const next = [...list.filter((x) => x.id !== e.id), e]
    return sortByTimeDesc(next)
  }
  function upsertMany(list: SubmissionEntry[], es: SubmissionEntry[]) {
    const map = new Map<string, SubmissionEntry>()
    ;[...list, ...es].forEach((x) => map.set(x.id, x))
    return sortByTimeDesc([...map.values()])
  }
  function sortByTimeDesc(list: SubmissionEntry[]) {
    return [...list].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  const getTypeIcon = (type: EntryType) => {
    switch (type) {
      case "medication":
        return <Pill className="h-4 w-4" />
      case "activity":
        return <Activity className="h-4 w-4" />
      case "mood":
        return <Brain className="h-4 w-4" />
      case "symptom":
        return <AlertCircle className="h-4 w-4" />
      case "vitals":
        return <Heart className="h-4 w-4" />
      case "video":
        return <Play className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: EntryType) => {
    switch (type) {
      case "medication":
        return "bg-blue-100 text-blue-800"
      case "activity":
        return "bg-green-100 text-green-800"
      case "mood":
        return "bg-purple-100 text-purple-800"
      case "symptom":
        return "bg-red-100 text-red-800"
      case "vitals":
        return "bg-orange-100 text-orange-800"
      case "video":
        return "bg-cyan-100 text-cyan-800"
    }
  }

  const getStatusColor = (status: EntryStatus) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "missed":
        return "bg-red-100 text-red-800"
      case "partial":
        return "bg-yellow-100 text-yellow-800"
    }
  }

  const getStatusIcon = (status: EntryStatus) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-3 w-3" />
      case "missed":
        return <AlertCircle className="h-3 w-3" />
      case "partial":
        return <Clock className="h-3 w-3" />
    }
  }

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
  }

  const handleAddEntry = () => {
    if (newEntry.title && newEntry.description) {
      const entry: SubmissionEntry = {
        id: Date.now().toString(),
        type: newEntry.type,
        title: newEntry.title,
        description: newEntry.description,
        timestamp: new Date().toISOString(),
        status: "completed",
        value: newEntry.value || undefined,
        notes: newEntry.notes || undefined,
      }
      setEntries((cur) => sortByTimeDesc([entry, ...cur]))
      setNewEntry({ type: "medication", title: "", description: "", value: "", notes: "" })
      setShowAddForm(false)
    }
  }

  // group by date (label)
  const groupedEntries = useMemo(() => {
    return entries.reduce((acc, entry) => {
      const date = new Date(entry.timestamp).toLocaleDateString()
      ;(acc[date] ||= []).push(entry)
      return acc
    }, {} as Record<string, SubmissionEntry[]>)
  }, [entries])

  return (
    <div className="space-y-6">
      {/* Add New Entry */}
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
                <Select
                  value={newEntry.type}
                  onValueChange={(value: EntryType) => setNewEntry({ ...newEntry, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medication">Medication</SelectItem>
                    <SelectItem value="activity">Activity</SelectItem>
                    <SelectItem value="mood">Mood</SelectItem>
                    <SelectItem value="symptom">Symptom</SelectItem>
                    <SelectItem value="vitals">Vitals</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Title</label>
                <Input
                  value={newEntry.title}
                  onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                  placeholder="e.g., Methadone 40mg"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Input
                value={newEntry.description}
                onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                placeholder="e.g., Morning dose"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Value (optional)</label>
              <Input
                value={newEntry.value}
                onChange={(e) => setNewEntry({ ...newEntry, value: e.target.value })}
                placeholder="e.g., 7/10, 120/80 mmHg"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Notes</label>
              <Textarea
                value={newEntry.notes}
                onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                placeholder="Additional notes or observations"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddEntry}>Add Entry</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* History Timeline */}
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
                    .map((entry) => {
                      const { time } = formatDateTime(entry.timestamp)
                      const isVideo = entry.type === "video"
                      return (
                        <div key={entry.id} className="flex items-start gap-4 p-4 border rounded-lg">
                          <div className="flex-shrink-0 mt-1">{getTypeIcon(entry.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{entry.title}</h4>
                              <Badge className={getTypeColor(entry.type)}>{entry.type}</Badge>
                              <Badge className={getStatusColor(entry.status)} variant="outline">
                                {getStatusIcon(entry.status)}
                                {entry.status}
                              </Badge>
                              {isVideo && entry.videoStatus && (
                                <Badge variant="outline" className="capitalize">
                                  {entry.videoStatus}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{entry.description}</p>

                            {/* video extra meta */}
                            {isVideo && (
                              <div className="text-xs text-gray-600 mb-2">
                                {entry.value ? <span>{entry.value}</span> : null}
                              </div>
                            )}

                            {/* common optional fields */}
                            {entry.value && !isVideo && (
                              <p className="text-sm font-medium text-blue-600 mb-2">Value: {entry.value}</p>
                            )}
                            {entry.notes && <p className="text-sm text-gray-500 italic">{entry.notes}</p>}

                            {/* video player link */}
                            {isVideo && entry.videoUrl && (
                              <div className="mt-2">
                                <a href={entry.videoUrl} target="_blank" rel="noreferrer">
                                  <Button size="sm" variant="outline">
                                    <Play className="h-3 w-3 mr-1" />
                                    Open video
                                  </Button>
                                </a>
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0 text-sm text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {time}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  )
}
