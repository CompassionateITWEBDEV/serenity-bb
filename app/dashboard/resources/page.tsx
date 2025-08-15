"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BookOpen,
  Video,
  Headphones,
  FileText,
  Search,
  Download,
  ExternalLink,
  Clock,
  Star,
  Filter,
  Heart,
  Brain,
  Users,
  Shield,
} from "lucide-react"

export default function ResourcesPage() {
  const { isAuthenticated, loading, patient } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

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
          <p className="text-gray-600">Loading resources...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !patient) {
    return null
  }

  const categories = [
    { id: "all", name: "All Resources", icon: BookOpen, count: 24 },
    { id: "recovery", name: "Recovery", icon: Heart, count: 8 },
    { id: "mental-health", name: "Mental Health", icon: Brain, count: 6 },
    { id: "support", name: "Support Groups", icon: Users, count: 5 },
    { id: "safety", name: "Crisis Support", icon: Shield, count: 5 },
  ]

  const resources = [
    {
      id: 1,
      title: "Understanding Addiction Recovery",
      description: "Comprehensive guide to the recovery process and what to expect during treatment",
      type: "article",
      category: "recovery",
      duration: "15 min read",
      rating: 4.8,
      downloadable: true,
      featured: true,
      tags: ["Recovery", "Education", "Beginner"],
    },
    {
      id: 2,
      title: "Mindfulness Meditation for Recovery",
      description: "Guided meditation sessions specifically designed for addiction recovery",
      type: "audio",
      category: "mental-health",
      duration: "20 min",
      rating: 4.9,
      downloadable: true,
      featured: true,
      tags: ["Meditation", "Mindfulness", "Audio"],
    },
    {
      id: 3,
      title: "Family Support Workshop",
      description: "Video series on how families can support their loved ones in recovery",
      type: "video",
      category: "support",
      duration: "45 min",
      rating: 4.7,
      downloadable: false,
      featured: false,
      tags: ["Family", "Support", "Workshop"],
    },
    {
      id: 4,
      title: "Crisis Intervention Handbook",
      description: "Essential guide for managing crisis situations and emergency contacts",
      type: "document",
      category: "safety",
      duration: "10 min read",
      rating: 4.9,
      downloadable: true,
      featured: true,
      tags: ["Crisis", "Emergency", "Safety"],
    },
    {
      id: 5,
      title: "Relapse Prevention Strategies",
      description: "Practical techniques and tools to prevent relapse and maintain sobriety",
      type: "article",
      category: "recovery",
      duration: "12 min read",
      rating: 4.6,
      downloadable: true,
      featured: false,
      tags: ["Prevention", "Strategies", "Recovery"],
    },
    {
      id: 6,
      title: "Peer Support Group Sessions",
      description: "Weekly virtual support group meetings with other patients in recovery",
      type: "video",
      category: "support",
      duration: "60 min",
      rating: 4.8,
      downloadable: false,
      featured: false,
      tags: ["Peer Support", "Group", "Live"],
    },
  ]

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return Video
      case "audio":
        return Headphones
      case "document":
        return FileText
      default:
        return BookOpen
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "video":
        return "bg-red-100 text-red-600"
      case "audio":
        return "bg-purple-100 text-purple-600"
      case "document":
        return "bg-blue-100 text-blue-600"
      default:
        return "bg-green-100 text-green-600"
    }
  }

  const filteredResources = resources.filter((resource) => {
    const matchesSearch =
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory = selectedCategory === "all" || resource.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const featuredResources = resources.filter((resource) => resource.featured)

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader patient={patient} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <BookOpen className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-bold text-gray-900">Resource Library</h1>
              <p className="text-gray-600">Educational materials and support resources for your recovery journey</p>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search resources, topics, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {categories.map((category) => (
            <Card
              key={category.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedCategory === category.id ? "ring-2 ring-green-500 bg-green-50" : ""
              }`}
              onClick={() => setSelectedCategory(category.id)}
            >
              <CardContent className="p-4 text-center">
                <div
                  className={`p-3 rounded-lg mx-auto mb-3 w-fit ${
                    selectedCategory === category.id ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  <category.icon className="h-6 w-6" />
                </div>
                <div className="font-medium text-sm">{category.name}</div>
                <div className="text-xs text-gray-500 mt-1">{category.count} resources</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">All Resources</TabsTrigger>
            <TabsTrigger value="featured">Featured</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResources.map((resource) => {
                const TypeIcon = getTypeIcon(resource.type)
                return (
                  <Card key={resource.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className={`p-2 rounded-lg ${getTypeColor(resource.type)}`}>
                          <TypeIcon className="h-5 w-5" />
                        </div>
                        {resource.featured && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            Featured
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg">{resource.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-gray-600 text-sm">{resource.description}</p>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {resource.duration}
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          {resource.rating}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {resource.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button size="sm" className="flex-1">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        {resource.downloadable && (
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="featured" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {featuredResources.map((resource) => {
                const TypeIcon = getTypeIcon(resource.type)
                return (
                  <Card key={resource.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className={`p-3 rounded-lg ${getTypeColor(resource.type)}`}>
                          <TypeIcon className="h-6 w-6" />
                        </div>
                        <Badge className="bg-yellow-100 text-yellow-800">Featured</Badge>
                      </div>
                      <CardTitle className="text-xl">{resource.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-gray-600">{resource.description}</p>

                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {resource.duration}
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          {resource.rating}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {resource.tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex gap-3 pt-4">
                        <Button className="flex-1">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Resource
                        </Button>
                        {resource.downloadable && (
                          <Button variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
