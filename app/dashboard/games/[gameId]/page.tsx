"use client"

import { useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Play } from "lucide-react"
import Link from "next/link"

export default function GamePage() {
  const { isAuthenticated, loading, patient } = useAuth()
  const router = useRouter()
  const params = useParams()
  const gameId = params.gameId as string

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, loading, router])

  // Redirect to specific game if it exists
  useEffect(() => {
    if (gameId === "mindfulness-maze") {
      router.push("/dashboard/games/mindfulness-maze")
    }
  }, [gameId, router])

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

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader patient={patient} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/games">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Games
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Game Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center py-12">
            <p className="text-gray-600 mb-6">
              The game "{gameId}" is not available yet. We're working on adding more games to help with your recovery
              journey.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/dashboard/games/mindfulness-maze">
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Play className="h-4 w-4 mr-2" />
                  Try Mindfulness Maze
                </Button>
              </Link>
              <Link href="/dashboard/games">
                <Button variant="outline">Browse All Games</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
