"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Circle, Clock, User, RotateCw } from "lucide-react"
import { useTreatmentProgress } from "@/hooks/useTreatmentProgress"
import type { MilestoneStatus } from "@/types/treatment"

type Props = { patientId?: string }

function StatusIcon({ status }: { status: MilestoneStatus }) {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-5 w-5 text-green-600" />
    case "in-progress":
      return <Clock className="h-5 w-5 text-yellow-600" />
    default:
      return <Circle className="h-5 w-5 text-gray-400" />
  }
}

function StatusBadge({ status }: { status: MilestoneStatus }) {
  switch (status) {
    case "completed":
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Completed</Badge>
    case "in-progress":
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">In Progress</Badge>
    default:
      return <Badge variant="outline">Upcoming</Badge>
  }
}

export function TreatmentProgress({ patientId }: Props) {
  const { loading, error, milestones, patient, isNewPatient, refetch } = useTreatmentProgress(patientId)

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <div className="bg-cyan-100 p-2 rounded-lg">
            <CheckCircle className="h-5 w-5 text-cyan-600" />
          </div>
          Treatment Progress
        </CardTitle>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm text-gray-700">
            <User className="h-4 w-4" />
            <span className="max-w-[200px] truncate">{patient?.full_name ?? "Current Patient"}</span>
          </div>
          {isNewPatient ? (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">New Patient</Badge>
          ) : (
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Existing Patient</Badge>
          )}
          <button
            onClick={refetch}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border hover:bg-gray-50"
            title="Refresh"
          >
            <RotateCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-4">
                <div className="h-5 w-5 rounded-full bg-gray-200 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-2/3 bg-gray-200 rounded animate-pulse" />
                  <div className="h-2 w-full bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : milestones.length === 0 ? (
          <div className="text-sm text-gray-600">
            {isNewPatient ? "No milestones yet. Add the initial assessment to get started." : "No milestones found."}
          </div>
        ) : (
          <div className="space-y-6">
            {milestones.map((m) => (
              <div key={m.id} className="flex items-start space-x-4">
                <div className="flex-shrink-0 mt-1">
                  <StatusIcon status={m.status} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium text-gray-900">{m.title}</h4>
                    <StatusBadge status={m.status} />
                  </div>
                  {m.description && <p className="text-sm text-gray-600 mb-2">{m.description}</p>}
                  {m.date && <p className="text-xs text-gray-500">{m.date}</p>}
                  {typeof m.progress === "number" && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{m.progress}%</span>
                      </div>
                      <Progress value={m.progress} className="h-2" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
