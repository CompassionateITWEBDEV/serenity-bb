"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { useContextualAlerts } from "@/hooks/use-smart-alerts"

interface EducationalContent {
  id: string
  topic: string
  tip: string
  context: string[]
  frequency: "once" | "daily" | "weekly"
  priority: "low" | "medium" | "high"
}

const educationalContent: EducationalContent[] = [
  {
    id: "hydration-tip",
    topic: "Hydration",
    tip: "Staying hydrated helps your body process medications more effectively and supports overall recovery.",
    context: ["/dashboard", "/dashboard/progress"],
    frequency: "daily",
    priority: "medium",
  },
  {
    id: "sleep-hygiene",
    topic: "Sleep Health",
    tip: "Quality sleep is crucial for recovery. Try to maintain a consistent sleep schedule of 7-9 hours nightly.",
    context: ["/dashboard", "/dashboard/wellness"],
    frequency: "weekly",
    priority: "high",
  },
  {
    id: "medication-adherence",
    topic: "Medication Management",
    tip: "Taking medications at the same time each day helps maintain steady levels in your system for optimal effectiveness.",
    context: ["/dashboard/tracking", "/dashboard"],
    frequency: "daily",
    priority: "high",
  },
  {
    id: "support-network",
    topic: "Social Support",
    tip: "Connecting with others in recovery strengthens your journey. Consider joining group sessions or reaching out to friends.",
    context: ["/dashboard/groups", "/dashboard/messages"],
    frequency: "weekly",
    priority: "medium",
  },
  {
    id: "stress-management",
    topic: "Stress Relief",
    tip: "When feeling overwhelmed, try the 5-4-3-2-1 technique: name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.",
    context: ["/dashboard/games", "/dashboard"],
    frequency: "daily",
    priority: "medium",
  },
  {
    id: "nutrition-basics",
    topic: "Nutrition",
    tip: "Eating regular, balanced meals helps stabilize mood and energy levels during recovery.",
    context: ["/dashboard/progress", "/dashboard"],
    frequency: "weekly",
    priority: "medium",
  },
  {
    id: "exercise-benefits",
    topic: "Physical Activity",
    tip: "Even light exercise like a 10-minute walk can boost mood and reduce cravings naturally.",
    context: ["/dashboard/progress", "/dashboard/wellness"],
    frequency: "weekly",
    priority: "low",
  },
  {
    id: "appointment-prep",
    topic: "Appointment Preparation",
    tip: "Before your next appointment, write down any questions or concerns. This helps you make the most of your time with your care team.",
    context: ["/dashboard/appointments"],
    frequency: "once",
    priority: "high",
  },
]

export function EducationalAlertSystem() {
  const pathname = usePathname()
  const { triggerEducationalTip } = useContextualAlerts()
  const [shownTips, setShownTips] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Load shown tips from localStorage
    const stored = localStorage.getItem("shown-educational-tips")
    if (stored) {
      setShownTips(new Set(JSON.parse(stored)))
    }
  }, [])

  useEffect(() => {
    const showContextualTip = () => {
      const relevantTips = educationalContent.filter((tip) => tip.context.includes(pathname) && shouldShowTip(tip))

      if (relevantTips.length > 0) {
        // Prioritize high priority tips, then random selection
        const highPriorityTips = relevantTips.filter((tip) => tip.priority === "high")
        const selectedTip =
          highPriorityTips.length > 0
            ? highPriorityTips[Math.floor(Math.random() * highPriorityTips.length)]
            : relevantTips[Math.floor(Math.random() * relevantTips.length)]

        // Delay to avoid overwhelming user on page load
        setTimeout(() => {
          triggerEducationalTip(selectedTip.topic, selectedTip.tip)
          markTipAsShown(selectedTip.id)
        }, 3000)
      }
    }

    showContextualTip()
  }, [pathname, triggerEducationalTip, shownTips])

  const shouldShowTip = (tip: EducationalContent): boolean => {
    const now = new Date()
    const tipKey = `${tip.id}-${now.toDateString()}`
    const weekKey = `${tip.id}-week-${getWeekNumber(now)}`

    switch (tip.frequency) {
      case "once":
        return !shownTips.has(tip.id)
      case "daily":
        return !shownTips.has(tipKey)
      case "weekly":
        return !shownTips.has(weekKey)
      default:
        return false
    }
  }

  const markTipAsShown = (tipId: string) => {
    const now = new Date()
    let key = tipId

    const tip = educationalContent.find((t) => t.id === tipId)
    if (tip) {
      switch (tip.frequency) {
        case "daily":
          key = `${tipId}-${now.toDateString()}`
          break
        case "weekly":
          key = `${tipId}-week-${getWeekNumber(now)}`
          break
      }
    }

    const newShownTips = new Set([...shownTips, key])
    setShownTips(newShownTips)
    localStorage.setItem("shown-educational-tips", JSON.stringify([...newShownTips]))
  }

  const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
  }

  return null // This component only manages alerts, no UI
}
