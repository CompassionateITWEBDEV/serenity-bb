"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Heart, ArrowLeft, RotateCcw, CheckCircle, X } from "lucide-react"

export default function EmotionExplorerGame() {
  const router = useRouter()
  const [currentScenario, setCurrentScenario] = useState(0)
  const [score, setScore] = useState(0)
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [gameComplete, setGameComplete] = useState(false)
  const [streak, setStreak] = useState(0)

  const scenarios = [
    {
      id: 1,
      situation: "You receive unexpected good news about your recovery progress from your doctor.",
      image: "/happy-doctor-consultation.png",
      correctEmotion: "joy",
      emotions: ["joy", "anxiety", "anger", "sadness", "fear"],
      explanation: "Receiving positive news about recovery typically brings feelings of joy and relief.",
    },
    {
      id: 2,
      situation: "A close friend cancels plans to spend time with you at the last minute.",
      image: "/disappointed-person-phone.png",
      correctEmotion: "disappointment",
      emotions: ["joy", "disappointment", "anger", "excitement", "fear"],
      explanation:
        "When someone cancels plans, it's natural to feel disappointed, even if you understand their reasons.",
    },
    {
      id: 3,
      situation: "You're about to give a presentation about your recovery journey to a group.",
      image: "/presentation-scene.png",
      correctEmotion: "nervousness",
      emotions: ["joy", "anger", "nervousness", "sadness", "excitement"],
      explanation: "Speaking in front of others, especially about personal topics, commonly triggers nervousness.",
    },
    {
      id: 4,
      situation: "You successfully complete a challenging therapy session and feel proud of your progress.",
      image: "/proud-person-therapy.png",
      correctEmotion: "pride",
      emotions: ["pride", "anxiety", "anger", "sadness", "fear"],
      explanation: "Accomplishing difficult therapeutic work naturally leads to feelings of pride and self-worth.",
    },
    {
      id: 5,
      situation: "You see someone struggling with the same issues you've overcome in your recovery.",
      image: "/empathetic-help.png",
      correctEmotion: "empathy",
      emotions: ["joy", "empathy", "anger", "indifference", "fear"],
      explanation: "Witnessing others face familiar struggles often evokes empathy and a desire to help.",
    },
  ]

  const emotionColors = {
    joy: "bg-yellow-100 text-yellow-800 border-yellow-300",
    anxiety: "bg-orange-100 text-orange-800 border-orange-300",
    anger: "bg-red-100 text-red-800 border-red-300",
    sadness: "bg-blue-100 text-blue-800 border-blue-300",
    fear: "bg-purple-100 text-purple-800 border-purple-300",
    disappointment: "bg-gray-100 text-gray-800 border-gray-300",
    nervousness: "bg-pink-100 text-pink-800 border-pink-300",
    excitement: "bg-green-100 text-green-800 border-green-300",
    pride: "bg-indigo-100 text-indigo-800 border-indigo-300",
    empathy: "bg-teal-100 text-teal-800 border-teal-300",
    indifference: "bg-slate-100 text-slate-800 border-slate-300",
  }

  const handleEmotionSelect = (emotion: string) => {
    setSelectedEmotion(emotion)
  }

  const handleSubmit = () => {
    if (!selectedEmotion) return

    const isCorrect = selectedEmotion === scenarios[currentScenario].correctEmotion
    if (isCorrect) {
      setScore(score + 100)
      setStreak(streak + 1)
    } else {
      setStreak(0)
    }

    setShowResult(true)

    setTimeout(() => {
      if (currentScenario < scenarios.length - 1) {
        setCurrentScenario(currentScenario + 1)
        setSelectedEmotion(null)
        setShowResult(false)
      } else {
        setGameComplete(true)
      }
    }, 3000)
  }

  const resetGame = () => {
    setCurrentScenario(0)
    setScore(0)
    setSelectedEmotion(null)
    setShowResult(false)
    setGameComplete(false)
    setStreak(0)
  }

  const currentScenarioData = scenarios[currentScenario]
  const progress = ((currentScenario + 1) / scenarios.length) * 100

  if (gameComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mb-4">
                <Heart className="h-8 w-8 text-pink-600" />
              </div>
              <CardTitle className="text-2xl text-gray-900">Emotion Explorer Complete!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-pink-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-pink-600">{score}</div>
                  <div className="text-sm text-gray-600">Final Score</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round((score / (scenarios.length * 100)) * 100)}%
                  </div>
                  <div className="text-sm text-gray-600">Accuracy</div>
                </div>
              </div>

              <div className="text-left bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Emotional Intelligence Insights</h3>
                <p className="text-blue-800 text-sm">
                  Great work exploring emotions! Understanding and identifying emotions is a crucial skill in recovery.
                  Each emotion serves a purpose and recognizing them helps you respond more effectively to life's
                  challenges.
                </p>
              </div>

              <div className="flex gap-3">
                <Button onClick={resetGame} className="flex-1">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Play Again
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={() => router.push("/dashboard/games")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Games
          </Button>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">Score: {score}</Badge>
            <Badge variant="outline">Streak: {streak}</Badge>
          </div>
        </div>

        {/* Progress */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-gray-600">
                {currentScenario + 1} of {scenarios.length}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        {/* Game Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-600" />
              Emotion Explorer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!showResult ? (
              <>
                {/* Scenario */}
                <div className="text-center">
                  <img
                    src={currentScenarioData.image || "/placeholder.svg"}
                    alt="Scenario illustration"
                    className="w-full max-w-md mx-auto h-48 object-cover rounded-lg mb-4"
                  />
                  <p className="text-lg text-gray-800 leading-relaxed">{currentScenarioData.situation}</p>
                </div>

                {/* Emotion Options */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-center">
                    What emotion would you most likely feel in this situation?
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {currentScenarioData.emotions.map((emotion) => (
                      <Button
                        key={emotion}
                        variant={selectedEmotion === emotion ? "default" : "outline"}
                        className={`p-4 h-auto text-center capitalize ${
                          selectedEmotion === emotion
                            ? "bg-pink-500 hover:bg-pink-600"
                            : emotionColors[emotion as keyof typeof emotionColors] || "bg-gray-100"
                        }`}
                        onClick={() => handleEmotionSelect(emotion)}
                      >
                        {emotion}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="text-center">
                  <Button onClick={handleSubmit} disabled={!selectedEmotion} className="px-8 py-2">
                    Submit Answer
                  </Button>
                </div>
              </>
            ) : (
              /* Result */
              <div className="text-center space-y-4">
                <div
                  className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
                    selectedEmotion === currentScenarioData.correctEmotion ? "bg-green-100" : "bg-red-100"
                  }`}
                >
                  {selectedEmotion === currentScenarioData.correctEmotion ? (
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  ) : (
                    <X className="h-8 w-8 text-red-600" />
                  )}
                </div>

                <div>
                  <h3
                    className={`text-xl font-semibold ${
                      selectedEmotion === currentScenarioData.correctEmotion ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {selectedEmotion === currentScenarioData.correctEmotion ? "Correct!" : "Not quite right"}
                  </h3>
                  <p className="text-gray-600 mt-2">
                    The most common emotion in this situation is <strong>{currentScenarioData.correctEmotion}</strong>
                  </p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg text-left">
                  <h4 className="font-semibold text-blue-900 mb-2">Understanding This Emotion</h4>
                  <p className="text-blue-800 text-sm">{currentScenarioData.explanation}</p>
                </div>

                {selectedEmotion === currentScenarioData.correctEmotion && (
                  <div className="text-green-600 font-medium">+100 points!</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
