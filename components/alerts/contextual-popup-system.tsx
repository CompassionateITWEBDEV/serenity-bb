"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { useSmartAlerts } from "@/components/alerts/smart-alert-provider"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, Heart, Brain, Target, Zap } from "lucide-react"

interface PopupScenario {
  id: string
  triggers: string[]
  title: string
  message: string
  type: "welcome" | "guidance" | "encouragement" | "warning" | "celebration"
  priority: "low" | "medium" | "high"
  showOnce?: boolean
  delay?: number
  actions?: Array<{
    label: string
    action: () => void
    primary?: boolean
  }>
}

export function ContextualPopupSystem() {
  const { addAlert } = useSmartAlerts()
  const pathname = usePathname()
  const [shownPopups, setShownPopups] = useState<Set<string>>(new Set())
  const [currentPopup, setCurrentPopup] = useState<PopupScenario | null>(null)

  const popupScenarios: PopupScenario[] = [
    {
      id: "dashboard_welcome",
      triggers: ["/dashboard"],
      title: "Welcome to Your Recovery Dashboard",
      message:
        "This is your personal space for tracking progress, playing therapeutic games, and staying connected with your care team.",
      type: "welcome",
      priority: "medium",
      showOnce: true,
      delay: 2000,
      actions: [
        {
          label: "Take a Tour",
          action: () => startDashboardTour(),
          primary: true,
        },
        {
          label: "Explore on My Own",
          action: () => dismissPopup(),
        },
      ],
    },
    {
      id: "games_first_visit",
      triggers: ["/dashboard/games"],
      title: "Therapeutic Games",
      message:
        "These games are specially designed to support your mental wellness and recovery journey. Each game targets different aspects of healing.",
      type: "guidance",
      priority: "medium",
      showOnce: true,
      delay: 1500,
      actions: [
        {
          label: "Start with Mindfulness",
          action: () => (window.location.href = "/dashboard/games/mindfulness-maze"),
          primary: true,
        },
        {
          label: "Browse All Games",
          action: () => dismissPopup(),
        },
      ],
    },
    {
      id: "progress_encouragement",
      triggers: ["/dashboard/progress"],
      title: "Your Progress Matters",
      message:
        "Every step forward, no matter how small, is a victory worth celebrating. Recovery is a journey, not a destination.",
      type: "encouragement",
      priority: "medium",
      delay: 1000,
      actions: [
        {
          label: "View Achievements",
          action: () => scrollToAchievements(),
          primary: true,
        },
        {
          label: "Set New Goals",
          action: () => openGoalSetting(),
        },
      ],
    },
    {
      id: "late_night_warning",
      triggers: ["*"],
      title: "It's Getting Late",
      message:
        "Good sleep is crucial for recovery. Consider winding down for the night to support your healing process.",
      type: "warning",
      priority: "high",
      delay: 0,
      actions: [
        {
          label: "Sleep Tips",
          action: () => showSleepTips(),
          primary: true,
        },
        {
          label: "Continue for 10 More Minutes",
          action: () => setLateNightTimer(),
        },
      ],
    },
    {
      id: "appointment_success",
      triggers: ["/dashboard/appointments"],
      title: "Appointment Scheduled! 🎉",
      message: "Great job taking care of your health. We've sent you a confirmation and reminder details.",
      type: "celebration",
      priority: "high",
      delay: 500,
      actions: [
        {
          label: "View Details",
          action: () => showAppointmentDetails(),
          primary: true,
        },
      ],
    },
    {
      id: "stress_relief_suggestion",
      triggers: ["/dashboard/games/stress-buster"],
      title: "Feeling Stressed?",
      message:
        "You've accessed the stress management tools. Remember, it's okay to feel overwhelmed sometimes. You have the strength to get through this.",
      type: "encouragement",
      priority: "high",
      delay: 1000,
      actions: [
        {
          label: "Start Breathing Exercise",
          action: () => startQuickBreathing(),
          primary: true,
        },
        {
          label: "Talk to Someone",
          action: () => (window.location.href = "/dashboard/messages"),
        },
      ],
    },
    {
      id: "milestone_celebration",
      triggers: ["*"],
      title: "Milestone Achieved! 🌟",
      message:
        "You've completed 7 days of consistent engagement with your recovery program. This is a significant achievement!",
      type: "celebration",
      priority: "high",
      delay: 1000,
      actions: [
        {
          label: "Share Achievement",
          action: () => shareAchievement(),
          primary: true,
        },
        {
          label: "Continue Journey",
          action: () => dismissPopup(),
        },
      ],
    },
  ]

  useEffect(() => {
    // Load shown popups from localStorage
    const stored = localStorage.getItem("shown-popups")
    if (stored) {
      setShownPopups(new Set(JSON.parse(stored)))
    }
  }, [])

  useEffect(() => {
    const checkForPopups = () => {
      const currentHour = new Date().getHours()

      // Check for late night usage
      if (currentHour >= 23 || currentHour <= 5) {
        const lateNightPopup = popupScenarios.find((p) => p.id === "late_night_warning")
        if (lateNightPopup && !shownPopups.has("late_night_today")) {
          showPopup(lateNightPopup)
          markAsShown("late_night_today")
          return
        }
      }

      // Check for path-specific popups
      const relevantPopups = popupScenarios.filter(
        (popup) => popup.triggers.includes(pathname) || popup.triggers.includes("*"),
      )

      for (const popup of relevantPopups) {
        if (popup.showOnce && shownPopups.has(popup.id)) continue
        if (popup.id === "late_night_warning") continue // Already handled above

        // Special conditions for certain popups
        if (popup.id === "milestone_celebration" && !checkMilestoneCondition()) continue
        if (popup.id === "appointment_success" && !checkAppointmentSuccess()) continue

        showPopup(popup)
        if (popup.showOnce) {
          markAsShown(popup.id)
        }
        break // Only show one popup at a time
      }
    }

    const timer = setTimeout(checkForPopups, 1000)
    return () => clearTimeout(timer)
  }, [pathname, shownPopups])

  const showPopup = (popup: PopupScenario) => {
    if (currentPopup) return // Don't show multiple popups

    setTimeout(() => {
      setCurrentPopup(popup)
    }, popup.delay || 0)
  }

  const dismissPopup = () => {
    setCurrentPopup(null)
  }

  const markAsShown = (popupId: string) => {
    const newShownPopups = new Set([...shownPopups, popupId])
    setShownPopups(newShownPopups)
    localStorage.setItem("shown-popups", JSON.stringify([...newShownPopups]))
  }

  const checkMilestoneCondition = (): boolean => {
    // Mock milestone check - in real app, this would check actual progress data
    const lastMilestone = localStorage.getItem("last-milestone-popup")
    if (!lastMilestone) return true

    const daysSince = (Date.now() - new Date(lastMilestone).getTime()) / (1000 * 60 * 60 * 24)
    return daysSince >= 7 // Show milestone popup every 7 days
  }

  const checkAppointmentSuccess = (): boolean => {
    // Check if user just scheduled an appointment
    const recentAppointment = localStorage.getItem("recent-appointment-scheduled")
    return recentAppointment === "true"
  }

  // Action handlers
  const startDashboardTour = () => {
    dismissPopup()
    addAlert({
      type: "info",
      title: "Dashboard Tour",
      message: "Let's explore your dashboard features step by step.",
      priority: "medium",
      duration: 5000,
    })
  }

  const scrollToAchievements = () => {
    dismissPopup()
    const achievementsSection = document.getElementById("achievements")
    if (achievementsSection) {
      achievementsSection.scrollIntoView({ behavior: "smooth" })
    }
  }

  const openGoalSetting = () => {
    dismissPopup()
    window.location.href = "/dashboard/progress#goals"
  }

  const showSleepTips = () => {
    dismissPopup()
    addAlert({
      type: "educational",
      title: "Sleep Tips for Recovery",
      message: "Try dimming lights, avoiding screens, and practicing deep breathing to prepare for restful sleep.",
      priority: "medium",
      duration: 12000,
      interactive: true,
    })
  }

  const setLateNightTimer = () => {
    dismissPopup()
    setTimeout(
      () => {
        addAlert({
          type: "warning",
          title: "Time's Up",
          message: "It's been 10 minutes. Consider getting some rest for better recovery tomorrow.",
          priority: "high",
          duration: 8000,
        })
      },
      10 * 60 * 1000,
    )
  }

  const showAppointmentDetails = () => {
    dismissPopup()
    window.location.href = "/dashboard/appointments"
  }

  const startQuickBreathing = () => {
    dismissPopup()
    addAlert({
      type: "mindfulness",
      title: "Quick Breathing Exercise",
      message: "Breathe in slowly for 4 counts... hold for 4... breathe out for 6. You're doing great.",
      priority: "high",
      duration: 15000,
      interactive: true,
    })
  }

  const shareAchievement = () => {
    dismissPopup()
    localStorage.setItem("last-milestone-popup", new Date().toISOString())
    addAlert({
      type: "success",
      title: "Achievement Shared",
      message: "Your progress has been noted. Keep up the excellent work!",
      priority: "medium",
      duration: 5000,
    })
  }

  if (!currentPopup) return null

  const getPopupIcon = (type: string) => {
    switch (type) {
      case "welcome":
        return <Heart className="h-6 w-6 text-cyan-600" />
      case "guidance":
        return <Target className="h-6 w-6 text-blue-600" />
      case "encouragement":
        return <Zap className="h-6 w-6 text-green-600" />
      case "warning":
        return <Brain className="h-6 w-6 text-orange-600" />
      case "celebration":
        return <Heart className="h-6 w-6 text-purple-600" />
      default:
        return <Heart className="h-6 w-6 text-gray-600" />
    }
  }

  const getPopupColors = (type: string) => {
    switch (type) {
      case "welcome":
        return "border-cyan-200 bg-cyan-50"
      case "guidance":
        return "border-blue-200 bg-blue-50"
      case "encouragement":
        return "border-green-200 bg-green-50"
      case "warning":
        return "border-orange-200 bg-orange-50"
      case "celebration":
        return "border-purple-200 bg-purple-50"
      default:
        return "border-gray-200 bg-gray-50"
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card
        className={`max-w-md w-full ${getPopupColors(currentPopup.type)} border-2 shadow-2xl animate-in zoom-in-95 duration-300`}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {getPopupIcon(currentPopup.type)}
              <h3 className="text-lg font-semibold text-gray-900">{currentPopup.title}</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={dismissPopup} className="h-6 w-6 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-gray-700 mb-6 leading-relaxed">{currentPopup.message}</p>

          {currentPopup.actions && (
            <div className="flex gap-3 flex-wrap">
              {currentPopup.actions.map((action, index) => (
                <Button
                  key={index}
                  onClick={action.action}
                  variant={action.primary ? "default" : "outline"}
                  className={action.primary ? "" : "bg-transparent"}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
