"use client"

import { useState, useEffect } from "react"
import { Trophy, Star, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface CelebrationProps {
  achievement: {
    title: string
    description: string
    icon: any
    color: string
  }
  onClose: () => void
}

export function AchievementCelebration({ achievement, onClose }: CelebrationProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300)
    }, 5000)

    return () => clearTimeout(timer)
  }, [onClose])

  const Icon = achievement.icon

  return (
    <div
      className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <Card className="w-full max-w-md mx-4 relative overflow-hidden">
        {/* Celebration animation background */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-100 via-orange-50 to-pink-100 animate-pulse" />

        {/* Floating sparkles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <Sparkles
              key={i}
              className={`absolute text-yellow-400 animate-bounce h-4 w-4`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random()}s`,
              }}
            />
          ))}
        </div>

        <CardContent className="relative z-10 text-center py-8 px-6">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4">
              <Icon className={`h-8 w-8 ${achievement.color}`} />
            </div>
            <Trophy className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Achievement Unlocked!</h2>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">{achievement.title}</h3>
          <p className="text-gray-600 mb-6">{achievement.description}</p>

          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Star className="h-4 w-4 text-yellow-500" />
              <span>You're making incredible progress!</span>
              <Star className="h-4 w-4 text-yellow-500" />
            </div>

            <Button onClick={onClose} className="w-full">
              Continue Journey
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
