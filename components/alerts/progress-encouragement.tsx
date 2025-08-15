"use client"

import { useState, useEffect } from "react"
import { Trophy, Star, Target, TrendingUp, Calendar, Award, Zap } from "lucide-react"
import { useContextualAlerts } from "@/hooks/use-smart-alerts"

interface Milestone {
  id: string
  name: string
  description: string
  type: "days_clean" | "appointments_attended" | "goals_completed" | "check_ins_completed" | "games_played"
  threshold: number
  icon: any
  color: string
  message: string
}

interface Achievement {
  id: string
  milestoneId: string
  achievedAt: Date
  value: number
}

const milestones: Milestone[] = [
  {
    id: "first_day",
    name: "First Day Strong",
    description: "Completed your first day in recovery",
    type: "days_clean",
    threshold: 1,
    icon: Star,
    color: "text-yellow-600",
    message: "Congratulations on your first day! Every journey begins with a single step.",
  },
  {
    id: "one_week",
    name: "One Week Warrior",
    description: "Seven days of commitment to your recovery",
    type: "days_clean",
    threshold: 7,
    icon: Trophy,
    color: "text-blue-600",
    message: "One week down! You're building incredible strength and resilience.",
  },
  {
    id: "one_month",
    name: "Monthly Milestone",
    description: "Thirty days of dedication and growth",
    type: "days_clean",
    threshold: 30,
    icon: Award,
    color: "text-green-600",
    message: "30 days is a huge achievement! You're proving to yourself that recovery is possible.",
  },
  {
    id: "three_months",
    name: "Quarterly Champion",
    description: "Three months of sustained recovery",
    type: "days_clean",
    threshold: 90,
    icon: Trophy,
    color: "text-purple-600",
    message: "90 days! You've developed new habits and shown incredible determination.",
  },
  {
    id: "first_appointment",
    name: "Engagement Starter",
    description: "Attended your first appointment",
    type: "appointments_attended",
    threshold: 1,
    icon: Calendar,
    color: "text-cyan-600",
    message: "Great job attending your first appointment! Taking that step shows real commitment.",
  },
  {
    id: "five_appointments",
    name: "Consistent Participant",
    description: "Attended five appointments",
    type: "appointments_attended",
    threshold: 5,
    icon: Target,
    color: "text-indigo-600",
    message: "Five appointments completed! Your consistency is building a strong foundation for recovery.",
  },
  {
    id: "first_checkin",
    name: "Self-Awareness Beginner",
    description: "Completed your first mental health check-in",
    type: "check_ins_completed",
    threshold: 1,
    icon: TrendingUp,
    color: "text-pink-600",
    message: "Thank you for checking in with yourself! Self-awareness is a powerful tool in recovery.",
  },
  {
    id: "weekly_checkins",
    name: "Mindful Monitor",
    description: "Completed check-ins for a full week",
    type: "check_ins_completed",
    threshold: 7,
    icon: Zap,
    color: "text-orange-600",
    message: "A week of check-ins! You're developing excellent self-monitoring habits.",
  },
]

export function ProgressEncouragementSystem() {
  const { triggerProgressEncouragement } = useContextualAlerts()
  const [achievements, setAchievements] = useState<Achievement[]>([])

  useEffect(() => {
    // Load existing achievements
    const stored = localStorage.getItem("progress-achievements")
    if (stored) {
      setAchievements(JSON.parse(stored))
    }

    // Check for new achievements every minute
    const interval = setInterval(checkForNewAchievements, 60000)
    return () => clearInterval(interval)
  }, [])

  const checkForNewAchievements = () => {
    const currentStats = getCurrentStats()
    const existingAchievementIds = achievements.map((a) => a.milestoneId)

    milestones.forEach((milestone) => {
      if (existingAchievementIds.includes(milestone.id)) return

      const currentValue = currentStats[milestone.type] || 0
      if (currentValue >= milestone.threshold) {
        unlockAchievement(milestone, currentValue)
      }
    })
  }

  const getCurrentStats = () => {
    // Get current progress statistics from various sources
    const stats = {
      days_clean: getDaysClean(),
      appointments_attended: getAppointmentsAttended(),
      goals_completed: getGoalsCompleted(),
      check_ins_completed: getCheckInsCompleted(),
      games_played: getGamesPlayed(),
    }

    return stats
  }

  const getDaysClean = (): number => {
    const startDate = localStorage.getItem("recovery-start-date")
    if (!startDate) return 0

    const start = new Date(startDate)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getAppointmentsAttended = (): number => {
    const appointments = JSON.parse(localStorage.getItem("attended-appointments") || "[]")
    return appointments.length
  }

  const getGoalsCompleted = (): number => {
    const goals = JSON.parse(localStorage.getItem("completed-goals") || "[]")
    return goals.length
  }

  const getCheckInsCompleted = (): number => {
    const checkIns = JSON.parse(localStorage.getItem("mental-health-checkins") || "[]")
    return checkIns.length
  }

  const getGamesPlayed = (): number => {
    const games = JSON.parse(localStorage.getItem("games-played") || "[]")
    return games.length
  }

  const unlockAchievement = (milestone: Milestone, value: number) => {
    const newAchievement: Achievement = {
      id: Math.random().toString(36).substr(2, 9),
      milestoneId: milestone.id,
      achievedAt: new Date(),
      value,
    }

    const updatedAchievements = [...achievements, newAchievement]
    setAchievements(updatedAchievements)
    localStorage.setItem("progress-achievements", JSON.stringify(updatedAchievements))

    // Trigger celebration alert
    triggerProgressEncouragement(milestone.message)

    // Add to activity feed
    addToActivityFeed({
      type: "achievement",
      title: milestone.name,
      description: milestone.description,
      timestamp: new Date(),
      icon: milestone.icon,
      color: milestone.color,
    })
  }

  const addToActivityFeed = (activity: any) => {
    const activities = JSON.parse(localStorage.getItem("activity-feed") || "[]")
    activities.unshift(activity)
    localStorage.setItem("activity-feed", JSON.stringify(activities.slice(0, 50))) // Keep last 50 activities
  }

  // Initialize recovery start date if not set
  useEffect(() => {
    if (!localStorage.getItem("recovery-start-date")) {
      localStorage.setItem("recovery-start-date", new Date().toISOString())
    }
  }, [])

  return null // This component only manages progress tracking, no UI
}
