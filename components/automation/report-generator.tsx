"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { FileText, Download, Calendar, TrendingUp, BarChart3, Clock } from "lucide-react"

interface ReportTemplate {
  id: string
  name: string
  type: "progress" | "medication" | "appointments" | "wellness" | "comprehensive"
  frequency: "daily" | "weekly" | "monthly" | "quarterly"
  recipients: string[]
  lastGenerated: string
  nextScheduled: string
  automated: boolean
}

interface GeneratedReport {
  id: string
  templateId: string
  name: string
  type: string
  generatedAt: string
  status: "generating" | "completed" | "failed"
  fileSize: string
  downloadUrl?: string
}

export default function ReportGenerator() {
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([
    {
      id: "1",
      name: "Weekly Progress Summary",
      type: "progress",
      frequency: "weekly",
      recipients: ["patient@example.com", "doctor@clinic.com"],
      lastGenerated: "2024-01-08T09:00:00Z",
      nextScheduled: "2024-01-15T09:00:00Z",
      automated: true,
    },
    {
      id: "2",
      name: "Monthly Medication Adherence",
      type: "medication",
      frequency: "monthly",
      recipients: ["patient@example.com", "nurse@clinic.com"],
      lastGenerated: "2024-01-01T10:00:00Z",
      nextScheduled: "2024-02-01T10:00:00Z",
      automated: true,
    },
    {
      id: "3",
      name: "Appointment History Report",
      type: "appointments",
      frequency: "monthly",
      recipients: ["patient@example.com"],
      lastGenerated: "2024-01-01T11:00:00Z",
      nextScheduled: "2024-02-01T11:00:00Z",
      automated: false,
    },
    {
      id: "4",
      name: "Comprehensive Recovery Report",
      type: "comprehensive",
      frequency: "quarterly",
      recipients: ["patient@example.com", "doctor@clinic.com", "counselor@clinic.com"],
      lastGenerated: "2024-01-01T12:00:00Z",
      nextScheduled: "2024-04-01T12:00:00Z",
      automated: true,
    },
  ])

  const [recentReports, setRecentReports] = useState<GeneratedReport[]>([
    {
      id: "1",
      templateId: "1",
      name: "Weekly Progress Summary - Jan 8-14",
      type: "progress",
      generatedAt: "2024-01-15T09:00:00Z",
      status: "completed",
      fileSize: "2.3 MB",
      downloadUrl: "/reports/weekly-progress-jan-8-14.pdf",
    },
    {
      id: "2",
      templateId: "2",
      name: "Monthly Medication Adherence - December",
      type: "medication",
      generatedAt: "2024-01-01T10:00:00Z",
      status: "completed",
      fileSize: "1.8 MB",
      downloadUrl: "/reports/medication-adherence-dec.pdf",
    },
    {
      id: "3",
      templateId: "4",
      name: "Comprehensive Recovery Report - Q4 2023",
      type: "comprehensive",
      generatedAt: "2024-01-01T12:00:00Z",
      status: "completed",
      fileSize: "5.7 MB",
      downloadUrl: "/reports/comprehensive-q4-2023.pdf",
    },
  ])

  const [reportData, setReportData] = useState({
    medicationAdherence: 88,
    appointmentAttendance: 92,
    wellnessScore: 7.2,
    activitiesCompleted: 15,
    totalAppointments: 12,
    missedAppointments: 1,
    averageMoodScore: 6.8,
    recoveryMilestones: 3,
  })

  const toggleAutomation = (templateId: string) => {
    setReportTemplates((prev) =>
      prev.map((template) => (template.id === templateId ? { ...template, automated: !template.automated } : template)),
    )
  }

  const generateReport = (templateId: string) => {
    const template = reportTemplates.find((t) => t.id === templateId)
    if (!template) return

    const newReport: GeneratedReport = {
      id: Date.now().toString(),
      templateId,
      name: `${template.name} - ${new Date().toLocaleDateString()}`,
      type: template.type,
      generatedAt: new Date().toISOString(),
      status: "generating",
      fileSize: "Generating...",
    }

    setRecentReports((prev) => [newReport, ...prev])

    // Simulate report generation
    setTimeout(() => {
      setRecentReports((prev) =>
        prev.map((report) =>
          report.id === newReport.id
            ? {
                ...report,
                status: "completed" as const,
                fileSize: `${(Math.random() * 5 + 1).toFixed(1)} MB`,
                downloadUrl: `/reports/${template.type}-${Date.now()}.pdf`,
              }
            : report,
        ),
      )
    }, 3000)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "progress":
        return <TrendingUp className="h-4 w-4" />
      case "medication":
        return <Clock className="h-4 w-4" />
      case "appointments":
        return <Calendar className="h-4 w-4" />
      case "comprehensive":
        return <BarChart3 className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600"
      case "generating":
        return "text-blue-600"
      case "failed":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-cyan-600" />
        <h2 className="text-2xl font-bold text-gray-900">Automated Report Generation</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Report Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportTemplates.map((template) => (
                  <div key={template.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(template.type)}
                        <div>
                          <h4 className="font-medium">{template.name}</h4>
                          <p className="text-sm text-gray-600">
                            {template.frequency} • {template.recipients.length} recipient(s)
                          </p>
                        </div>
                      </div>
                      <Switch checked={template.automated} onCheckedChange={() => toggleAutomation(template.id)} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Last generated:</span>
                        <span>{new Date(template.lastGenerated).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Next scheduled:</span>
                        <span>{new Date(template.nextScheduled).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex gap-2">
                        <Badge variant="outline" className="capitalize">
                          {template.type}
                        </Badge>
                        <Badge variant={template.automated ? "default" : "secondary"}>
                          {template.automated ? "Automated" : "Manual"}
                        </Badge>
                      </div>
                      <Button size="sm" onClick={() => generateReport(template.id)} className="h-8">
                        Generate Now
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Period Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Medication Adherence</span>
                    <span className="text-sm font-bold">{reportData.medicationAdherence}%</span>
                  </div>
                  <Progress value={reportData.medicationAdherence} className="h-2" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Appointment Attendance</span>
                    <span className="text-sm font-bold">{reportData.appointmentAttendance}%</span>
                  </div>
                  <Progress value={reportData.appointmentAttendance} className="h-2" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Wellness Score</span>
                    <span className="text-sm font-bold">{reportData.wellnessScore}/10</span>
                  </div>
                  <Progress value={(reportData.wellnessScore / 10) * 100} className="h-2" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Activities Completed</span>
                    <span className="text-sm font-bold">{reportData.activitiesCompleted}</span>
                  </div>
                  <Progress value={Math.min(100, (reportData.activitiesCompleted / 20) * 100)} className="h-2" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3 mt-6 pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-600">{reportData.totalAppointments}</div>
                  <div className="text-sm text-gray-600">Total Appointments</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{reportData.recoveryMilestones}</div>
                  <div className="text-sm text-gray-600">Milestones Reached</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{reportData.averageMoodScore}</div>
                  <div className="text-sm text-gray-600">Average Mood</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentReports.map((report) => (
                <div key={report.id} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-start gap-2 mb-2">
                    {getTypeIcon(report.type)}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{report.name}</h4>
                      <p className="text-xs text-gray-500">{new Date(report.generatedAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${getStatusColor(report.status)}`}>{report.status}</span>
                      <span className="text-xs text-gray-500">{report.fileSize}</span>
                    </div>
                    {report.status === "completed" && report.downloadUrl && (
                      <Button size="sm" variant="ghost" className="h-6 px-2">
                        <Download className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {report.status === "generating" && (
                    <div className="mt-2">
                      <Progress value={65} className="h-1" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
