"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Bell, Activity, Heart, Pill, Calendar, TrendingUp } from "lucide-react"

interface PatientStatus {
  id: string
  patient_id: string
  medication_taken: boolean
  mood_rating: number
  energy_level: number
  pain_level: number
  notes: string
  timestamp: string
  treatment_progress: number
}

interface TreatmentMilestone {
  id: string
  title: string
  description: string
  completed: boolean
  completion_date?: string
  target_date: string
}

export default function RealTimeStatusTracker() {
  const [currentStatus, setCurrentStatus] = useState<PatientStatus>({
    id: "",
    patient_id: "current-patient",
    medication_taken: false,
    mood_rating: 5,
    energy_level: 5,
    pain_level: 3,
    notes: "",
    timestamp: new Date().toISOString(),
    treatment_progress: 65,
  })

  const [statusHistory, setStatusHistory] = useState<PatientStatus[]>([])
  const [milestones, setMilestones] = useState<TreatmentMilestone[]>([
    {
      id: "1",
      title: "Initial Assessment Complete",
      description: "Completed comprehensive intake and medical evaluation",
      completed: true,
      completion_date: "2024-01-15",
      target_date: "2024-01-15",
    },
    {
      id: "2",
      title: "Treatment Plan Established",
      description: "Personalized treatment plan created with healthcare team",
      completed: true,
      completion_date: "2024-01-18",
      target_date: "2024-01-18",
    },
    {
      id: "3",
      title: "30-Day Progress Review",
      description: "First major progress evaluation and plan adjustment",
      completed: false,
      target_date: "2024-02-15",
    },
    {
      id: "4",
      title: "Halfway Milestone",
      description: "Reached 50% completion of treatment program",
      completed: false,
      target_date: "2024-03-01",
    },
  ])

  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate receiving real-time updates
      const mockUpdate = {
        ...currentStatus,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        treatment_progress: Math.min(currentStatus.treatment_progress + Math.random() * 2, 100),
      }

      setStatusHistory((prev) => [mockUpdate, ...prev.slice(0, 9)]) // Keep last 10 entries
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [currentStatus])

  const handleStatusUpdate = async () => {
    setIsUpdating(true)

    try {
      const updatedStatus = {
        ...currentStatus,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
      }

      setStatusHistory((prev) => [updatedStatus, ...prev.slice(0, 9)])

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (error) {
      console.error("Failed to update status:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusColor = (value: number, type: "mood" | "energy" | "pain") => {
    if (type === "pain") {
      return value <= 3 ? "bg-green-500" : value <= 6 ? "bg-yellow-500" : "bg-red-500"
    }
    return value >= 7 ? "bg-green-500" : value >= 4 ? "bg-yellow-500" : "bg-red-500"
  }

  return (
    <div className="space-y-6">
      {/* Current Status Update */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyan-600" />
            Update Your Status
          </CardTitle>
          <CardDescription>Track your daily progress and help your care team monitor your recovery</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mood Rating (1-10)</label>
              <Input
                type="number"
                min="1"
                max="10"
                value={currentStatus.mood_rating}
                onChange={(e) =>
                  setCurrentStatus((prev) => ({
                    ...prev,
                    mood_rating: Number.parseInt(e.target.value) || 1,
                  }))
                }
              />
              <div className={`h-2 rounded-full ${getStatusColor(currentStatus.mood_rating, "mood")}`} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Energy Level (1-10)</label>
              <Input
                type="number"
                min="1"
                max="10"
                value={currentStatus.energy_level}
                onChange={(e) =>
                  setCurrentStatus((prev) => ({
                    ...prev,
                    energy_level: Number.parseInt(e.target.value) || 1,
                  }))
                }
              />
              <div className={`h-2 rounded-full ${getStatusColor(currentStatus.energy_level, "energy")}`} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Pain Level (1-10)</label>
              <Input
                type="number"
                min="1"
                max="10"
                value={currentStatus.pain_level}
                onChange={(e) =>
                  setCurrentStatus((prev) => ({
                    ...prev,
                    pain_level: Number.parseInt(e.target.value) || 1,
                  }))
                }
              />
              <div className={`h-2 rounded-full ${getStatusColor(currentStatus.pain_level, "pain")}`} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Pill className="h-4 w-4" />
              Medication Taken Today
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={currentStatus.medication_taken}
                onChange={(e) =>
                  setCurrentStatus((prev) => ({
                    ...prev,
                    medication_taken: e.target.checked,
                  }))
                }
                className="rounded"
              />
              <span className="text-sm">Yes, I've taken my prescribed medication</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Additional Notes</label>
            <Textarea
              placeholder="How are you feeling today? Any concerns or observations..."
              value={currentStatus.notes}
              onChange={(e) =>
                setCurrentStatus((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
              }
              rows={3}
            />
          </div>

          <Button onClick={handleStatusUpdate} disabled={isUpdating} className="w-full">
            {isUpdating ? "Updating..." : "Update Status"}
          </Button>
        </CardContent>
      </Card>

      {/* Treatment Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Treatment Progress
          </CardTitle>
          <CardDescription>Your overall progress through the recovery program</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-gray-600">{Math.round(currentStatus.treatment_progress)}%</span>
            </div>
            <Progress value={currentStatus.treatment_progress} className="h-3" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {milestones.map((milestone) => (
                <div key={milestone.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                  <div
                    className={`w-4 h-4 rounded-full mt-1 ${milestone.completed ? "bg-green-500" : "bg-gray-300"}`}
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{milestone.title}</h4>
                    <p className="text-xs text-gray-600 mt-1">{milestone.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Calendar className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        Target: {new Date(milestone.target_date).toLocaleDateString()}
                      </span>
                      {milestone.completed && milestone.completion_date && (
                        <Badge variant="secondary" className="text-xs">
                          Completed {new Date(milestone.completion_date).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Status History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            Recent Updates
          </CardTitle>
          <CardDescription>Your recent status submissions and progress updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {statusHistory.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No status updates yet. Submit your first update above!
              </p>
            ) : (
              statusHistory.map((status) => (
                <div key={status.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      <span className="text-sm">Mood: {status.mood_rating}/10</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Energy: {status.energy_level}/10</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Pill className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">{status.medication_taken ? "Meds ✓" : "Meds ✗"}</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">{new Date(status.timestamp).toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
