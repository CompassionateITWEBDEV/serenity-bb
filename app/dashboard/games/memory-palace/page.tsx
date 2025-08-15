"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Puzzle, ArrowLeft, RotateCcw, Eye, Brain, CheckCircle } from "lucide-react"

interface MemoryItem {
  id: number
  type: "image" | "word" | "number"
  content: string
  position: { x: number; y: number }
  revealed: boolean
  matched: boolean
}

export default function MemoryPalaceGame() {
  const router = useRouter()
  const [gameState, setGameState] = useState<"menu" | "study" | "recall" | "complete">("menu")
  const [currentLevel, setCurrentLevel] = useState(1)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [studyTime, setStudyTime] = useState(15)
  const [memoryItems, setMemoryItems] = useState<MemoryItem[]>([])
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [correctMatches, setCorrectMatches] = useState(0)
  const [lives, setLives] = useState(3)

  const itemTypes = {
    images: ["🏠", "🌳", "🚗", "📚", "☕", "🎵", "🌟", "🎨", "🏔️", "🌊"],
    words: ["PEACE", "HOPE", "STRENGTH", "CALM", "FOCUS", "GROWTH", "HEALING", "BALANCE", "WISDOM", "COURAGE"],
    numbers: ["42", "17", "89", "23", "56", "34", "78", "91", "65", "12"],
  }

  const generateMemoryItems = () => {
    const itemCount = Math.min(4 + currentLevel * 2, 16)
    const items: MemoryItem[] = []

    for (let i = 0; i < itemCount; i++) {
      const types = ["image", "word", "number"] as const
      const type = types[Math.floor(Math.random() * types.length)]
      let content = ""

      switch (type) {
        case "image":
          content = itemTypes.images[Math.floor(Math.random() * itemTypes.images.length)]
          break
        case "word":
          content = itemTypes.words[Math.floor(Math.random() * itemTypes.words.length)]
          break
        case "number":
          content = itemTypes.numbers[Math.floor(Math.random() * itemTypes.numbers.length)]
          break
      }

      items.push({
        id: i,
        type,
        content,
        position: {
          x: (i % 4) * 25 + 12.5,
          y: Math.floor(i / 4) * 25 + 12.5,
        },
        revealed: false,
        matched: false,
      })
    }

    setMemoryItems(items)
    setSelectedItems([])
    setCorrectMatches(0)
  }

  const startGame = () => {
    setGameState("study")
    setCurrentLevel(1)
    setScore(0)
    setLives(3)
    setStudyTime(15)
    generateMemoryItems()
  }

  const startStudyPhase = () => {
    setGameState("study")
    setStudyTime(15 + currentLevel * 2)
    setMemoryItems((items) => items.map((item) => ({ ...item, revealed: true })))
  }

  const startRecallPhase = () => {
    setGameState("recall")
    setTimeLeft(30 + currentLevel * 5)
    setMemoryItems((items) => items.map((item) => ({ ...item, revealed: false })))
  }

  const handleItemClick = (itemId: number) => {
    if (gameState !== "recall") return

    const item = memoryItems.find((i) => i.id === itemId)
    if (!item || item.matched) return

    if (selectedItems.includes(itemId)) {
      // Deselect item
      setSelectedItems(selectedItems.filter((id) => id !== itemId))
      setMemoryItems((items) => items.map((i) => (i.id === itemId ? { ...i, revealed: false } : i)))
    } else if (selectedItems.length < 2) {
      // Select item
      setSelectedItems([...selectedItems, itemId])
      setMemoryItems((items) => items.map((i) => (i.id === itemId ? { ...i, revealed: true } : i)))

      // Check for match if two items selected
      if (selectedItems.length === 1) {
        setTimeout(() => checkForMatch([...selectedItems, itemId]), 1000)
      }
    }
  }

  const checkForMatch = (selected: number[]) => {
    const [first, second] = selected.map((id) => memoryItems.find((item) => item.id === id))

    if (first && second && first.content === second.content) {
      // Match found
      setMemoryItems((items) =>
        items.map((item) => (selected.includes(item.id) ? { ...item, matched: true, revealed: true } : item)),
      )
      setCorrectMatches((prev) => prev + 1)
      setScore((prev) => prev + 100 * currentLevel)

      // Check if all items matched
      if (correctMatches + 1 >= memoryItems.length / 2) {
        setTimeout(() => {
          setCurrentLevel((prev) => prev + 1)
          generateMemoryItems()
          startStudyPhase()
        }, 1500)
      }
    } else {
      // No match
      setLives((prev) => prev - 1)
      setTimeout(() => {
        setMemoryItems((items) =>
          items.map((item) => (selected.includes(item.id) && !item.matched ? { ...item, revealed: false } : item)),
        )
      }, 1000)

      if (lives <= 1) {
        setGameState("complete")
      }
    }

    setSelectedItems([])
  }

  // Timer effects
  useEffect(() => {
    if (gameState === "study" && studyTime > 0) {
      const timer = setTimeout(() => setStudyTime(studyTime - 1), 1000)
      return () => clearTimeout(timer)
    } else if (gameState === "study" && studyTime === 0) {
      startRecallPhase()
    }
  }, [gameState, studyTime])

  useEffect(() => {
    if (gameState === "recall" && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (gameState === "recall" && timeLeft === 0) {
      setGameState("complete")
    }
  }, [gameState, timeLeft])

  const resetGame = () => {
    setGameState("menu")
    setCurrentLevel(1)
    setScore(0)
    setLives(3)
    setMemoryItems([])
  }

  if (gameState === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Button variant="outline" onClick={() => router.push("/dashboard/games")} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Games
          </Button>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Puzzle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-gray-900">Memory Palace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-gray-600">
                Build your memory skills through spatial and visual challenges. Study the items, then recall their
                positions and matches.
              </p>

              <div className="bg-green-50 p-4 rounded-lg text-left">
                <h3 className="font-semibold text-green-900 mb-2">How to Play</h3>
                <ul className="text-green-800 text-sm space-y-1">
                  <li>• Study the grid of items during the study phase</li>
                  <li>• Remember their positions and find matching pairs</li>
                  <li>• Click two items to check if they match</li>
                  <li>• Complete all matches to advance levels</li>
                  <li>• You have 3 lives per level</li>
                </ul>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg text-left">
                <h3 className="font-semibold text-blue-900 mb-2">Memory Benefits</h3>
                <p className="text-blue-800 text-sm">
                  Memory exercises strengthen working memory, attention, and cognitive flexibility - all crucial for
                  managing daily challenges in recovery.
                </p>
              </div>

              <Button onClick={startGame} className="px-8 py-3">
                <Brain className="h-4 w-4 mr-2" />
                Start Memory Training
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (gameState === "complete") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Puzzle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-gray-900">Memory Training Complete!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{score}</div>
                  <div className="text-sm text-gray-600">Final Score</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{currentLevel - 1}</div>
                  <div className="text-sm text-gray-600">Levels Completed</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{correctMatches}</div>
                  <div className="text-sm text-gray-600">Correct Matches</div>
                </div>
              </div>

              <div className="text-left bg-emerald-50 p-4 rounded-lg">
                <h3 className="font-semibold text-emerald-900 mb-2">Memory Training Success</h3>
                <p className="text-emerald-800 text-sm">
                  Excellent work! Regular memory training helps improve focus, attention, and cognitive resilience.
                  These skills support better decision-making and stress management in recovery.
                </p>
              </div>

              <div className="flex gap-3">
                <Button onClick={resetGame} className="flex-1">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Train Again
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-6">
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
              <span className="text-sm font-medium">{gameState === "study" ? "Study Time" : "Recall Time"}</span>
              <span className="text-sm text-gray-600">{gameState === "study" ? `${studyTime}s` : `${timeLeft}s`}</span>
            </div>
            <Progress
              value={
                gameState === "study"
                  ? ((15 + currentLevel * 2 - studyTime) / (15 + currentLevel * 2)) * 100
                  : ((30 + currentLevel * 5 - timeLeft) / (30 + currentLevel * 5)) * 100
              }
              className="h-2"
            />

            {gameState === "recall" && (
              <div className="flex items-center justify-between mt-2 text-sm">
                <span>
                  Matches: {correctMatches}/{Math.floor(memoryItems.length / 2)}
                </span>
                <span>Selected: {selectedItems.length}/2</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Game Board */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-center">
              <Puzzle className="h-5 w-5 text-green-600" />
              {gameState === "study" ? (
                <>
                  <Eye className="h-5 w-5" />
                  Study Phase - Memorize the items
                </>
              ) : (
                <>
                  <Brain className="h-5 w-5" />
                  Recall Phase - Find matching pairs
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative bg-gray-100 rounded-lg p-4 min-h-[400px]">
              <div className="grid grid-cols-4 gap-4 max-w-md mx-auto">
                {memoryItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`
                      aspect-square rounded-lg border-2 flex items-center justify-center text-lg font-bold cursor-pointer transition-all duration-300
                      ${
                        item.revealed || item.matched
                          ? item.matched
                            ? "bg-green-100 border-green-300 text-green-800"
                            : selectedItems.includes(item.id)
                              ? "bg-blue-100 border-blue-300 text-blue-800"
                              : "bg-white border-gray-300 text-gray-800"
                          : "bg-gray-200 border-gray-400 hover:bg-gray-300"
                      }
                      ${gameState === "recall" && !item.matched ? "hover:scale-105" : ""}
                    `}
                  >
                    {item.revealed || item.matched ? (
                      <div className="text-center">
                        <div className="text-xl mb-1">{item.content}</div>
                        {item.matched && <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />}
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-gray-400 rounded"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {gameState === "study" && (
              <div className="text-center mt-6">
                <div className="inline-flex items-center gap-2 bg-green-100 px-4 py-2 rounded-full">
                  <Eye className="h-4 w-4 text-green-600" />
                  <span className="text-green-700 text-sm">Study the items and their positions...</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
