"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import AppointmentReminders from "@/components/automation/appointment-reminders"
import MedicationReminders from "@/components/automation/medication-reminders"
import ProgressAutomation from "@/components/automation/progress-automation"
import NotificationCenter from "@/components/automation/notification-center"
import ReportGenerator from "@/components/automation/report-generator"

export default function AutomationPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Automation Center</h1>
        <p className="text-gray-600">Manage automated systems for your recovery journey</p>
      </div>

      <Tabs defaultValue="appointments" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

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
  )
}
