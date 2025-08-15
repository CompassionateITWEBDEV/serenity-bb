"use client"

import { useState, useEffect } from "react"
import { Phone, MessageCircle, Users, AlertTriangle, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSmartAlerts } from "@/components/alerts/smart-alert-provider"

interface CrisisResource {
  id: string
  name: string
  type: "hotline" | "text" | "chat" | "local"
  contact: string
  description: string
  available: string
  priority: number
}

const crisisResources: CrisisResource[] = [
  {
    id: "988-lifeline",
    name: "988 Suicide & Crisis Lifeline",
    type: "hotline",
    contact: "988",
    description: "Free and confidential emotional support 24/7",
    available: "24/7",
    priority: 1,
  },
  {
    id: "crisis-text",
    name: "Crisis Text Line",
    type: "text",
    contact: "Text HOME to 741741",
    description: "Free, 24/7 support via text message",
    available: "24/7",
    priority: 2,
  },
  {
    id: "samhsa-helpline",
    name: "SAMHSA National Helpline",
    type: "hotline",
    contact: "1-800-662-4357",
    description: "Treatment referral and information service",
    available: "24/7",
    priority: 3,
  },
  {
    id: "local-emergency",
    name: "Emergency Services",
    type: "hotline",
    contact: "911",
    description: "For immediate medical emergencies",
    available: "24/7",
    priority: 4,
  },
]

export function CrisisSupportSystem() {
  const { addAlert } = useSmartAlerts()
  const [lastCrisisCheck, setLastCrisisCheck] = useState<Date | null>(null)

  useEffect(() => {
    // Monitor for crisis indicators in user behavior
    const monitorCrisisIndicators = () => {
      const checkIns = JSON.parse(localStorage.getItem("mental-health-checkins") || "[]")
      const recentCheckIns = checkIns.filter((checkIn: any) => {
        const checkInDate = new Date(checkIn.timestamp)
        const hoursSince = (Date.now() - checkInDate.getTime()) / (1000 * 60 * 60)
        return hoursSince <= 24 // Last 24 hours
      })

      // Check for crisis mood entries
      const crisisEntries = recentCheckIns.filter((checkIn: any) => checkIn.responses.mood === "crisis")
      const strugglingEntries = recentCheckIns.filter((checkIn: any) => checkIn.responses.mood === "struggling")

      if (crisisEntries.length > 0) {
        showCrisisAlert()
      } else if (strugglingEntries.length >= 2) {
        showSupportAlert()
      }
    }

    const interval = setInterval(monitorCrisisIndicators, 10 * 60 * 1000) // Check every 10 minutes
    return () => clearInterval(interval)
  }, [addAlert])

  const showCrisisAlert = () => {
    const now = new Date()
    if (lastCrisisCheck && now.getTime() - lastCrisisCheck.getTime() < 30 * 60 * 1000) {
      return // Don't spam crisis alerts (30 min cooldown)
    }

    setLastCrisisCheck(now)
    addAlert({
      type: "warning",
      title: "Crisis Support Available",
      message:
        "You indicated you're in crisis. Immediate support is available. You don't have to go through this alone.",
      priority: "high",
      duration: 0,
      action: {
        label: "Get Help Now",
        onClick: () => showCrisisResources(),
      },
    })
  }

  const showSupportAlert = () => {
    addAlert({
      type: "info",
      title: "Additional Support Available",
      message: "It seems like you've been struggling. Remember that support is always available when you need it.",
      priority: "high",
      duration: 15000,
      action: {
        label: "View Resources",
        onClick: () => showCrisisResources(),
      },
    })
  }

  const showCrisisResources = () => {
    addAlert({
      type: "warning",
      title: "Crisis Resources",
      message: "Here are immediate support options. Please reach out - you matter and help is available.",
      priority: "high",
      duration: 0,
      interactive: true,
    })
  }

  const contactResource = (resource: CrisisResource) => {
    if (resource.type === "hotline") {
      window.open(`tel:${resource.contact.replace(/\D/g, "")}`, "_self")
    } else if (resource.type === "text") {
      // For text resources, show instructions
      addAlert({
        type: "info",
        title: "Text Support Instructions",
        message: resource.contact,
        priority: "high",
        duration: 10000,
      })
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-5 w-5" />
            Crisis Support Resources
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-red-700 mb-4">
            If you're having thoughts of self-harm or suicide, please reach out immediately. Help is available 24/7.
          </p>

          {crisisResources.map((resource) => {
            const Icon = resource.type === "hotline" ? Phone : resource.type === "text" ? MessageCircle : Users
            return (
              <div key={resource.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-red-600" />
                  <div>
                    <h4 className="font-medium text-sm">{resource.name}</h4>
                    <p className="text-xs text-gray-600">{resource.description}</p>
                    <p className="text-xs text-green-600">{resource.available}</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => contactResource(resource)} className="bg-red-600 hover:bg-red-700">
                  Contact
                </Button>
              </div>
            )
          })}

          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-4 w-4 text-blue-600" />
              <h4 className="font-medium text-sm text-blue-800">Remember</h4>
            </div>
            <p className="text-xs text-blue-700">
              Recovery has ups and downs. Reaching out for help is a sign of strength, not weakness. Your care team is
              here to support you through difficult times.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
