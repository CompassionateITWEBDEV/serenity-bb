"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { GameCard } from "@/components/games/game-card"
import { GameStats } from "@/components/games/game-stats"
import { Gamepad2, Brain, Heart, Target, Puzzle, Zap } from "lucide-react"
import Link from "next/link"

export default function GamesPage() {
  const { isAuthenticated, loading, patient } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading games...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !patient) {
    return null
  }

  const games = [
    {
      id: "mindfulness-maze",
      title: "Mindfulness Maze",
      description: "Navigate through calming environments while practicing breathing exercises",
      category: "Mindfulness",
      difficulty: "Easy",
      duration: "5-10 min",
      icon: Brain,
      color: "bg-purple-100 text-purple-600",
      borderColor: "border-purple-200",
      lastPlayed: "2 hours ago",
      bestScore: 850,
      isNew: false,
    },
    {
      id: "emotion-explorer",
      title: "Emotion Explorer",
      description: "Identify and understand different emotions through interactive scenarios",
      category: "Emotional Wellness",
      difficulty: "Medium",
      duration: "10-15 min",
      icon: Heart,
      color: "bg-pink-100 text-pink-600",
      borderColor: "border-pink-200",
      lastPlayed: "1 day ago",
      bestScore: 720,
      isNew: false,
    },
    {
      id: "focus-challenge",
      title: "Focus Challenge",
      description: "Improve concentration with attention-building exercises and puzzles",
      category: "Cognitive Training",
      difficulty: "Medium",
      duration: "8-12 min",
      icon: Target,
      color: "bg-blue-100 text-blue-600",
      borderColor: "border-blue-200",
      lastPlayed: "3 days ago",
      bestScore: 640,
      isNew: false,
    },
    {
      id: "stress-buster",
      title: "Stress Buster",
      description: "Learn coping strategies through interactive stress management activities",
      category: "Stress Management",
      difficulty: "Easy",
      duration: "5-8 min",
      icon: Zap,
      color: "bg-yellow-100 text-yellow-600",
      borderColor: "border-yellow-200",
      lastPlayed: "Never",
      bestScore: 0,
      isNew: true,
    },
    {
      id: "memory-palace",
      title: "Memory Palace",
      description: "Build memory skills through engaging visual and spatial challenges",
      category: "Memory Training",
      difficulty: "Hard",
      duration: "15-20 min",
      icon: Puzzle,
      color: "bg-green-100 text-green-600",
      borderColor: "border-green-200",
      lastPlayed: "1 week ago",
      bestScore: 420,
      isNew: false,
    },
    {
      id: "gratitude-garden",
      title: "Gratitude Garden",
      description: "Cultivate positivity by growing a virtual garden of grateful thoughts",
      category: "Positive Psychology",
      difficulty: "Easy",
      duration: "10-15 min",
      icon: Heart,
      color: "bg-emerald-100 text-emerald-600",
      borderColor: "border-emerald-200",
      lastPlayed: "Never",
      bestScore: 0,
      isNew: true,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader patient={patient} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Gamepad2 className="h-8 w-8 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-bold text-gray-900">Recovery Games</h1>
              <p className="text-gray-600">Interactive activities to support your healing journey</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <GameStats />

        {/* Games Grid */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Available Games</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Game Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              {
                name: "Mindfulness",
                count: 2,
                color: "bg-purple-100 text-purple-700",
                href: "/dashboard/games?category=mindfulness",
              },
              {
                name: "Emotional Wellness",
                count: 2,
                color: "bg-pink-100 text-pink-700",
                href: "/dashboard/games?category=emotional",
              },
              {
                name: "Cognitive Training",
                count: 2,
                color: "bg-blue-100 text-blue-700",
                href: "/dashboard/games?category=cognitive",
              },
              {
                name: "Stress Management",
                count: 1,
                color: "bg-yellow-100 text-yellow-700",
                href: "/dashboard/games?category=stress",
              },
              {
                name: "Memory Training",
                count: 1,
                color: "bg-green-100 text-green-700",
                href: "/dashboard/games?category=memory",
              },
              {
                name: "Positive Psychology",
                count: 1,
                color: "bg-emerald-100 text-emerald-700",
                href: "/dashboard/games?category=positive",
              },
            ].map((category) => (
              <Link key={category.name} href={category.href}>
                <div
                  className={`p-4 rounded-lg text-center cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105 ${category.color}`}
                >
                  <div className="font-medium text-sm">{category.name}</div>
                  <div className="text-xs opacity-75 mt-1">{category.count} games</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
