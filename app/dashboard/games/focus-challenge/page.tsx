"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Target, ArrowLeft, RotateCcw, Play, Zap } from "lucide-react"

export default function FocusChallengeGame() {
  const router = useRouter()
  const [gameState, setGameState] = useState<"menu" | "playing" | "complete">("menu")
  const [currentLevel, setCurrentLevel] = useState(1)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [sequence, setSequence] = useState<number[]>([])
  const [playerSequence, setPlayerSequence] = useState<number[]>([])
  const [showingSequence, setShowingSequence] = useState(false)
  const [activeButton, setActiveButton] = useState<number | null>(null)
  const [lives, setLives] = useState(3)
  const [streak, setStreak] = useState(0)

  const colors = [
    "bg-red-500 hover:bg-red-600",
    "bg-blue-500 hover:bg-blue-600",
    "bg-green-500 hover:bg-green-600",
    "bg-yellow-500 hover:bg-yellow-600",
    "bg-purple-500 hover:bg-purple-600",
    "bg-pink-500 hover:bg-pink-600",
  ]

  const generateSequence = useCallback(() => {
    const newSequence = []
    const sequenceLength = Math.min(3 + currentLevel, 8)
    for (let i = 0; i < sequenceLength; i++) {
      newSequence.push(Math.floor(Math.random() * 6))
    }
    setSequence(newSequence)
    setPlayerSequence([])
  }, [currentLevel])

  const showSequence = useCallback(async () => {
    setShowingSequence(true)
    for (let i = 0; i < sequence.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 800))
      setActiveButton(sequence[i])
      await new Promise((resolve) => setTimeout(resolve, 600))
      setActiveButton(null)
    }
    setShowingSequence(false)
  }, [sequence])

  const startGame = () => {
    setGameState("playing")
    setCurrentLevel(1)
    setScore(0)
    setTimeLeft(60)
    setLives(3)
    setStreak(0)
    generateSequence()
  }

  const handleButtonClick = (buttonIndex: number) => {
    if (showingSequence || gameState !== "playing") return

    const newPlayerSequence = [...playerSequence, buttonIndex]
    setPlayerSequence(newPlayerSequence)

    // Check if the current input is correct
    if (sequence[newPlayerSequence.length - 1] !== buttonIndex) {
      // Wrong input
      setLives(lives - 1)
      setStreak(0)
      setPlayerSequence([])

      if (lives <= 1) {
        setGameState("complete")
        return
      }

      // Flash red and restart sequence
      setActiveButton(-1) // Special value for error state
      setTimeout(() => {
        setActiveButton(null)
        showSequence()
      }, 1000)
      return
    }

    // Check if sequence is complete
    if (newPlayerSequence.length === sequence.length) {
      // Correct sequence completed
      const points = sequence.length * 10 * currentLevel
      setScore(score + points)
      setStreak(streak + 1)
      setCurrentLevel(currentLevel + 1)

      setTimeout(() => {
        generateSequence()
      }, 1000)
    }
  }

  // Timer effect
  useEffect(() => {
    if (gameState === "playing" && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0) {
      setGameState("complete")
    }
  }, [gameState, timeLeft])

  // Show sequence when it changes
  useEffect(() => {
    if (sequence.length > 0 && gameState === "playing") {
      showSequence()
    }
  }, [sequence, gameState, showSequence])

  const resetGame = () => {
    setGameState("menu")
    setCurrentLevel(1)
    setScore(0)
    setTimeLeft(60)
    setSequence([])
    setPlayerSequence([])
    setLives(3)
    setStreak(0)
  }

  if (gameState === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Button variant="outline" onClick={() => router.push("/dashboard/games")} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Games
          </Button>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Target className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl text-gray-900">Focus Challenge</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-gray-600">
                Test and improve your concentration with this memory sequence game. Watch the pattern, then repeat it
                back to advance to the next level.
              </p>

              <div className="bg-blue-50 p-4 rounded-lg text-left">
                <h3 className="font-semibold text-blue-900 mb-2">How to Play</h3>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>• Watch the sequence of colored buttons light up</li>
                  <li>• Click the buttons in the same order</li>
                  <li>• Each level adds more buttons to remember</li>
                  <li>• You have 3 lives and 60 seconds</li>
                  <li>• Build streaks for bonus points!</li>
                </ul>
              </div>

              <Button onClick={startGame} className="px-8 py-3">
                <Play className="h-4 w-4 mr-2" />
                Start Challenge
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (gameState === "complete") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Target className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl text-gray-900">Challenge Complete!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{score}</div>
                  <div className="text-sm text-gray-600">Final Score</div>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-indigo-600">{currentLevel - 1}</div>
                  <div className="text-sm text-gray-600">Levels Completed</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{streak}</div>
                  <div className="text-sm text-gray-600">Best Streak</div>
                </div>
              </div>

              <div className="text-left bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">Focus Training Benefits</h3>
                <p className="text-green-800 text-sm">
                  Excellent work! Memory and focus exercises like this help strengthen your attention span and working
                  memory, which are crucial skills for managing daily challenges in recovery.
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={() => router.push("/dashboard/games")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Games
          </Button>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">Level {currentLevel}</Badge>
            <Badge variant="outline">Score: {score}</Badge>
            <Badge variant="destructive">Lives: {lives}</Badge>
          </div>
        </div>

        {/* Game Stats */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Time Remaining</span>
              <span className="text-sm text-gray-600">{timeLeft}s</span>
            </div>
            <Progress value={(timeLeft / 60) * 100} className="h-2" />

            {streak > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium text-yellow-600">Streak: {streak}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Game Board */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-center">
              <Target className="h-5 w-5 text-blue-600" />
              {showingSequence ? "Watch the sequence..." : "Repeat the pattern"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              {colors.map((color, index) => (
                <Button
                  key={index}
                  className={`h-20 w-20 rounded-lg transition-all duration-200 ${
                    activeButton === index
                      ? `${color} scale-110 shadow-lg`
                      : activeButton === -1
                        ? "bg-red-300 hover:bg-red-400"
                        : `${color} opacity-70 hover:opacity-100`
                  }`}
                  onClick={() => handleButtonClick(index)}
                  disabled={showingSequence}
                />
              ))}
            </div>

            {showingSequence && (
              <div className="text-center mt-6">
                <div className="inline-flex items-center gap-2 bg-blue-100 px-4 py-2 rounded-full">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-blue-700 text-sm">Showing sequence...</span>
                </div>
              </div>
            )}

            {!showingSequence && playerSequence.length > 0 && (
              <div className="text-center mt-6">
                <div className="text-sm text-gray-600">
                  Progress: {playerSequence.length} / {sequence.length}
                </div>
                <Progress
                  value={(playerSequence.length / sequence.length) * 100}
                  className="h-1 mt-2 max-w-xs mx-auto"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
