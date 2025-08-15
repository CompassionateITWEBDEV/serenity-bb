"use client"

import { useState } from "react"
import { X, Brain, Target, BookOpen, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface Alert {
  id: string
  type: "info" | "success" | "warning" | "mindfulness" | "educational" | "progress"
  title: string
  message: string
  action?: {
    label: string
    onClick: () => void
  }
  duration?: number
  priority: "low" | "medium" | "high"
  context?: string
  interactive?: boolean
}

interface SmartAlertProps {
  alert: Alert
  onClose: () => void
}

const alertIcons = {
  info: BookOpen,
  success: TrendingUp,
  warning: Target,
  mindfulness: Brain,
  educational: BookOpen,
  progress: TrendingUp,
}

const alertColors = {
  info: "border-blue-200 bg-blue-50 text-blue-900",
  success: "border-green-200 bg-green-50 text-green-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  mindfulness: "border-purple-200 bg-purple-50 text-purple-900",
  educational: "border-cyan-200 bg-cyan-50 text-cyan-900",
  progress: "border-emerald-200 bg-emerald-50 text-emerald-900",
}

export function SmartAlert({ alert, onClose }: SmartAlertProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const Icon = alertIcons[alert.type]

  return (
    <Card className={`${alertColors[alert.type]} border-l-4 shadow-lg animate-in slide-in-from-right duration-300`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            <h4 className="font-semibold text-sm">{alert.title}</h4>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0 hover:bg-white/50">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm mb-3">{alert.message}</p>

        {alert.interactive && (
          <div className="space-y-2">
            <Button variant="outline" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="text-xs">
              {isExpanded ? "Show Less" : "Learn More"}
            </Button>

            {isExpanded && (
              <div className="p-3 bg-white/50 rounded-md text-xs space-y-2">
                <p>Take a moment to reflect on your progress today.</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-xs bg-transparent">
                    I'm doing well
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs bg-transparent">
                    Need support
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {alert.action && (
          <Button size="sm" onClick={alert.action.onClick} className="mt-2 text-xs">
            {alert.action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
