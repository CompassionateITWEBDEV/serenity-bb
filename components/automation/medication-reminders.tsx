"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pill, Clock, Plus, CheckCircle } from "lucide-react"

interface Medication {
  id: string
  name: string
  dosage: string
  frequency: string
  times: string[]
  startDate: string
  endDate?: string
  instructions: string
  active: boolean
}

interface MedicationLog {
  id: string
  medicationId: string
  scheduledTime: string
  takenTime?: string
  status: "pending" | "taken" | "missed" | "skipped"
  notes?: string
}

export default function MedicationReminders() {
  const [medications, setMedications] = useState<Medication[]>([
    {
      id: "1",
      name: "Methadone",
      dosage: "40mg",
      frequency: "daily",
      times: ["08:00"],
      startDate: "2024-01-01",
      instructions: "Take with food",
      active: true,
    },
    {
      id: "2",
      name: "Multivitamin",
      dosage: "1 tablet",
      frequency: "daily",
      times: ["08:00"],
      startDate: "2024-01-01",
      instructions: "Take with breakfast",
      active: true,
    },
  ])

  const [todaySchedule, setTodaySchedule] = useState<MedicationLog[]>([
    {
      id: "1",
      medicationId: "1",
      scheduledTime: "08:00",
      takenTime: "08:15",
      status: "taken",
    },
    {
      id: "2",
      medicationId: "2",
      scheduledTime: "08:00",
      status: "pending",
    },
  ])

  const [newMedication, setNewMedication] = useState<Partial<Medication>>({
    name: "",
    dosage: "",
    frequency: "daily",
    times: ["08:00"],
    instructions: "",
    active: true,
  })

  const [showAddForm, setShowAddForm] = useState(false)

  const markAsTaken = (logId: string) => {
    setTodaySchedule((prev) =>
      prev.map((log) =>
        log.id === logId ? { ...log, status: "taken" as const, takenTime: new Date().toTimeString().slice(0, 5) } : log,
      ),
    )
  }

  const markAsSkipped = (logId: string) => {
    setTodaySchedule((prev) => prev.map((log) => (log.id === logId ? { ...log, status: "skipped" as const } : log)))
  }

  const addMedication = () => {
    if (newMedication.name && newMedication.dosage) {
      const medication: Medication = {
        id: Date.now().toString(),
        name: newMedication.name,
        dosage: newMedication.dosage,
        frequency: newMedication.frequency || "daily",
        times: newMedication.times || ["08:00"],
        startDate: new Date().toISOString().split("T")[0],
        instructions: newMedication.instructions || "",
        active: true,
      }

      setMedications((prev) => [...prev, medication])
      setNewMedication({
        name: "",
        dosage: "",
        frequency: "daily",
        times: ["08:00"],
        instructions: "",
        active: true,
      })
      setShowAddForm(false)
    }
  }

  const toggleMedication = (id: string) => {
    setMedications((prev) => prev.map((med) => (med.id === id ? { ...med, active: !med.active } : med)))
  }

  const getMedicationName = (medicationId: string) => {
    return medications.find((med) => med.id === medicationId)?.name || "Unknown"
  }

  const getMedicationDosage = (medicationId: string) => {
    return medications.find((med) => med.id === medicationId)?.dosage || ""
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Pill className="h-6 w-6 text-cyan-600" />
          <h2 className="text-2xl font-bold text-gray-900">Medication Reminders</h2>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="bg-cyan-600 hover:bg-cyan-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Medication
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todaySchedule.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{getMedicationName(log.medicationId)}</div>
                    <div className="text-sm text-gray-600">
                      {getMedicationDosage(log.medicationId)} at {log.scheduledTime}
                    </div>
                    {log.takenTime && <div className="text-xs text-green-600 mt-1">Taken at {log.takenTime}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        log.status === "taken"
                          ? "default"
                          : log.status === "pending"
                            ? "secondary"
                            : log.status === "missed"
                              ? "destructive"
                              : "outline"
                      }
                    >
                      {log.status}
                    </Badge>
                    {log.status === "pending" && (
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => markAsTaken(log.id)} className="h-8 px-2">
                          <CheckCircle className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => markAsSkipped(log.id)} className="h-8 px-2">
                          Skip
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Medications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {medications.map((medication) => (
                <div key={medication.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium">{medication.name}</h4>
                      <p className="text-sm text-gray-600">{medication.dosage}</p>
                    </div>
                    <Switch checked={medication.active} onCheckedChange={() => toggleMedication(medication.id)} />
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Frequency: {medication.frequency}</div>
                    <div>Times: {medication.times.join(", ")}</div>
                    {medication.instructions && <div>Instructions: {medication.instructions}</div>}
                  </div>
                  <Badge variant={medication.active ? "default" : "secondary"} className="mt-2">
                    {medication.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Medication</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-2 block">Medication Name</label>
                <Input
                  value={newMedication.name || ""}
                  onChange={(e) => setNewMedication((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter medication name"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Dosage</label>
                <Input
                  value={newMedication.dosage || ""}
                  onChange={(e) => setNewMedication((prev) => ({ ...prev, dosage: e.target.value }))}
                  placeholder="e.g., 40mg, 1 tablet"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Frequency</label>
                <Select
                  value={newMedication.frequency}
                  onValueChange={(value) => setNewMedication((prev) => ({ ...prev, frequency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="twice-daily">Twice Daily</SelectItem>
                    <SelectItem value="three-times-daily">Three Times Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Time</label>
                <Input
                  type="time"
                  value={newMedication.times?.[0] || "08:00"}
                  onChange={(e) => setNewMedication((prev) => ({ ...prev, times: [e.target.value] }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-2 block">Instructions</label>
                <Input
                  value={newMedication.instructions || ""}
                  onChange={(e) => setNewMedication((prev) => ({ ...prev, instructions: e.target.value }))}
                  placeholder="Special instructions (optional)"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={addMedication} className="bg-cyan-600 hover:bg-cyan-700">
                Add Medication
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
