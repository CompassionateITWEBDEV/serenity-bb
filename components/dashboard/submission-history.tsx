"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, Pill, Activity, Heart, Brain, Plus, CheckCircle, AlertCircle } from "lucide-react"

interface SubmissionEntry {
  id: string
  type: "medication" | "activity" | "mood" | "symptom" | "vitals"
  title: string
  description: string
  timestamp: string
  status: "completed" | "missed" | "partial"
  value?: string
  notes?: string
}

export function SubmissionHistory() {
  const [entries, setEntries] = useState<SubmissionEntry[]>([
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
    type: "medication" as SubmissionEntry["type"],
    title: "",
    description: "",
    value: "",
    notes: "",
  })

  const getTypeIcon = (type: SubmissionEntry["type"]) => {
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
    }
  }

  const getTypeColor = (type: SubmissionEntry["type"]) => {
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
    }
  }

  const getStatusColor = (status: SubmissionEntry["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "missed":
        return "bg-red-100 text-red-800"
      case "partial":
        return "bg-yellow-100 text-yellow-800"
    }
  }

  const getStatusIcon = (status: SubmissionEntry["status"]) => {
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

      setEntries([entry, ...entries])
      setNewEntry({
        type: "medication",
        title: "",
        description: "",
        value: "",
        notes: "",
      })
      setShowAddForm(false)
    }
  }

  const groupedEntries = entries.reduce(
    (acc, entry) => {
      const date = new Date(entry.timestamp).toLocaleDateString()
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(entry)
      return acc
    },
    {} as Record<string, SubmissionEntry[]>,
  )

  return (
    <div className="space-y-6">
      {/* Add New Entry */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Submission History</CardTitle>
              <CardDescription>Track medication, activities, mood, and health metrics</CardDescription>
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
                  onValueChange={(value: SubmissionEntry["type"]) => setNewEntry({ ...newEntry, type: value })}
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
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{entry.description}</p>
                            {entry.value && (
                              <p className="text-sm font-medium text-blue-600 mb-2">Value: {entry.value}</p>
                            )}
                            {entry.notes && <p className="text-sm text-gray-500 italic">{entry.notes}</p>}
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
