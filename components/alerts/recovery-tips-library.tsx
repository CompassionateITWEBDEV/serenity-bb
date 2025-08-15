"use client"

import { useState } from "react"
import { Search, BookOpen, Heart, Brain, Users, Utensils, Activity } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useContextualAlerts } from "@/hooks/use-smart-alerts"

interface RecoveryTip {
  id: string
  category: "mental-health" | "physical-health" | "social" | "nutrition" | "medication" | "lifestyle"
  title: string
  content: string
  tags: string[]
  difficulty: "beginner" | "intermediate" | "advanced"
}

const recoveryTips: RecoveryTip[] = [
  {
    id: "breathing-exercise",
    category: "mental-health",
    title: "4-7-8 Breathing Technique",
    content:
      "Inhale for 4 counts, hold for 7 counts, exhale for 8 counts. This activates your body's relaxation response and can help manage anxiety or cravings.",
    tags: ["anxiety", "stress", "breathing", "quick-relief"],
    difficulty: "beginner",
  },
  {
    id: "grounding-technique",
    category: "mental-health",
    title: "5-4-3-2-1 Grounding Method",
    content:
      "When feeling overwhelmed, identify 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste. This brings you back to the present moment.",
    tags: ["grounding", "mindfulness", "anxiety", "present-moment"],
    difficulty: "beginner",
  },
  {
    id: "progressive-muscle-relaxation",
    category: "physical-health",
    title: "Progressive Muscle Relaxation",
    content:
      "Starting with your toes, tense each muscle group for 5 seconds, then release. Work your way up to your head. This helps release physical tension and promotes relaxation.",
    tags: ["relaxation", "tension", "sleep", "stress-relief"],
    difficulty: "intermediate",
  },
  {
    id: "social-connection",
    category: "social",
    title: "Daily Connection Practice",
    content:
      "Reach out to one supportive person each day, even if just to say hello. Social connections are vital for recovery and mental health.",
    tags: ["support", "relationships", "connection", "daily-practice"],
    difficulty: "beginner",
  },
  {
    id: "meal-planning",
    category: "nutrition",
    title: "Recovery-Focused Meal Planning",
    content:
      "Plan meals that include protein, complex carbs, and healthy fats. Stable blood sugar helps maintain stable mood and reduces cravings.",
    tags: ["nutrition", "meal-prep", "blood-sugar", "cravings"],
    difficulty: "intermediate",
  },
  {
    id: "medication-routine",
    category: "medication",
    title: "Medication Adherence Strategy",
    content:
      "Use pill organizers, phone alarms, and link medication times to daily activities (like meals) to build consistent habits.",
    tags: ["medication", "routine", "adherence", "habits"],
    difficulty: "beginner",
  },
]

const categoryIcons = {
  "mental-health": Brain,
  "physical-health": Heart,
  social: Users,
  nutrition: Utensils,
  medication: BookOpen,
  lifestyle: Activity,
}

const categoryColors = {
  "mental-health": "bg-purple-100 text-purple-800",
  "physical-health": "bg-red-100 text-red-800",
  social: "bg-blue-100 text-blue-800",
  nutrition: "bg-green-100 text-green-800",
  medication: "bg-orange-100 text-orange-800",
  lifestyle: "bg-cyan-100 text-cyan-800",
}

export function RecoveryTipsLibrary() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const { triggerEducationalTip } = useContextualAlerts()

  const filteredTips = recoveryTips.filter((tip) => {
    const matchesSearch =
      tip.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tip.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tip.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCategory = !selectedCategory || tip.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  const categories = Array.from(new Set(recoveryTips.map((tip) => tip.category)))

  const sendTipAsAlert = (tip: RecoveryTip) => {
    triggerEducationalTip(tip.title, tip.content)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search recovery tips..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categories.map((category) => {
            const Icon = categoryIcons[category as keyof typeof categoryIcons]
            return (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="flex items-center gap-1"
              >
                <Icon className="h-3 w-3" />
                {category.replace("-", " ")}
              </Button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTips.map((tip) => {
          const Icon = categoryIcons[tip.category]
          return (
            <Card key={tip.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    {tip.title}
                  </CardTitle>
                  <Badge className={categoryColors[tip.category]}>{tip.category.replace("-", " ")}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600 leading-relaxed">{tip.content}</p>

                <div className="flex flex-wrap gap-1">
                  {tip.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2">
                  <Badge variant="outline" className="text-xs">
                    {tip.difficulty}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => sendTipAsAlert(tip)}>
                    Send as Alert
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredTips.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No tips found matching your search criteria.</p>
        </div>
      )}
    </div>
  )
}
