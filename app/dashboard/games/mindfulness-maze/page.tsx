"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Play, Pause, RotateCcw, Trophy, Timer, Heart } from "lucide-react"
import Link from "next/link"

export default function MindfulnessMazePage() {
  const { isAuthenticated, loading, patient } = useAuth()
  const router = useRouter()
  const [gameState, setGameState] = useState<"menu" | "playing" | "paused" | "completed">("menu")
  const [score, setScore] = useState(0)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [breathingPhase, setBreathingPhase] = useState<"inhale" | "hold" | "exhale">("inhale")
  const [breathingProgress, setBreathingProgress] = useState(0)
  const [level, setLevel] = useState(1)
  const [playerPosition, setPlayerPosition] = useState({ x: 1, y: 1 })

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, loading, router])

  // Breathing exercise timer
  useEffect(() => {
    if (gameState !== "playing") return

    const breathingCycle = {
      inhale: 4000, // 4 seconds
      hold: 2000, // 2 seconds
      exhale: 4000, // 4 seconds
    }

    const interval = setInterval(() => {
      setBreathingProgress((prev) => {
        const cycleTime = breathingCycle[breathingPhase]
        const newProgress = prev + 100 / (cycleTime / 100)

        if (newProgress >= 100) {
          // Move to next phase
          if (breathingPhase === "inhale") {
            setBreathingPhase("hold")
          } else if (breathingPhase === "hold") {
            setBreathingPhase("exhale")
          } else {
            setBreathingPhase("inhale")
            setScore((prev) => prev + 10) // Award points for completing breathing cycle
          }
          return 0
        }
        return newProgress
      })
    }, 100)

    return () => clearInterval(interval)
  }, [gameState, breathingPhase])

  // Game timer
  useEffect(() => {
    if (gameState !== "playing") return

    const interval = setInterval(() => {
      setTimeElapsed((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [gameState])

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (gameState !== "playing") return

      const { x, y } = playerPosition
      let newX = x
      let newY = y

      switch (event.key) {
        case "ArrowUp":
        case "w":
          newY = Math.max(0, y - 1)
          break
        case "ArrowDown":
        case "s":
          newY = Math.min(7, y + 1)
          break
        case "ArrowLeft":
        case "a":
          newX = Math.max(0, x - 1)
          break
        case "ArrowRight":
        case "d":
          newX = Math.min(7, x + 1)
          break
      }

      if (newX !== x || newY !== y) {
        setPlayerPosition({ x: newX, y: newY })
        setScore((prev) => prev + 1)

        // Check if reached goal
        if (newX === 6 && newY === 6) {
          setGameState("completed")
          setScore((prev) => prev + 100)
        }
      }
    },
    [gameState, playerPosition],
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [handleKeyPress])

  const startGame = () => {
    setGameState("playing")
    setScore(0)
    setTimeElapsed(0)
    setPlayerPosition({ x: 1, y: 1 })
    setLevel(1)
  }

  const pauseGame = () => {
    setGameState("paused")
  }

  const resumeGame = () => {
    setGameState("playing")
  }

  const resetGame = () => {
    setGameState("menu")
    setScore(0)
    setTimeElapsed(0)
    setPlayerPosition({ x: 1, y: 1 })
    setBreathingProgress(0)
    setBreathingPhase("inhale")
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getBreathingInstruction = () => {
    switch (breathingPhase) {
      case "inhale":
        return "Breathe In..."
      case "hold":
        return "Hold..."
      case "exhale":
        return "Breathe Out..."
    }
  }

  const getBreathingColor = () => {
    switch (breathingPhase) {
      case "inhale":
        return "bg-blue-500"
      case "hold":
        return "bg-yellow-500"
      case "exhale":
        return "bg-green-500"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading game...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !patient) {
    return null
  }

  // Simple maze layout (8x8 grid)
  const maze = [
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 1, 0, 0, 0, 1],
    [1, 0, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 1, 0, 1],
    [1, 1, 1, 0, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 1, 2, 1], // 2 = goal
    [1, 1, 1, 1, 1, 1, 1, 1],
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader patient={patient} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/games">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Games
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-serif font-bold text-gray-900">Mindfulness Maze</h1>
            <p className="text-gray-600">Navigate while practicing breathing exercises</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Game Area */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Level {level}</CardTitle>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Trophy className="h-3 w-3" />
                      {score}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      {formatTime(timeElapsed)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {gameState === "menu" && (
                  <div className="text-center py-12">
                    <div className="bg-purple-100 p-6 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                      <Heart className="h-12 w-12 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-4">Ready to Start?</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Navigate through the maze while following breathing exercises. Use arrow keys or WASD to move.
                    </p>
                    <Button onClick={startGame} className="bg-purple-600 hover:bg-purple-700">
                      <Play className="h-4 w-4 mr-2" />
                      Start Game
                    </Button>
                  </div>
                )}

                {(gameState === "playing" || gameState === "paused") && (
                  <div className="space-y-4">
                    {/* Game Controls */}
                    <div className="flex justify-center gap-2">
                      {gameState === "playing" ? (
                        <Button onClick={pauseGame} variant="outline" size="sm">
                          <Pause className="h-4 w-4 mr-2" />
                          Pause
                        </Button>
                      ) : (
                        <Button onClick={resumeGame} size="sm">
                          <Play className="h-4 w-4 mr-2" />
                          Resume
                        </Button>
                      )}
                      <Button onClick={resetGame} variant="outline" size="sm">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset
                      </Button>
                    </div>

                    {/* Maze */}
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <div className="grid grid-cols-8 gap-1 max-w-md mx-auto">
                        {maze.map((row, y) =>
                          row.map((cell, x) => (
                            <div
                              key={`${x}-${y}`}
                              className={`
                                w-8 h-8 rounded-sm flex items-center justify-center text-xs font-bold
                                ${cell === 1 ? "bg-gray-800" : cell === 2 ? "bg-green-500" : "bg-white"}
                                ${playerPosition.x === x && playerPosition.y === y ? "bg-blue-500 text-white" : ""}
                              `}
                            >
                              {playerPosition.x === x && playerPosition.y === y && "🧘"}
                              {cell === 2 && playerPosition.x !== x && playerPosition.y !== y && "🎯"}
                            </div>
                          )),
                        )}
                      </div>
                    </div>

                    <div className="text-center text-sm text-gray-600">
                      Use arrow keys or WASD to move • Reach the green target
                    </div>
                  </div>
                )}

                {gameState === "completed" && (
                  <div className="text-center py-12">
                    <div className="bg-green-100 p-6 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                      <Trophy className="h-12 w-12 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-4">Congratulations!</h3>
                    <p className="text-gray-600 mb-6">
                      You completed the maze in {formatTime(timeElapsed)} with a score of {score}!
                    </p>
                    <div className="flex justify-center gap-4">
                      <Button onClick={startGame} className="bg-green-600 hover:bg-green-700">
                        Play Again
                      </Button>
                      <Link href="/dashboard/games">
                        <Button variant="outline">Back to Games</Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Breathing Guide */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-pink-600" />
                  Breathing Guide
                </CardTitle>
              </CardHeader>
              <CardContent>
                {gameState === "playing" && (
                  <div className="text-center space-y-4">
                    <div className="text-lg font-medium text-gray-900">{getBreathingInstruction()}</div>

                    <div className="relative">
                      <div className="w-24 h-24 mx-auto rounded-full border-4 border-gray-200 flex items-center justify-center">
                        <div
                          className={`w-16 h-16 rounded-full transition-all duration-300 ${getBreathingColor()}`}
                          style={{
                            transform: `scale(${0.5 + (breathingProgress / 100) * 0.5})`,
                          }}
                        />
                      </div>
                    </div>

                    <Progress value={breathingProgress} className="h-2" />

                    <div className="text-sm text-gray-600">Follow the circle and breathe with the rhythm</div>
                  </div>
                )}

                {gameState !== "playing" && (
                  <div className="text-center text-gray-500 py-8">
                    <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Start the game to begin breathing exercises</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Instructions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <p>Use arrow keys or WASD to navigate the maze</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <p>Follow the breathing guide while moving</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <p>Reach the green target to complete the level</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                    4
                  </div>
                  <p>Earn points for movement and breathing cycles</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
