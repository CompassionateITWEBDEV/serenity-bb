"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Heart, ArrowLeft, Plus, Flower, Sun, Droplets, Sparkles } from "lucide-react"

interface GratitudeEntry {
  id: string
  text: string
  category: "person" | "experience" | "achievement" | "nature" | "general"
  timestamp: Date
  growth: number // 0-100, represents how much the plant has grown
}

interface Plant {
  id: string
  type: "flower" | "tree" | "herb" | "vine"
  stage: "seed" | "sprout" | "growing" | "blooming" | "mature"
  gratitudeCount: number
  color: string
  position: { x: number; y: number }
}

export default function GratitudeGardenGame() {
  const router = useRouter()
  const [gratitudeEntries, setGratitudeEntries] = useState<GratitudeEntry[]>([])
  const [plants, setPlants] = useState<Plant[]>([])
  const [newGratitude, setNewGratitude] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<GratitudeEntry["category"]>("general")
  const [showAddForm, setShowAddForm] = useState(false)
  const [gardenLevel, setGardenLevel] = useState(1)
  const [totalGratitude, setTotalGratitude] = useState(0)

  const categories = [
    { id: "person" as const, label: "People", icon: "👥", color: "bg-pink-100 text-pink-800" },
    { id: "experience" as const, label: "Experiences", icon: "✨", color: "bg-purple-100 text-purple-800" },
    { id: "achievement" as const, label: "Achievements", icon: "🏆", color: "bg-yellow-100 text-yellow-800" },
    { id: "nature" as const, label: "Nature", icon: "🌿", color: "bg-green-100 text-green-800" },
    { id: "general" as const, label: "General", icon: "💝", color: "bg-blue-100 text-blue-800" },
  ]

  const plantTypes = [
    { type: "flower" as const, emoji: "🌸", colors: ["pink", "purple", "yellow", "white"] },
    { type: "tree" as const, emoji: "🌳", colors: ["green", "brown", "orange"] },
    { type: "herb" as const, emoji: "🌿", colors: ["green", "mint", "sage"] },
    { type: "vine" as const, emoji: "🍇", colors: ["purple", "green", "red"] },
  ]

  const motivationalQuotes = [
    "Gratitude turns what we have into enough.",
    "The more grateful you are, the more beauty you see.",
    "Gratitude is the healthiest of all human emotions.",
    "A grateful heart is a magnet for miracles.",
    "Gratitude makes sense of our past and brings peace for today.",
  ]

  useEffect(() => {
    // Load saved data
    const savedEntries = localStorage.getItem("gratitude-entries")
    const savedPlants = localStorage.getItem("gratitude-plants")

    if (savedEntries) {
      const entries = JSON.parse(savedEntries).map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp),
      }))
      setGratitudeEntries(entries)
      setTotalGratitude(entries.length)
    }

    if (savedPlants) {
      setPlants(JSON.parse(savedPlants))
    } else {
      // Initialize with a starter plant
      initializeGarden()
    }
  }, [])

  useEffect(() => {
    // Update garden level based on gratitude count
    const newLevel = Math.floor(totalGratitude / 5) + 1
    setGardenLevel(newLevel)
  }, [totalGratitude])

  const initializeGarden = () => {
    const starterPlant: Plant = {
      id: "starter",
      type: "flower",
      stage: "seed",
      gratitudeCount: 0,
      color: "pink",
      position: { x: 50, y: 60 },
    }
    setPlants([starterPlant])
  }

  const addGratitudeEntry = () => {
    if (!newGratitude.trim()) return

    const entry: GratitudeEntry = {
      id: Date.now().toString(),
      text: newGratitude.trim(),
      category: selectedCategory,
      timestamp: new Date(),
      growth: Math.random() * 20 + 10, // Random growth between 10-30
    }

    const updatedEntries = [...gratitudeEntries, entry]
    setGratitudeEntries(updatedEntries)
    setTotalGratitude(updatedEntries.length)

    // Save to localStorage
    localStorage.setItem("gratitude-entries", JSON.stringify(updatedEntries))

    // Grow existing plants and potentially add new ones
    growGarden(entry)

    // Reset form
    setNewGratitude("")
    setShowAddForm(false)
  }

  const growGarden = (newEntry: GratitudeEntry) => {
    const updatedPlants = plants.map((plant) => {
      const newGratitudeCount = plant.gratitudeCount + 1
      let newStage = plant.stage

      // Determine growth stage based on gratitude count
      if (newGratitudeCount >= 15) newStage = "mature"
      else if (newGratitudeCount >= 10) newStage = "blooming"
      else if (newGratitudeCount >= 5) newStage = "growing"
      else if (newGratitudeCount >= 2) newStage = "sprout"

      return {
        ...plant,
        gratitudeCount: newGratitudeCount,
        stage: newStage,
      }
    })

    // Add new plant every 5 gratitude entries
    if (totalGratitude > 0 && (totalGratitude + 1) % 5 === 0) {
      const plantType = plantTypes[Math.floor(Math.random() * plantTypes.length)]
      const newPlant: Plant = {
        id: `plant-${Date.now()}`,
        type: plantType.type,
        stage: "seed",
        gratitudeCount: 0,
        color: plantType.colors[Math.floor(Math.random() * plantType.colors.length)],
        position: {
          x: Math.random() * 80 + 10,
          y: Math.random() * 60 + 20,
        },
      }
      updatedPlants.push(newPlant)
    }

    setPlants(updatedPlants)
    localStorage.setItem("gratitude-plants", JSON.stringify(updatedPlants))
  }

  const getPlantEmoji = (plant: Plant) => {
    const baseEmoji = plantTypes.find((p) => p.type === plant.type)?.emoji || "🌱"

    switch (plant.stage) {
      case "seed":
        return "🌰"
      case "sprout":
        return "🌱"
      case "growing":
        return plant.type === "tree" ? "🌲" : "🌿"
      case "blooming":
        return plant.type === "flower" ? "🌸" : plant.type === "tree" ? "🌳" : "🌿"
      case "mature":
        return baseEmoji
      default:
        return "🌱"
    }
  }

  const getRandomQuote = () => {
    return motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={() => router.push("/dashboard/games")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Games
          </Button>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">Garden Level {gardenLevel}</Badge>
            <Badge variant="outline">Gratitude Entries: {totalGratitude}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Garden Visualization */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flower className="h-5 w-5 text-green-600" />
                  Your Gratitude Garden
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Each gratitude entry helps your garden grow. Watch your plants flourish as you cultivate positivity!
                </p>
              </CardHeader>
              <CardContent>
                <div className="relative bg-gradient-to-b from-sky-100 to-green-100 rounded-lg h-96 overflow-hidden">
                  {/* Sky and sun */}
                  <div className="absolute top-4 right-4">
                    <Sun className="h-8 w-8 text-yellow-400" />
                  </div>

                  {/* Ground */}
                  <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-amber-100 to-green-100"></div>

                  {/* Plants */}
                  {plants.map((plant) => (
                    <div
                      key={plant.id}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 text-center"
                      style={{
                        left: `${plant.position.x}%`,
                        top: `${plant.position.y}%`,
                      }}
                    >
                      <div className="text-4xl mb-1 animate-pulse">{getPlantEmoji(plant)}</div>
                      <div className="text-xs bg-white/80 rounded px-2 py-1 shadow-sm">
                        {plant.gratitudeCount} gratitude
                      </div>
                    </div>
                  ))}

                  {/* Weather effects */}
                  {totalGratitude > 10 && (
                    <div className="absolute top-8 left-8">
                      <Droplets className="h-6 w-6 text-blue-400 animate-bounce" />
                    </div>
                  )}

                  {totalGratitude > 20 && (
                    <div className="absolute top-12 right-12">
                      <Sparkles className="h-6 w-6 text-yellow-400 animate-pulse" />
                    </div>
                  )}

                  {plants.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <Flower className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Your garden is waiting for its first gratitude entry!</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600 italic">"{getRandomQuote()}"</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gratitude Entry Form and History */}
          <div className="space-y-6">
            {/* Add Gratitude Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-pink-600" />
                  Add Gratitude
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!showAddForm ? (
                  <Button onClick={() => setShowAddForm(true)} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Share Something You're Grateful For
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Category</label>
                      <div className="grid grid-cols-2 gap-2">
                        {categories.map((category) => (
                          <Button
                            key={category.id}
                            size="sm"
                            variant={selectedCategory === category.id ? "default" : "outline"}
                            onClick={() => setSelectedCategory(category.id)}
                            className="text-xs"
                          >
                            <span className="mr-1">{category.icon}</span>
                            {category.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">What are you grateful for?</label>
                      <Textarea
                        value={newGratitude}
                        onChange={(e) => setNewGratitude(e.target.value)}
                        placeholder="I'm grateful for..."
                        className="min-h-[80px]"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={addGratitudeEntry} disabled={!newGratitude.trim()} className="flex-1">
                        Plant Gratitude
                      </Button>
                      <Button variant="outline" onClick={() => setShowAddForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Garden Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Garden Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Total Plants:</span>
                  <span className="font-medium">{plants.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Mature Plants:</span>
                  <span className="font-medium">{plants.filter((p) => p.stage === "mature").length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Garden Level:</span>
                  <span className="font-medium">{gardenLevel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Days Active:</span>
                  <span className="font-medium">
                    {gratitudeEntries.length > 0
                      ? Math.ceil(
                          (Date.now() - Math.min(...gratitudeEntries.map((e) => e.timestamp.getTime()))) /
                            (1000 * 60 * 60 * 24),
                        )
                      : 0}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Gratitude */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Gratitude</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {gratitudeEntries
                    .slice(-5)
                    .reverse()
                    .map((entry) => {
                      const category = categories.find((c) => c.id === entry.category)
                      return (
                        <div key={entry.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm">{category?.icon}</span>
                            <Badge variant="outline" className="text-xs">
                              {category?.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700">{entry.text}</p>
                          <p className="text-xs text-gray-500 mt-1">{entry.timestamp.toLocaleDateString()}</p>
                        </div>
                      )
                    })}

                  {gratitudeEntries.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No gratitude entries yet. Start by sharing something you're thankful for!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
