"use client"
import { useSmartAlerts } from "@/components/alerts/smart-alert-provider"
import { useRouter } from "next/navigation"

export function useContextualAlerts() {
  const { addAlert } = useSmartAlerts()
  const router = useRouter()

  const triggerWelcomeAlert = () => {
    addAlert({
      type: "info",
      title: "Welcome to Your Recovery Journey",
      message: "Take your time exploring the dashboard. Remember, every small step counts.",
      priority: "medium",
      duration: 8000,
      context: "dashboard-welcome",
    })
  }

  const triggerMindfulnessReminder = () => {
    addAlert({
      type: "mindfulness",
      title: "Mindfulness Moment",
      message: "Take three deep breaths. Focus on the present moment.",
      priority: "low",
      duration: 10000,
      interactive: true,
      context: "mindfulness-reminder",
    })
  }

  const triggerProgressEncouragement = (milestone: string) => {
    addAlert({
      type: "progress",
      title: "Great Progress!",
      message: `You've reached ${milestone}. Keep up the excellent work!`,
      priority: "high",
      duration: 6000,
      action: {
        label: "View Progress",
        onClick: () => router.push("/dashboard/progress"),
      },
      context: "progress-milestone",
    })
  }

  const triggerEducationalTip = (topic: string, tip: string) => {
    addAlert({
      type: "educational",
      title: `Recovery Tip: ${topic}`,
      message: tip,
      priority: "medium",
      duration: 12000,
      interactive: true,
      context: "educational-tip",
    })
  }

  const triggerAppointmentReminder = (appointmentTime: string) => {
    addAlert({
      type: "warning",
      title: "Upcoming Appointment",
      message: `You have an appointment at ${appointmentTime}. Don't forget to prepare any questions.`,
      priority: "high",
      duration: 0, // Persistent until dismissed
      action: {
        label: "View Details",
        onClick: () => router.push("/dashboard/appointments"),
      },
      context: "appointment-reminder",
    })
  }

  return {
    triggerWelcomeAlert,
    triggerMindfulnessReminder,
    triggerProgressEncouragement,
    triggerEducationalTip,
    triggerAppointmentReminder,
  }
}
