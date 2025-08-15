"use client"

import { useState, useEffect } from "react"
import { Brain, Smile, Frown, Meh, AlertTriangle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useSmartAlerts } from "@/components/alerts/smart-alert-provider"

interface MoodEntry {
  mood: "excellent" | "good" | "okay" | "struggling" | "crisis"
  timestamp: Date
  notes?: string
}

interface CheckInQuestion {
  id: string
  question: string
  type: "mood" | "scale" | "boolean" | "text"
  required: boolean
}

const checkInQuestions: CheckInQuestion[] = [
  {
    id: "mood",
    question: "How are you feeling right now?",
    type: "mood",
    required: true,
  },
  {
    id: "sleep",
    question: "How well did you sleep last night? (1-10)",
    type: "scale",
    required: false,
  },
  {
    id: "cravings",
    question: "Are you experiencing any cravings today?",
    type: "boolean",
    required: false,
  },
  {
    id: "support",
    question: "Do you feel you have adequate support right now?",
    type: "boolean",
    required: false,
  },
]

const moodOptions = [
  { value: "excellent", label: "Excellent", icon: Smile, color: "text-green-600" },
  { value: "good", label: "Good", icon: Smile, color: "text-blue-600" },
  { value: "okay", label: "Okay", icon: Meh, color: "text-yellow-600" },
  { value: "struggling", label: "Struggling", icon: Frown, color: "text-orange-600" },
  { value: "crisis", label: "Crisis", icon: AlertTriangle, color: "text-red-600" },
]

export function MentalHealthCheckIn() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [isComplete, setIsComplete] = useState(false)
  const { addAlert } = useSmartAlerts()

  useEffect(() => {
    // Check if it's time for a check-in (every 4 hours during waking hours)
    const checkSchedule = () => {
      const now = new Date()
      const hour = now.getHours()
      const lastCheckIn = localStorage.getItem("last-mental-health-checkin")
      const lastCheckInTime = lastCheckIn ? new Date(lastCheckIn) : new Date(0)
      const hoursSinceLastCheckIn = (now.getTime() - lastCheckInTime.getTime()) / (1000 * 60 * 60)

      // Show check-in during waking hours (8 AM - 10 PM) if it's been 4+ hours
      if (hour >= 8 && hour <= 22 && hoursSinceLastCheckIn >= 4) {
        setTimeout(() => {
          addAlert({
            type: "mindfulness",
            title: "Mental Health Check-In",
            message: "Take a moment to check in with yourself. How are you feeling today?",
            priority: "medium",
            duration: 0,
            interactive: true,
            action: {
              label: "Start Check-In",
              onClick: () => setIsOpen(true),
            },
          })
        }, 2000)
      }
    }

    checkSchedule()
    const interval = setInterval(checkSchedule, 30 * 60 * 1000) // Check every 30 minutes

    return () => clearInterval(interval)
  }, [addAlert])

  const handleResponse = (questionId: string, value: any) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }))
  }

  const nextStep = () => {
    if (currentStep < checkInQuestions.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      completeCheckIn()
    }
  }

  const completeCheckIn = () => {
    const now = new Date()
    localStorage.setItem("last-mental-health-checkin", now.toISOString())

    // Store the check-in data
    const checkInData = {
      timestamp: now,
      responses,
    }

    const existingData = JSON.parse(localStorage.getItem("mental-health-checkins") || "[]")
    existingData.push(checkInData)
    localStorage.setItem("mental-health-checkins", JSON.stringify(existingData))

    // Provide appropriate response based on mood
    const mood = responses.mood
    if (mood === "crisis") {
      addAlert({
        type: "warning",
        title: "Crisis Support Available",
        message:
          "It sounds like you're having a difficult time. Please reach out to your care team or crisis hotline immediately.",
        priority: "high",
        duration: 0,
        action: {
          label: "Get Help Now",
          onClick: () => {
            // In a real app, this would connect to crisis resources
            window.open("tel:988", "_self") // National Suicide Prevention Lifeline
          },
        },
      })
    } else if (mood === "struggling") {
      addAlert({
        type: "info",
        title: "Support Resources",
        message:
          "Remember that struggling is part of recovery. Consider reaching out to your support network or care team.",
        priority: "high",
        duration: 10000,
        action: {
          label: "View Resources",
          onClick: () => {
            // Navigate to resources or support
          },
        },
      })
    } else {
      addAlert({
        type: "success",
        title: "Check-In Complete",
        message: "Thank you for taking time to check in with yourself. Keep up the great work!",
        priority: "medium",
        duration: 5000,
      })
    }

    setIsComplete(true)
    setTimeout(() => {
      setIsOpen(false)
      setCurrentStep(0)
      setResponses({})
      setIsComplete(false)
    }, 3000)
  }

  const currentQuestion = checkInQuestions[currentStep]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Mental Health Check-In
          </CardTitle>
          <Progress value={((currentStep + 1) / checkInQuestions.length) * 100} className="w-full" />
        </CardHeader>
        <CardContent className="space-y-4">
          {!isComplete ? (
            <>
              <div className="text-center">
                <h3 className="font-medium mb-4">{currentQuestion.question}</h3>

                {currentQuestion.type === "mood" && (
                  <div className="grid grid-cols-1 gap-2">
                    {moodOptions.map((option) => {
                      const Icon = option.icon
                      return (
                        <Button
                          key={option.value}
                          variant={responses[currentQuestion.id] === option.value ? "default" : "outline"}
                          onClick={() => handleResponse(currentQuestion.id, option.value)}
                          className="flex items-center gap-2 justify-start"
                        >
                          <Icon className={`h-4 w-4 ${option.color}`} />
                          {option.label}
                        </Button>
                      )
                    })}
                  </div>
                )}

                {currentQuestion.type === "scale" && (
                  <div className="flex gap-1 justify-center">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <Button
                        key={num}
                        variant={responses[currentQuestion.id] === num ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleResponse(currentQuestion.id, num)}
                        className="w-8 h-8 p-0"
                      >
                        {num}
                      </Button>
                    ))}
                  </div>
                )}

                {currentQuestion.type === "boolean" && (
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant={responses[currentQuestion.id] === true ? "default" : "outline"}
                      onClick={() => handleResponse(currentQuestion.id, true)}
                    >
                      Yes
                    </Button>
                    <Button
                      variant={responses[currentQuestion.id] === false ? "default" : "outline"}
                      onClick={() => handleResponse(currentQuestion.id, false)}
                    >
                      No
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Skip for Now
                </Button>
                <Button onClick={nextStep} disabled={currentQuestion.required && !responses[currentQuestion.id]}>
                  {currentStep === checkInQuestions.length - 1 ? "Complete" : "Next"}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-medium text-lg mb-2">Check-In Complete</h3>
              <p className="text-sm text-gray-600">Thank you for taking care of your mental health.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
