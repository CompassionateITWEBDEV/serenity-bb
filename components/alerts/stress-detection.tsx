"use client"

import { useState, useEffect, useCallback } from "react"
import { Brain } from "lucide-react"
import { useSmartAlerts } from "@/components/alerts/smart-alert-provider"

interface StressIndicator {
  type: "rapid_clicking" | "long_session" | "frequent_visits" | "late_night_usage"
  threshold: number
  message: string
  priority: "low" | "medium" | "high"
}

const stressIndicators: StressIndicator[] = [
  {
    type: "rapid_clicking",
    threshold: 10, // clicks per minute
    message: "You seem to be clicking rapidly. Take a deep breath and slow down.",
    priority: "medium",
  },
  {
    type: "long_session",
    threshold: 60, // minutes
    message: "You've been active for a while. Consider taking a mindful break.",
    priority: "low",
  },
  {
    type: "late_night_usage",
    threshold: 23, // hour (11 PM)
    message: "It's getting late. Good sleep is important for recovery. Consider winding down.",
    priority: "medium",
  },
]

export function StressDetectionSystem() {
  const { addAlert } = useSmartAlerts()
  const [clickCount, setClickCount] = useState(0)
  const [sessionStart] = useState<Date>(new Date()) // Removed setter and made it constant
  const [lastStressAlert, setLastStressAlert] = useState<Date | null>(null)

  const triggerStressAlert = useCallback(
    (indicator: StressIndicator) => {
      const now = new Date()

      // Don't spam stress alerts (30 minute cooldown)
      if (lastStressAlert && now.getTime() - lastStressAlert.getTime() < 30 * 60 * 1000) {
        return
      }

      setLastStressAlert(now)

      addAlert({
        type: "mindfulness",
        title: "Stress Check",
        message: indicator.message,
        priority: indicator.priority,
        duration: 8000,
        action: {
          label: "Take a Mindful Moment",
          onClick: () => {
            // Trigger a quick breathing exercise
            const breathingExercise = {
              id: "stress-relief-breathing",
              name: "Stress Relief Breathing",
              description: "A quick 2-minute breathing exercise",
              duration: 120,
              type: "breathing" as const,
              instructions: [
                "Take a slow, deep breath in through your nose",
                "Hold for a moment",
                "Exhale slowly through your mouth",
                "Let your shoulders drop and relax",
              ],
              icon: Brain,
              color: "text-blue-600",
            }

            const event = new CustomEvent("start-mindfulness-exercise", { detail: breathingExercise })
            window.dispatchEvent(event)
          },
        },
      })
    },
    [lastStressAlert, addAlert],
  )

  useEffect(() => {
    const handleClick = () => {
      setClickCount((prev) => prev + 1)
    }

    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [])

  useEffect(() => {
    // Reset click count every minute and check for rapid clicking
    const clickResetInterval = setInterval(() => {
      setClickCount((currentClicks) => {
        // Check for rapid clicking before resetting
        if (currentClicks >= stressIndicators[0].threshold) {
          triggerStressAlert(stressIndicators[0])
        }
        return 0
      })
    }, 60000)

    // Check for long sessions every 15 minutes
    const sessionCheckInterval = setInterval(
      () => {
        const now = new Date()
        const sessionDuration = (now.getTime() - sessionStart.getTime()) / (1000 * 60)

        if (sessionDuration >= stressIndicators[1].threshold) {
          triggerStressAlert(stressIndicators[1])
        }
      },
      15 * 60 * 1000,
    )

    // Check for late night usage every hour
    const lateNightCheckInterval = setInterval(
      () => {
        const now = new Date()
        const hour = now.getHours()

        if (hour >= stressIndicators[2].threshold || hour <= 5) {
          triggerStressAlert(stressIndicators[2])
        }
      },
      60 * 60 * 1000,
    )

    return () => {
      clearInterval(clickResetInterval)
      clearInterval(sessionCheckInterval)
      clearInterval(lateNightCheckInterval)
    }
  }, [sessionStart, triggerStressAlert]) // Fixed dependencies - sessionStart is now stable

  return null // This component only detects stress patterns, no UI
}
