"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Bot, 
  Calendar, 
  Clock, 
  Bell, 
  Activity, 
  TrendingUp, 
  Settings, 
  Zap,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Smartphone,
  Mail,
  MessageSquare
} from "lucide-react"
import AppointmentReminders from "@/components/automation/appointment-reminders"
import MedicationReminders from "@/components/automation/medication-reminders"
import ProgressAutomation from "@/components/automation/progress-automation"
import NotificationCenter from "@/components/automation/notification-center"
import ReportGenerator from "@/components/automation/report-generator"

type AutomationStats = {
  totalReminders: number
  activeReminders: number
  completedToday: number
  upcomingAppointments: number
  automationHealth: number
  lastActivity: string
}

export default function AutomationPage() {
  const { patient, isAuthenticated, loading } = useAuth()
  const [stats, setStats] = useState<AutomationStats>({
    totalReminders: 0,
    activeReminders: 0,
    completedToday: 0,
    upcomingAppointments: 0,
    automationHealth: 0,
    lastActivity: "Never"
  })
  const [refreshing, setRefreshing] = useState(false)
  const [realtimeStatus, setRealtimeStatus] = useState<"connected" | "disconnected" | "connecting">("connecting")

  const loadStats = useCallback(async () => {
    if (!patient?.id) return

    try {
      setRefreshing(true)
      
      // Get appointment data
      const { data: appointments } = await supabase
        .from("appointments")
        .select("*")
        .eq("patient_id", patient.id)
        .gte("appointment_time", new Date().toISOString())
        .order("appointment_time", { ascending: true })

      // Get reminder data
      const { data: reminders } = await supabase
        .from("reminders")
        .select("*")
        .eq("user_id", patient.id)

      // Calculate stats
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const tomorrow = new Date(today.getTime() + 86400000)

      const completedToday = reminders?.filter(r => 
        r.status === "sent" && 
        new Date(r.scheduled_for) >= today && 
        new Date(r.scheduled_for) < tomorrow
      ).length || 0

      const activeReminders = reminders?.filter(r => r.status === "scheduled").length || 0
      const totalReminders = reminders?.length || 0
      const upcomingAppointments = appointments?.length || 0

      // Calculate automation health (0-100)
      const healthScore = Math.min(100, Math.max(0, 
        (activeReminders * 20) + 
        (upcomingAppointments * 10) + 
        (completedToday * 5)
      ))

      setStats({
        totalReminders,
        activeReminders,
        completedToday,
        upcomingAppointments,
        automationHealth: healthScore,
        lastActivity: reminders?.length ? 
          new Date(Math.max(...reminders.map(r => new Date(r.scheduled_for).getTime()))).toLocaleString() : 
          "Never"
      })

      setRealtimeStatus("connected")
    } catch (error) {
      console.error("Error loading automation stats:", error)
      setRealtimeStatus("disconnected")
    } finally {
      setRefreshing(false)
    }
  }, [patient?.id])

  // Real-time updates
  useEffect(() => {
    if (!patient?.id) return

    loadStats()

    // Set up real-time subscriptions
    const appointmentChannel = supabase
      .channel(`automation_appointments_${patient.id}`)
      .on("postgres_changes", 
        { event: "*", schema: "public", table: "appointments", filter: `patient_id=eq.${patient.id}` },
        () => loadStats()
      )
      .subscribe()

    const reminderChannel = supabase
      .channel(`automation_reminders_${patient.id}`)
      .on("postgres_changes", 
        { event: "*", schema: "public", table: "reminders", filter: `user_id=eq.${patient.id}` },
        () => loadStats()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(appointmentChannel)
      supabase.removeChannel(reminderChannel)
    }
  }, [patient?.id, loadStats])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading automation center...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !patient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Please sign in to access the automation center</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Header */}
      <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="bg-gradient-to-br from-purple-500 to-blue-600 p-4 rounded-2xl shadow-lg">
                  <Bot className="h-8 w-8 text-white" />
                </div>
                <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                  realtimeStatus === "connected" ? "bg-green-500" : 
                  realtimeStatus === "connecting" ? "bg-yellow-500" : "bg-red-500"
                }`}></div>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Automation Center
                </h1>
                <p className="text-gray-600 text-lg">Intelligent automation for your recovery journey</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-sm text-gray-500">
                    <Activity className="h-4 w-4 inline mr-1" />
                    {realtimeStatus === "connected" ? "Live updates active" : "Connecting..."}
                  </span>
                  <span className="text-sm text-gray-500">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Last activity: {stats.lastActivity}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={loadStats} 
                disabled={refreshing}
                className="flex items-center gap-2"
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Real-time Stats Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-blue-700 group-hover:scale-110 transition-transform duration-200">
                    {stats.activeReminders}
                  </div>
                  <div className="text-sm font-medium text-blue-600">Active Reminders</div>
                  <div className="text-xs text-blue-500">Scheduled notifications</div>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-200">
                  <Bell className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-green-700 group-hover:scale-110 transition-transform duration-200">
                    {stats.completedToday}
                  </div>
                  <div className="text-sm font-medium text-green-600">Completed Today</div>
                  <div className="text-xs text-green-500">Automated tasks</div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-200">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-purple-700 group-hover:scale-110 transition-transform duration-200">
                    {stats.upcomingAppointments}
                  </div>
                  <div className="text-sm font-medium text-purple-600">Upcoming</div>
                  <div className="text-xs text-purple-500">Appointments</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-200">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-amber-50 to-amber-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-amber-700 group-hover:scale-110 transition-transform duration-200">
                    {stats.automationHealth}%
                  </div>
                  <div className="text-sm font-medium text-amber-600">Health Score</div>
                  <div className="text-xs text-amber-500">System efficiency</div>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-200">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
      </div>

        {/* Enhanced Tabs */}
      <Tabs defaultValue="appointments" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <TabsList className="grid w-full sm:w-auto grid-cols-5 bg-gray-100 p-1 rounded-xl">
              <TabsTrigger value="appointments" className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-600 font-medium">
                <Calendar className="h-4 w-4 mr-2" />
                Appointments
              </TabsTrigger>
              <TabsTrigger value="medications" className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-600 font-medium">
                <Smartphone className="h-4 w-4 mr-2" />
                Medications
              </TabsTrigger>
              <TabsTrigger value="progress" className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-600 font-medium">
                <Activity className="h-4 w-4 mr-2" />
                Progress
              </TabsTrigger>
              <TabsTrigger value="notifications" className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-600 font-medium">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="reports" className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-600 font-medium">
                <Settings className="h-4 w-4 mr-2" />
                Reports
              </TabsTrigger>
        </TabsList>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Zap className="h-4 w-4" />
              <span>Real-time automation active</span>
            </div>
          </div>

        <TabsContent value="appointments">
          <AppointmentReminders />
        </TabsContent>

        <TabsContent value="medications">
          <MedicationReminders />
        </TabsContent>

        <TabsContent value="progress">
          <ProgressAutomation />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationCenter />
        </TabsContent>

        <TabsContent value="reports">
          <ReportGenerator />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}
