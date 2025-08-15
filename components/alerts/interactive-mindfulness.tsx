"use client"

import { useState, useEffect } from "react"
import { Play, Pause, RotateCcw, CheckCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface MindfulnessExercise {
  id: string
  name: string
  description: string
  duration: number
  type: "breathing" | "body-scan" | "meditation" | "grounding"
  instructions: string[]
  icon: any
  color: string
}

export function InteractiveMindfulnessExercise() {
  const [currentExercise, setCurrentExercise] = useState<MindfulnessExercise | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    const handleStartExercise = (event: CustomEvent) => {
      const exercise = event.detail as MindfulnessExercise
      setCurrentExercise(exercise)
      setTimeRemaining(exercise.duration)
      setCurrentStep(0)
      setIsComplete(false)
      setIsActive(false)
    }

    window.addEventListener("start-mindfulness-exercise", handleStartExercise as EventListener)
    return () => window.removeEventListener("start-mindfulness-exercise", handleStartExercise as EventListener)
  }, [])

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null


    if (isActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((time) => {
          if (time <= 1) {
            setIsActive(false)
            setIsComplete(true)
            return 0
          }
          return time - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isActive, timeRemaining])

  const startExercise = () => {
    setIsActive(true)
  }

  const pauseExercise = () => {
    setIsActive(false)
  }

  const resetExercise = () => {
    if (currentExercise) {
      setTimeRemaining(currentExercise.duration)
      setIsActive(false)
      setCurrentStep(0)
      setIsComplete(false)
    }
  }

  const closeExercise = () => {
    setCurrentExercise(null)
    setIsActive(false)
    setIsComplete(false)
  }

  const nextStep = () => {
    if (currentExercise && currentStep < currentExercise.instructions.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (!currentExercise) return null

  const Icon = currentExercise.icon
  const progress =
    currentExercise.duration > 0 ? ((currentExercise.duration - timeRemaining) / currentExercise.duration) * 100 : 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Icon className={`h-5 w-5 ${currentExercise.color}`} />
              {currentExercise.name}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={closeExercise}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600">{currentExercise.description}</p>
        </CardHeader>

        <CardContent className="space-y-4">
          {!isComplete ? (
            <>
              {/* Timer and Progress */}
              <div className="text-center space-y-2">
                <div className="text-3xl font-mono font-bold text-gray-800">{formatTime(timeRemaining)}</div>
                <Progress value={progress} className="w-full" />
              </div>

              {/* Current Instruction */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-blue-800 mb-2">
                      Step {currentStep + 1} of {currentExercise.instructions.length}
                    </p>
                    <p className="text-blue-700">{currentExercise.instructions[currentStep]}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Controls */}
              <div className="flex justify-center gap-2">
                <Button variant="outline" size="sm" onClick={prevStep} disabled={currentStep === 0}>
                  Previous
                </Button>

                {!isActive ? (
                  <Button onClick={startExercise} className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Start
                  </Button>
                ) : (
                  <Button onClick={pauseExercise} variant="outline" className="flex items-center gap-2 bg-transparent">
                    <Pause className="h-4 w-4" />
                    Pause
                  </Button>
                )}

                <Button variant="outline" size="sm" onClick={resetExercise}>
                  <RotateCcw className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextStep}
                  disabled={currentStep === currentExercise.instructions.length - 1}
                >
                  Next
                </Button>
              </div>

              {/* Breathing Guide for breathing exercises */}
              {currentExercise.type === "breathing" && isActive && (
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full border-4 border-blue-300 flex items-center justify-center animate-pulse">
                    <div className="w-12 h-12 bg-blue-200 rounded-full animate-ping"></div>
                  </div>
                  <p className="text-sm text-gray-600">Follow the rhythm with your breath</p>
                </div>
              )}
            </>
          ) : (
            /* Completion Screen */
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Well Done!</h3>
              <p className="text-gray-600 mb-4">
                You've completed your mindfulness exercise. Take a moment to notice how you feel.
              </p>

              <div className="space-y-2">
                <Button onClick={resetExercise} variant="outline" className="w-full bg-transparent">
                  Practice Again
                </Button>
                <Button onClick={closeExercise} className="w-full">
                  Continue with Day
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
