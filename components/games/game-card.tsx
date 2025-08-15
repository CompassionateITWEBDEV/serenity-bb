import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Clock, Trophy } from "lucide-react"

interface Game {
  id: string
  title: string
  description: string
  category: string
  difficulty: string
  duration: string
  icon: any
  color: string
  borderColor: string
  lastPlayed: string
  bestScore: number
  isNew: boolean
}

interface GameCardProps {
  game: Game
}

export function GameCard({ game }: GameCardProps) {
  const Icon = game.icon

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-100 text-green-800"
      case "Medium":
        return "bg-yellow-100 text-yellow-800"
      case "Hard":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Card className={`hover:shadow-lg transition-shadow border-2 ${game.borderColor} relative overflow-hidden`}>
      {game.isNew && (
        <div className="absolute top-3 right-3 z-10">
          <Badge className="bg-orange-500 text-white">New</Badge>
        </div>
      )}

      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-lg ${game.color}`}>
            <Icon className="h-6 w-6" />
          </div>
          <Badge variant="outline" className={getDifficultyColor(game.difficulty)}>
            {game.difficulty}
          </Badge>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2">{game.title}</h3>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{game.description}</p>

        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Category</span>
            <span className="font-medium text-gray-900">{game.category}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-gray-500">
              <Clock className="h-4 w-4" />
              Duration
            </div>
            <span className="font-medium text-gray-900">{game.duration}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Last Played</span>
            <span className="font-medium text-gray-900">{game.lastPlayed}</span>
          </div>

          {game.bestScore > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-gray-500">
                <Trophy className="h-4 w-4" />
                Best Score
              </div>
              <span className="font-medium text-gray-900">{game.bestScore}</span>
            </div>
          )}
        </div>

        <Link href={`/dashboard/games/${game.id}`}>
          <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white">
            {game.lastPlayed === "Never" ? "Start Playing" : "Continue Playing"}
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
