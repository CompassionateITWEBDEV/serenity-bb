"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { useSmartAlerts } from "@/components/alerts/smart-alert-provider"
import { useAuth } from "@/hooks/use-auth"

interface RealTimeScenario {
  id: string
  trigger: "time_based" | "behavior_based" | "progress_based" | "location_based" | "interaction_based"
  conditions: any
  alert: {
    type: "info" | "success" | "warning" | "mindfulness" | "educational" | "progress"
    title: string
    message: string
    priority: "low" | "medium" | "high"
    duration?: number
    interactive?: boolean
    action?: {
      label: string
      onClick: () => void
    }
  }
  cooldown: number // minutes
  maxPerDay: number
}

export function RealTimeAlertEngine() {
  const { addAlert } = useSmartAlerts()
  const { patient } = useAuth()
  const pathname = usePathname()
  const [sessionData, setSessionData] = useState({
    startTime: new Date(),
    pageViews: 0,
    clickCount: 0,
    idleTime: 0,
    lastActivity: new Date(),
  })
  const [alertHistory, setAlertHistory] = useState<Map<string, Date[]>>(new Map())

  const realTimeScenarios: RealTimeScenario[] = [
    {
      id: "morning_motivation",
      trigger: "time_based",
      conditions: { hours: [7, 8, 9], days: "weekdays" },
      alert: {
        type: "mindfulness",
        title: "Good Morning! 🌅",
        message: "Start your day with intention. Take a moment to set a positive goal for today.",
        priority: "medium",
        duration: 8000,
        interactive: true,
      },
      cooldown: 1440, // 24 hours
      maxPerDay: 1,
    },
    {
      id: "evening_reflection",
      trigger: "time_based",
      conditions: { hours: [19, 20, 21] },
      alert: {
        type: "educational",
        title: "Evening Reflection",
        message: "How did today go? Reflecting on your experiences helps reinforce positive changes.",
        priority: "low",
        duration: 10000,
        interactive: true,
      },
      cooldown: 1440,
      maxPerDay: 1,
    },
    {
      id: "rapid_navigation",
      trigger: "behavior_based",
      conditions: { pageViewsInMinute: 5 },
      alert: {
        type: "mindfulness",
        title: "Slow Down",
        message: "You're moving quickly through pages. Take a breath and be present with what you're doing.",
        priority: "medium",
        duration: 6000,
      },
      cooldown: 30,
      maxPerDay: 3,
    },
    {
      id: "long_session",
      trigger: "behavior_based",
      conditions: { sessionMinutes: 45 },
      alert: {
        type: "warning",
        title: "Take a Break",
        message: "You've been active for 45 minutes. Consider taking a short break to rest your eyes and mind.",
        priority: "medium",
        duration: 8000,
        action: {
          label: "5-Minute Break",
          onClick: () => startBreakTimer(),
        },
      },
      cooldown: 60,
      maxPerDay: 2,
    },
    {
      id: "games_engagement",
      trigger: "location_based",
      conditions: { path: "/dashboard/games", visitCount: 1 },
      alert: {
        type: "educational",
        title: "Recovery Games",
        message:
          "These games are designed to support your mental wellness. Try different ones to find what works best for you.",
        priority: "low",
        duration: 10000,
      },
      cooldown: 1440,
      maxPerDay: 1,
    },
    {
      id: "progress_milestone",
      trigger: "progress_based",
      conditions: { daysInTreatment: [7, 14, 30, 60, 90] },
      alert: {
        type: "progress",
        title: "Milestone Achieved! 🎉",
        message: "You've reached an important milestone in your recovery journey. Celebrate this achievement!",
        priority: "high",
        duration: 12000,
        interactive: true,
      },
      cooldown: 1440,
      maxPerDay: 1,
    },
    {
      id: "idle_check_in",
      trigger: "behavior_based",
      conditions: { idleMinutes: 10 },
      alert: {
        type: "mindfulness",
        title: "Still Here?",
        message: "You've been quiet for a while. How are you feeling right now?",
        priority: "low",
        duration: 8000,
        interactive: true,
      },
      cooldown: 30,
      maxPerDay: 4,
    },
    {
      id: "weekend_wellness",
      trigger: "time_based",
      conditions: { days: "weekend", hours: [10, 11, 12] },
      alert: {
        type: "educational",
        title: "Weekend Wellness",
        message:
          "Weekends can be challenging in recovery. Remember your coping strategies and stay connected with support.",
        priority: "medium",
        duration: 10000,
      },
      cooldown: 1440,
      maxPerDay: 1,
    },
    {
      id: "appointment_prep",
      trigger: "time_based",
      conditions: { beforeAppointment: 24 }, // 24 hours before
      alert: {
        type: "info",
        title: "Appointment Tomorrow",
        message:
          "You have an appointment tomorrow. Consider writing down any questions or concerns you'd like to discuss.",
        priority: "high",
        duration: 0, // Persistent
        action: {
          label: "View Appointments",
          onClick: () => (window.location.href = "/dashboard/appointments"),
        },
      },
      cooldown: 1440,
      maxPerDay: 1,
    },
    {
      id: "stress_pattern",
      trigger: "interaction_based",
      conditions: { rapidClicks: 15, timeWindow: 60 }, // 15 clicks in 60 seconds
      alert: {
        type: "mindfulness",
        title: "Stress Response Detected",
        message:
          "Your clicking pattern suggests you might be feeling stressed. Let's take a moment to center yourself.",
        priority: "high",
        duration: 8000,
        action: {
          label: "Breathing Exercise",
          onClick: () => startBreathingExercise(),
        },
      },
      cooldown: 45,
      maxPerDay: 3,
    },
  ]

  // Track user activity
  useEffect(() => {
    const handleActivity = () => {
      setSessionData((prev) => ({
        ...prev,
        lastActivity: new Date(),
        idleTime: 0,
        clickCount: prev.clickCount + 1,
      }))
    }

    const handlePageView = () => {
      setSessionData((prev) => ({
        ...prev,
        pageViews: prev.pageViews + 1,
      }))
    }

    // Track clicks and activity
    document.addEventListener("click", handleActivity)
    document.addEventListener("keypress", handleActivity)
    document.addEventListener("scroll", handleActivity)

    // Track page views
    handlePageView()

    // Idle timer
    const idleTimer = setInterval(() => {
      setSessionData((prev) => {
        const timeSinceActivity = Date.now() - prev.lastActivity.getTime()
        const idleMinutes = Math.floor(timeSinceActivity / (1000 * 60))
        return { ...prev, idleTime: idleMinutes }
      })
    }, 60000) // Check every minute

    return () => {
      document.removeEventListener("click", handleActivity)
      document.removeEventListener("keypress", handleActivity)
      document.removeEventListener("scroll", handleActivity)
      clearInterval(idleTimer)
    }
  }, [pathname])

  // Real-time scenario evaluation
  useEffect(() => {
    const evaluateScenarios = () => {
      const now = new Date()
      const currentHour = now.getHours()
      const currentDay = now.getDay()
      const isWeekend = currentDay === 0 || currentDay === 6
      const sessionMinutes = Math.floor((now.getTime() - sessionData.startTime.getTime()) / (1000 * 60))

      realTimeScenarios.forEach((scenario) => {
        if (
          shouldTriggerScenario(scenario, {
            currentHour,
            currentDay,
            isWeekend,
            sessionMinutes,
            pathname,
            sessionData,
          })
        ) {
          triggerScenarioAlert(scenario)
        }
      })
    }

    const interval = setInterval(evaluateScenarios, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [sessionData, pathname])

  const shouldTriggerScenario = (scenario: RealTimeScenario, context: any): boolean => {
    // Check cooldown
    const lastTriggered = alertHistory.get(scenario.id)
    if (lastTriggered && lastTriggered.length > 0) {
      const lastTime = lastTriggered[lastTriggered.length - 1]
      const minutesSince = (Date.now() - lastTime.getTime()) / (1000 * 60)
      if (minutesSince < scenario.cooldown) return false

      // Check daily limit
      const today = new Date().toDateString()
      const todayTriggers = lastTriggered.filter((date) => date.toDateString() === today)
      if (todayTriggers.length >= scenario.maxPerDay) return false
    }

    // Evaluate conditions based on trigger type
    switch (scenario.trigger) {
      case "time_based":
        return evaluateTimeConditions(scenario.conditions, context)
      case "behavior_based":
        return evaluateBehaviorConditions(scenario.conditions, context)
      case "location_based":
        return evaluateLocationConditions(scenario.conditions, context)
      case "progress_based":
        return evaluateProgressConditions(scenario.conditions, context)
      case "interaction_based":
        return evaluateInteractionConditions(scenario.conditions, context)
      default:
        return false
    }
  }

  const evaluateTimeConditions = (conditions: any, context: any): boolean => {
    if (conditions.hours && !conditions.hours.includes(context.currentHour)) return false
    if (conditions.days === "weekdays" && context.isWeekend) return false
    if (conditions.days === "weekend" && !context.isWeekend) return false
    return true
  }

  const evaluateBehaviorConditions = (conditions: any, context: any): boolean => {
    if (conditions.sessionMinutes && context.sessionMinutes < conditions.sessionMinutes) return false
    if (conditions.pageViewsInMinute) {
      // Check page views in last minute
      const recentViews = context.sessionData.pageViews // Simplified for demo
      return recentViews >= conditions.pageViewsInMinute
    }
    if (conditions.idleMinutes && context.sessionData.idleTime < conditions.idleMinutes) return false
    return true
  }

  const evaluateLocationConditions = (conditions: any, context: any): boolean => {
    if (conditions.path && !context.pathname.includes(conditions.path)) return false
    return true
  }

  const evaluateProgressConditions = (conditions: any, context: any): boolean => {
    // This would integrate with actual progress data
    if (conditions.daysInTreatment) {
      // Mock calculation - in real app, this would come from patient data
      const treatmentStart = new Date("2024-01-01") // Mock start date
      const daysSince = Math.floor((Date.now() - treatmentStart.getTime()) / (1000 * 60 * 60 * 24))
      return conditions.daysInTreatment.includes(daysSince)
    }
    return false
  }

  const evaluateInteractionConditions = (conditions: any, context: any): boolean => {
    if (conditions.rapidClicks) {
      // Check if user has clicked rapidly in the time window
      return context.sessionData.clickCount >= conditions.rapidClicks
    }
    return false
  }

  const triggerScenarioAlert = (scenario: RealTimeScenario) => {
    // Record the trigger
    const history = alertHistory.get(scenario.id) || []
    history.push(new Date())
    setAlertHistory(new Map(alertHistory.set(scenario.id, history)))

    // Trigger the alert
    addAlert(scenario.alert)
  }

  const startBreakTimer = () => {
    addAlert({
      type: "info",
      title: "Break Timer Started",
      message: "Take 5 minutes to rest. We'll remind you when it's time to return.",
      priority: "low",
      duration: 5000,
    })

    setTimeout(
      () => {
        addAlert({
          type: "success",
          title: "Break Complete",
          message: "Welcome back! How do you feel after your break?",
          priority: "medium",
          duration: 6000,
          interactive: true,
        })
      },
      5 * 60 * 1000,
    ) // 5 minutes
  }

  const startBreathingExercise = () => {
    addAlert({
      type: "mindfulness",
      title: "Breathing Exercise",
      message: "Follow along: Breathe in for 4 counts, hold for 4, breathe out for 6. Repeat 3 times.",
      priority: "high",
      duration: 20000,
      interactive: true,
    })
  }

  return null // This component only manages real-time logic
}
