"use client"

import { useState, useEffect } from "react"
import { Sun, Moon, Coffee, Sunset } from "lucide-react"
import { useSmartAlerts } from "@/components/alerts/smart-alert-provider"

interface MotivationalMessage {
  id: string
  timeOfDay: "morning" | "afternoon" | "evening" | "night"
  message: string
  type: "encouragement" | "reminder" | "reflection" | "goal-setting"
}

const motivationalMessages: MotivationalMessage[] = [
  {
    id: "morning-fresh-start",
    timeOfDay: "morning",
    message: "Good morning! Today is a fresh start and a new opportunity to take care of yourself.",
    type: "encouragement",
  },
  {
    id: "morning-one-day",
    timeOfDay: "morning",
    message: "Remember: you only need to focus on today. One day at a time, one moment at a time.",
    type: "reminder",
  },
  {
    id: "afternoon-progress",
    timeOfDay: "afternoon",
    message: "You've made it through another morning in recovery. That's something to be proud of!",
    type: "encouragement",
  },
  {
    id: "afternoon-self-care",
    timeOfDay: "afternoon",
    message: "Take a moment to check in with yourself. How are you feeling? What do you need right now?",
    type: "reflection",
  },
  {
    id: "evening-gratitude",
    timeOfDay: "evening",
    message: "As the day winds down, think of three things you're grateful for today.",
    type: "reflection",
  },
  {
    id: "evening-tomorrow",
    timeOfDay: "evening",
    message: "You made it through another day! Set one small, achievable goal for tomorrow.",
    type: "goal-setting",
  },
  {
    id: "night-rest",
    timeOfDay: "night",
    message: "Rest is part of recovery. You deserve peaceful sleep and a fresh start tomorrow.",
    type: "encouragement",
  },
]

export function DailyMotivationSystem() {
  const { addAlert } = useSmartAlerts()
  const [lastMotivationDate, setLastMotivationDate] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem("last-motivation-date")
    setLastMotivationDate(stored)

    const checkForMotivation = () => {
      const now = new Date()
      const today = now.toDateString()
      const hour = now.getHours()

      // Don't show multiple motivations on the same day
      if (lastMotivationDate === today) return

      let timeOfDay: "morning" | "afternoon" | "evening" | "night"
      let icon: any

      if (hour >= 6 && hour < 12) {
        timeOfDay = "morning"
        icon = Sun
      } else if (hour >= 12 && hour < 17) {
        timeOfDay = "afternoon"
        icon = Coffee
      } else if (hour >= 17 && hour < 21) {
        timeOfDay = "evening"
        icon = Sunset
      } else {
        timeOfDay = "night"
        icon = Moon
      }

      const relevantMessages = motivationalMessages.filter((msg) => msg.timeOfDay === timeOfDay)
      if (relevantMessages.length === 0) return

      const selectedMessage = relevantMessages[Math.floor(Math.random() * relevantMessages.length)]

      // Show motivation after a delay to avoid overwhelming on page load
      setTimeout(() => {
        addAlert({
          type: "info",
          title: `${timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)} Motivation`,
          message: selectedMessage.message,
          priority: "low",
          duration: 8000,
          context: "daily-motivation",
        })

        setLastMotivationDate(today)
        localStorage.setItem("last-motivation-date", today)
      }, 5000)
    }

    // Check immediately and then every hour
    checkForMotivation()
    const interval = setInterval(checkForMotivation, 60 * 60 * 1000)

    return () => clearInterval(interval)
  }, [addAlert, lastMotivationDate])

  return null // This component only manages motivation timing, no UI
}
