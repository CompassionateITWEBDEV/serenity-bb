"use client"

import { useState, useEffect } from "react"
import { Wind, Heart, Flower } from "lucide-react"
import { useSmartAlerts } from "@/components/alerts/smart-alert-provider"

interface MindfulnessExercise {
  id: string
  name: string
  description: string
  duration: number // in seconds
  type: "breathing" | "body-scan" | "meditation" | "grounding"
  instructions: string[]
  icon: any
  color: string
}

const mindfulnessExercises: MindfulnessExercise[] = [
  {
    id: "box-breathing",
    name: "Box Breathing",
    description: "A calming 4-4-4-4 breathing pattern",
    duration: 120,
    type: "breathing",
    instructions: [
      "Inhale slowly for 4 counts",
      "Hold your breath for 4 counts",
      "Exhale slowly for 4 counts",
      "Hold empty for 4 counts",
      "Repeat this cycle",
    ],
    icon: Wind,
    color: "text-blue-600",
  },
  {
    id: "body-scan",
    name: "Quick Body Scan",
    description: "Release tension from head to toe",
    duration: 180,
    type: "body-scan",
    instructions: [
      "Start at the top of your head",
      "Notice any tension or sensations",
      "Slowly move down through your body",
      "Breathe into areas of tension",
      "Let each part relax as you go",
    ],
    icon: Heart,
    color: "text-pink-600",
  },
  {
    id: "five-senses",
    name: "5-4-3-2-1 Grounding",
    description: "Connect with your present environment",
    duration: 90,
    type: "grounding",
    instructions: [
      "Name 5 things you can see",
      "Name 4 things you can touch",
      "Name 3 things you can hear",
      "Name 2 things you can smell",
      "Name 1 thing you can taste",
    ],
    icon: Flower,
    color: "text-green-600",
  },
  {
    id: "loving-kindness",
    name: "Self-Compassion Moment",
    description: "Send kindness to yourself",
    duration: 150,
    type: "meditation",
    instructions: [
      "Place your hand on your heart",
      "Take three deep breaths",
      "Say: 'May I be kind to myself'",
      "Say: 'May I give myself compassion'",
      "Feel the warmth of self-care",
    ],
    icon: Heart,
    color: "text-purple-600",
  },
]

export function MindfulnessReminderSystem() {
  const { addAlert } = useSmartAlerts()
  const [lastReminderTime, setLastReminderTime] = useState<Date | null>(null)

  useEffect(() => {
    const checkForMindfulnessReminder = () => {
      const now = new Date()
      const hour = now.getHours()

      // Only show reminders during waking hours (7 AM - 9 PM)
      if (hour < 7 || hour > 21) return

      // Check if enough time has passed since last reminder (2 hours minimum)
      if (lastReminderTime) {
        const hoursSinceLastReminder = (now.getTime() - lastReminderTime.getTime()) / (1000 * 60 * 60)
        if (hoursSinceLastReminder < 2) return
      }

      // Random chance to show reminder (20% every check)
      if (Math.random() > 0.2) return

      const randomExercise = mindfulnessExercises[Math.floor(Math.random() * mindfulnessExercises.length)]

      setTimeout(() => {
        addAlert({
          type: "mindfulness",
          title: "Mindfulness Moment",
          message: `Take a moment for ${randomExercise.name}. Your mental health matters.`,
          priority: "low",
          duration: 0,
          interactive: true,
          action: {
            label: "Start Exercise",
            onClick: () => startMindfulnessExercise(randomExercise),
          },
        })

        setLastReminderTime(now)
      }, Math.random() * 10000) // Random delay up to 10 seconds
    }

    // Check every 30 minutes
    const interval = setInterval(checkForMindfulnessReminder, 30 * 60 * 1000)
    checkForMindfulnessReminder() // Check immediately

    return () => clearInterval(interval)
  }, [addAlert, lastReminderTime])

  const startMindfulnessExercise = (exercise: MindfulnessExercise) => {
    // This would trigger the interactive mindfulness exercise component
    const event = new CustomEvent("start-mindfulness-exercise", { detail: exercise })
    window.dispatchEvent(event)
  }

  return null // This component only manages reminder timing, no UI
}
