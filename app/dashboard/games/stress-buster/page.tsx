"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Zap, ArrowLeft, RotateCcw, Heart, Brain, Smile } from "lucide-react"

export default function StressBusterGame() {
  const router = useRouter()
  const [currentActivity, setCurrentActivity] = useState(0)
  const [stressLevel, setStressLevel] = useState(7)
  const [initialStressLevel, setInitialStressLevel] = useState(7)
  const [breathingCount, setBreathingCount] = useState(0)
  const [breathingPhase, setBreathingPhase] = useState<"inhale" | "hold" | "exhale" | "pause">("inhale")
  const [breathingTimer, setBreathingTimer] = useState(4)
  const [isBreathing, setIsBreathing] = useState(false)
  const [completedActivities, setCompletedActivities] = useState<boolean[]>([false, false, false, false])
  const [gameComplete, setGameComplete] = useState(false)

  const activities = [
    {
      id: "assessment",
      title: "Stress Assessment",
      description: "Let's start by understanding your current stress level",
      icon: Brain,
      color: "bg-blue-100 text-blue-600",
    },
    {
      id: "breathing",
      title: "Breathing Exercise",
      description: "Practice the 4-7-8 breathing technique to calm your mind",
      icon: Heart,
      color: "bg-green-100 text-green-600",
    },
    {
      id: "visualization",
      title: "Peaceful Visualization",
      description: "Imagine yourself in a calm, peaceful place",
      icon: Brain,
      color: "bg-purple-100 text-purple-600",
    },
    {
      id: "affirmations",
      title: "Positive Affirmations",
      description: "Reinforce positive thoughts and self-compassion",
      icon: Smile,
      color: "bg-yellow-100 text-yellow-600",
    },
  ]

  const visualizationScenes = [
    {
      title: "Peaceful Beach",
      description:
        "You're sitting on warm sand, listening to gentle waves. Feel the sun on your skin and the ocean breeze.",
      image: "/peaceful-beach-sunset.png",
    },
    {
      title: "Mountain Meadow",
      description:
        "You're in a quiet meadow surrounded by mountains. Wildflowers sway in the gentle breeze around you.",
      image: "/mountain-meadow-wildflowers.png",
    },
    {
      title: "Forest Path",
      description:
        "You're walking on a soft forest path. Sunlight filters through the trees, and birds sing peacefully.",
      image: "/placeholder-oms6h.png",
    },
  ]

  const affirmations = [
    "I am capable of handling whatever comes my way",
    "I choose peace and calm in this moment",
    "I am worthy of love and compassion",
    "I trust in my ability to overcome challenges",
    "I am growing stronger every day",
    "I deserve to feel peaceful and relaxed",
    "I have the power to change my thoughts",
    "I am exactly where I need to be right now",
  ]

  // Breathing exercise timer
  useEffect(() => {
    if (isBreathing && breathingTimer > 0) {
      const timer = setTimeout(() => setBreathingTimer(breathingTimer - 1), 1000)
      return () => clearTimeout(timer)
    } else if (isBreathing && breathingTimer === 0) {
      // Move to next phase
      switch (breathingPhase) {
        case "inhale":
          setBreathingPhase("hold")
          setBreathingTimer(7)
          break
        case "hold":
          setBreathingPhase("exhale")
          setBreathingTimer(8)
          break
        case "exhale":
          setBreathingPhase("pause")
          setBreathingTimer(2)
          break
        case "pause":
          setBreathingPhase("inhale")
          setBreathingTimer(4)
          setBreathingCount(breathingCount + 1)
          break
      }
    }
  }, [isBreathing, breathingTimer, breathingPhase, breathingCount])

  const startBreathing = () => {
    setIsBreathing(true)
    setBreathingCount(0)
    setBreathingPhase("inhale")
    setBreathingTimer(4)
  }

  const stopBreathing = () => {
    setIsBreathing(false)
    setBreathingTimer(4)
  }

  const completeActivity = () => {
    const newCompleted = [...completedActivities]
    newCompleted[currentActivity] = true
    setCompletedActivities(newCompleted)

    if (currentActivity < activities.length - 1) {
      setCurrentActivity(currentActivity + 1)
    } else {
      setGameComplete(true)
    }
  }

  const resetGame = () => {
    setCurrentActivity(0)
    setStressLevel(7)
    setInitialStressLevel(7)
    setBreathingCount(0)
    setIsBreathing(false)
    setCompletedActivities([false, false, false, false])
    setGameComplete(false)
  }

  if (gameComplete) {
    const stressReduction = initialStressLevel - stressLevel
    const reductionPercentage = Math.round((stressReduction / initialStressLevel) * 100)

    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                <Zap className="h-8 w-8 text-yellow-600" />
              </div>
              <CardTitle className="text-2xl text-gray-900">Stress Busting Complete!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{reductionPercentage}%</div>
                  <div className="text-sm text-gray-600">Stress Reduction</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{breathingCount}</div>
                  <div className="text-sm text-gray-600">Breathing Cycles</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-red-100 to-green-100 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Stress Level Journey</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600">Before: {initialStressLevel}</span>
                  <div className="flex-1 h-2 bg-gradient-to-r from-red-300 to-green-300 rounded-full"></div>
                  <span className="text-sm text-green-600">After: {stressLevel}</span>
                </div>
              </div>

              <div className="text-left bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Stress Management Success</h3>
                <p className="text-blue-800 text-sm">
                  Excellent work! You've learned valuable stress management techniques. Regular practice of breathing
                  exercises, visualization, and positive affirmations can significantly improve your ability to handle
                  stress in recovery.
                </p>
              </div>

              <div className="flex gap-3">
                <Button onClick={resetGame} className="flex-1">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Practice Again
                </Button>
                <Button variant="outline" onClick={() => router.push("/dashboard/games")} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Games
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const currentActivityData = activities[currentActivity]
  const IconComponent = currentActivityData.icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={() => router.push("/dashboard/games")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Games
          </Button>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">
              Activity {currentActivity + 1} of {activities.length}
            </Badge>
            <Badge variant="outline">Stress Level: {stressLevel}/10</Badge>
          </div>
        </div>

        {/* Progress */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-gray-600">
                {completedActivities.filter(Boolean).length} of {activities.length} completed
              </span>
            </div>
            <Progress value={((currentActivity + 1) / activities.length) * 100} className="h-2" />
          </CardContent>
        </Card>

        {/* Activity Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${currentActivityData.color}`}>
                <IconComponent className="h-5 w-5" />
              </div>
              {currentActivityData.title}
            </CardTitle>
            <p className="text-gray-600">{currentActivityData.description}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stress Assessment */}
            {currentActivity === 0 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-4">
                    How stressed do you feel right now? (1 = Very Calm, 10 = Very Stressed)
                  </label>
                  <div className="px-4">
                    <Slider
                      value={[stressLevel]}
                      onValueChange={(value) => {
                        setStressLevel(value[0])
                        setInitialStressLevel(value[0])
                      }}
                      max={10}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>Very Calm</span>
                      <span className="font-medium text-lg">Level {stressLevel}</span>
                      <span>Very Stressed</span>
                    </div>
                  </div>
                </div>
                <Button onClick={completeActivity} className="w-full">
                  Continue to Stress Relief Activities
                </Button>
              </div>
            )}

            {/* Breathing Exercise */}
            {currentActivity === 1 && (
              <div className="space-y-6 text-center">
                <div className="bg-green-50 p-6 rounded-lg">
                  <div
                    className={`mx-auto w-32 h-32 rounded-full border-4 border-green-300 flex items-center justify-center mb-4 transition-all duration-1000 ${
                      isBreathing && breathingPhase === "inhale"
                        ? "scale-110 bg-green-100"
                        : isBreathing && breathingPhase === "hold"
                          ? "scale-110 bg-blue-100"
                          : isBreathing && breathingPhase === "exhale"
                            ? "scale-90 bg-purple-100"
                            : "bg-green-50"
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-700">{breathingTimer}</div>
                      <div className="text-sm text-gray-600 capitalize">{breathingPhase}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold text-green-900">4-7-8 Breathing Technique</h3>
                    <p className="text-green-800 text-sm">
                      Inhale for 4 seconds, hold for 7 seconds, exhale for 8 seconds
                    </p>
                    <p className="text-green-700 text-sm">Completed cycles: {breathingCount}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  {!isBreathing ? (
                    <Button onClick={startBreathing} className="flex-1">
                      Start Breathing Exercise
                    </Button>
                  ) : (
                    <Button onClick={stopBreathing} variant="outline" className="flex-1 bg-transparent">
                      Stop Exercise
                    </Button>
                  )}
                </div>

                {breathingCount >= 3 && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-blue-800 text-sm">
                        Great job! How do you feel now? Adjust your stress level if it has changed.
                      </p>
                    </div>
                    <div className="px-4">
                      <Slider
                        value={[stressLevel]}
                        onValueChange={(value) => setStressLevel(value[0])}
                        max={10}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>Very Calm</span>
                        <span className="font-medium">Level {stressLevel}</span>
                        <span>Very Stressed</span>
                      </div>
                    </div>
                    <Button onClick={completeActivity} className="w-full">
                      Continue to Visualization
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Visualization */}
            {currentActivity === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {visualizationScenes.map((scene, index) => (
                    <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4 text-center">
                        <img
                          src={scene.image || "/placeholder.svg"}
                          alt={scene.title}
                          className="w-full h-32 object-cover rounded-lg mb-3"
                        />
                        <h4 className="font-medium mb-2">{scene.title}</h4>
                        <p className="text-sm text-gray-600">{scene.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-2">Visualization Instructions</h4>
                  <p className="text-purple-800 text-sm">
                    Choose a scene above and spend 2-3 minutes imagining yourself there. Use all your senses - what do
                    you see, hear, feel, and smell? Let yourself fully relax in this peaceful place.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="px-4">
                    <label className="block text-sm font-medium mb-2">How do you feel after the visualization?</label>
                    <Slider
                      value={[stressLevel]}
                      onValueChange={(value) => setStressLevel(value[0])}
                      max={10}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>Very Calm</span>
                      <span className="font-medium">Level {stressLevel}</span>
                      <span>Very Stressed</span>
                    </div>
                  </div>
                  <Button onClick={completeActivity} className="w-full">
                    Continue to Affirmations
                  </Button>
                </div>
              </div>
            )}

            {/* Affirmations */}
            {currentActivity === 3 && (
              <div className="space-y-6">
                <div className="bg-yellow-50 p-6 rounded-lg text-center">
                  <h3 className="font-semibold text-yellow-900 mb-4">Positive Affirmations</h3>
                  <p className="text-yellow-800 text-sm mb-6">
                    Read each affirmation slowly and let it resonate with you. Repeat the ones that feel most
                    meaningful.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {affirmations.map((affirmation, index) => (
                      <div key={index} className="bg-white p-3 rounded-lg border border-yellow-200">
                        <p className="text-sm text-gray-700 italic">"{affirmation}"</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="px-4">
                    <label className="block text-sm font-medium mb-2">
                      How do you feel after reading these affirmations?
                    </label>
                    <Slider
                      value={[stressLevel]}
                      onValueChange={(value) => setStressLevel(value[0])}
                      max={10}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>Very Calm</span>
                      <span className="font-medium">Level {stressLevel}</span>
                      <span>Very Stressed</span>
                    </div>
                  </div>
                  <Button onClick={completeActivity} className="w-full">
                    Complete Stress Buster
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
