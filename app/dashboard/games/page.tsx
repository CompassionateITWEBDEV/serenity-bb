"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Gamepad2,
  Brain,
  Heart,
  Target,
  Puzzle,
  Zap,
  Heart as HeartIcon,
  Trophy,
  Clock,
  Star,
  Play,
  ArrowLeft,
  TrendingUp,
  Award,
  Calendar,
  Filter,
  Search,
} from "lucide-react";

// ---------------- Back Button ----------------
function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push("/dashboard")} // explicit nav to dashboard
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors text-sm"
      aria-label="Back to dashboard"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Dashboard
    </button>
  );
}

// ---------------- Stats ----------------
function GameStats({
  games,
}: {
  games: Array<{ completed: boolean; rating: number | null; progress: number; totalPlays: number }>;
}) {
  const totalGames = games.length;
  const completedGames = games.filter((g) => g.completed).length;
  const averageRating = games
    .filter((g) => g.rating !== null && g.rating > 0)
    .reduce((acc, g, _, arr) => acc + (g.rating || 0) / arr.length, 0);
  const totalPlays = games.reduce((acc, g) => acc + g.totalPlays, 0);
  const averageProgress = games.reduce((acc, g) => acc + g.progress, 0) / games.length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-3xl font-bold text-gray-900">{totalGames}</h3>
              <p className="text-sm text-gray-600 font-medium">Total Games</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-xl">
              <Gamepad2 className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-3xl font-bold text-gray-900">{completedGames}</h3>
              <p className="text-sm text-gray-600 font-medium">Games Completed</p>
            </div>
            <div className="bg-green-100 p-3 rounded-xl">
              <Trophy className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-3xl font-bold text-gray-900">
                {averageRating ? averageRating.toFixed(1) : "N/A"}
              </h3>
              <p className="text-sm text-gray-600 font-medium">Average Rating</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-xl">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-3xl font-bold text-gray-900">{totalPlays}</h3>
              <p className="text-sm text-gray-600 font-medium">Total Plays</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-xl">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------- Data ----------------
const games = [
  {
    id: "mindfulness-maze",
    title: "Mindfulness Maze",
    description:
      "Navigate through calming environments while practicing breathing exercises",
    category: "Mindfulness",
    difficulty: "Easy",
    difficultyLevel: 1,
    duration: "5-10 min",
    icon: Brain,
    color: "bg-purple-100 text-purple-600",
    borderColor: "border-purple-200",
    bgGradient: "from-purple-50 to-purple-100",
    lastPlayed: "2 hours ago",
    bestScore: 850,
    totalPlays: 12,
    averageRating: 4.5,
    isNew: false,
    isCompleted: false,
    progress: 75,
  },
  {
    id: "emotion-explorer",
    title: "Emotion Explorer",
    description:
      "Identify and understand different emotions through interactive scenarios",
    category: "Emotional Wellness",
    difficulty: "Medium",
    difficultyLevel: 2,
    duration: "10-15 min",
    icon: Heart,
    color: "bg-pink-100 text-pink-600",
    borderColor: "border-pink-200",
    bgGradient: "from-pink-50 to-pink-100",
    lastPlayed: "1 day ago",
    bestScore: 720,
    totalPlays: 8,
    averageRating: 4.2,
    isNew: false,
    isCompleted: false,
    progress: 60,
  },
  {
    id: "focus-challenge",
    title: "Focus Challenge",
    description:
      "Improve concentration with attention-building exercises and puzzles",
    category: "Cognitive Training",
    difficulty: "Medium",
    difficultyLevel: 2,
    duration: "8-12 min",
    icon: Target,
    color: "bg-blue-100 text-blue-600",
    borderColor: "border-blue-200",
    bgGradient: "from-blue-50 to-blue-100",
    lastPlayed: "3 days ago",
    bestScore: 640,
    totalPlays: 15,
    averageRating: 4.0,
    isNew: false,
    isCompleted: true,
    progress: 100,
  },
  {
    id: "stress-buster",
    title: "Stress Buster",
    description:
      "Learn coping strategies through interactive stress management activities",
    category: "Stress Management",
    difficulty: "Easy",
    difficultyLevel: 1,
    duration: "5-8 min",
    icon: Zap,
    color: "bg-yellow-100 text-yellow-600",
    borderColor: "border-yellow-200",
    bgGradient: "from-yellow-50 to-yellow-100",
    lastPlayed: "Never",
    bestScore: 0,
    totalPlays: 0,
    averageRating: 0,
    isNew: true,
    isCompleted: false,
    progress: 0,
  },
  {
    id: "memory-palace",
    title: "Memory Palace",
    description:
      "Build memory skills through engaging visual and spatial challenges",
    category: "Memory Training",
    difficulty: "Hard",
    difficultyLevel: 3,
    duration: "15-20 min",
    icon: Puzzle,
    color: "bg-green-100 text-green-600",
    borderColor: "border-green-200",
    bgGradient: "from-green-50 to-green-100",
    lastPlayed: "1 week ago",
    bestScore: 420,
    totalPlays: 5,
    averageRating: 3.8,
    isNew: false,
    isCompleted: false,
    progress: 30,
  },
  {
    id: "gratitude-garden",
    title: "Gratitude Garden",
    description:
      "Cultivate positivity by growing a virtual garden of grateful thoughts",
    category: "Positive Psychology",
    difficulty: "Easy",
    difficultyLevel: 1,
    duration: "10-15 min",
    icon: Heart,
    color: "bg-emerald-100 text-emerald-600",
    borderColor: "border-emerald-200",
    bgGradient: "from-emerald-50 to-emerald-100",
    lastPlayed: "Never",
    bestScore: 0,
    totalPlays: 0,
    averageRating: 0,
    isNew: true,
    isCompleted: false,
    progress: 0,
  },
];

// ---------------- Card ----------------
function GameCard({
  game,
}: {
  game: {
    id: string;
    title: string;
    genre: string;
    rating?: number;
    completed: boolean;
  };
}) {
  const gameData = games.find((g) => g.id === game.id);
  const IconComponent = (gameData?.icon as React.ElementType) || Gamepad2;

  const getDifficultyColor = (level: number) => {
    switch (level) {
      case 1: return "bg-green-100 text-green-800";
      case 2: return "bg-yellow-100 text-yellow-800";
      case 3: return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card className={`group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${gameData?.borderColor || "border-gray-200"}`}>
      <CardContent className="p-0">
        {/* Header with gradient background */}
        <div className={`bg-gradient-to-br ${gameData?.bgGradient || "from-gray-50 to-gray-100"} p-6 rounded-t-lg`}>
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl shadow-sm ${gameData?.color || "bg-gray-100 text-gray-600"}`}>
              <IconComponent className="h-7 w-7" />
            </div>
            <div className="flex items-center gap-2">
              {gameData?.isNew && (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  New
                </Badge>
              )}
              {gameData?.isCompleted && (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  <Award className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
              )}
            </div>
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
            {game.title}
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            {gameData?.description || "An engaging recovery game"}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">{gameData?.duration || "5-10 min"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge className={`text-xs ${getDifficultyColor(gameData?.difficultyLevel || 1)}`}>
                {gameData?.difficulty || "Medium"}
              </Badge>
            </div>
          </div>

          {/* Progress Bar */}
          {gameData?.progress !== undefined && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium text-gray-900">{gameData.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${gameData.progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${gameData.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Score and Rating */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {gameData?.bestScore ? (
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span className="text-gray-600">Best:</span>
                <span className="font-semibold text-gray-900">{gameData.bestScore}</span>
              </div>
            ) : (
              <div className="text-gray-400">No score yet</div>
            )}
            
            {gameData?.averageRating ? (
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-gray-600">Rating:</span>
                <span className="font-semibold text-gray-900">{gameData.averageRating.toFixed(1)}</span>
              </div>
            ) : (
              <div className="text-gray-400">No rating yet</div>
            )}
          </div>

          {/* Last Played */}
          <div className="text-sm text-gray-500">
            Last played: {gameData?.lastPlayed || "Never"}
          </div>

          {/* Play Button */}
          <div className="pt-2">
            <Link href={`/dashboard/games/${game.id}`}>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 group-hover:shadow-lg">
                <Play className="h-4 w-4 mr-2" />
                {gameData?.isCompleted ? "Play Again" : "Play Now"}
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------- Page ----------------
export default function GamesPage() {
  const { isAuthenticated, loading, patient } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("name");

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading games...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !patient) return null;

  // Filter and sort games
  const filteredGames = games
    .filter((game) => {
      const matchesSearch = game.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           game.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "all" || game.category.toLowerCase() === selectedCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.title.localeCompare(b.title);
        case "difficulty":
          return a.difficultyLevel - b.difficultyLevel;
        case "progress":
          return b.progress - a.progress;
        case "rating":
          return (b.averageRating || 0) - (a.averageRating || 0);
        default:
          return 0;
      }
    });

  const statsInput = games.map((game) => ({
    completed: game.isCompleted,
    rating: game.averageRating,
    progress: game.progress,
    totalPlays: game.totalPlays,
  }));

  const categories = [
    { name: "All", value: "all", count: games.length },
    { name: "Mindfulness", value: "mindfulness", count: games.filter(g => g.category === "Mindfulness").length },
    { name: "Emotional Wellness", value: "emotional wellness", count: games.filter(g => g.category === "Emotional Wellness").length },
    { name: "Cognitive Training", value: "cognitive training", count: games.filter(g => g.category === "Cognitive Training").length },
    { name: "Stress Management", value: "stress management", count: games.filter(g => g.category === "Stress Management").length },
    { name: "Memory Training", value: "memory training", count: games.filter(g => g.category === "Memory Training").length },
    { name: "Positive Psychology", value: "positive psychology", count: games.filter(g => g.category === "Positive Psychology").length },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-cyan-600 hover:text-cyan-700 transition-colors">
            <HeartIcon className="h-6 w-6" />
            <span className="font-serif font-bold">
              Serenity Rehabilitation Center
            </span>
          </Link>
          <div className="text-sm text-gray-600">
            {`Welcome${patient?.firstName ? `, ${patient.firstName}` : ""}`}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back */}
        <div className="mb-6">
          <BackButton />
        </div>

        {/* Title */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-purple-100 p-3 rounded-xl">
              <Gamepad2 className="h-8 w-8 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Recovery Games
              </h1>
              <p className="text-gray-600 mt-1">
                Interactive activities to support your healing journey
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <section className="mb-8">
          <GameStats games={statsInput} />
        </section>

        {/* Search and Filters */}
        <section className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search games..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="md:w-48">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.name} ({category.count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <div className="md:w-48">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="name">Sort by Name</option>
                  <option value="difficulty">Sort by Difficulty</option>
                  <option value="progress">Sort by Progress</option>
                  <option value="rating">Sort by Rating</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Games Grid */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Available Games ({filteredGames.length})
            </h2>
            {searchTerm && (
              <Button
                variant="outline"
                onClick={() => setSearchTerm("")}
                className="text-sm"
              >
                Clear Search
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGames.map((game) => (
              <GameCard
                key={game.id}
                game={{
                  id: game.id,
                  title: game.title,
                  genre: game.category,
                  rating: game.averageRating,
                  completed: game.isCompleted,
                }}
              />
            ))}
          </div>
          {filteredGames.length === 0 && (
            <div className="text-center py-12">
              <Gamepad2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg text-gray-500 font-medium">No games found</p>
              <p className="text-sm text-gray-400 mt-2">Try adjusting your search or filters</p>
            </div>
          )}
        </section>

        {/* Categories */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Game Categories
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
            {categories.map((c) => (
              <button
                key={c.value}
                onClick={() => setSelectedCategory(c.value)}
                className={`p-4 rounded-lg text-center cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105 ${
                  selectedCategory === c.value
                    ? "bg-blue-100 text-blue-700 border-2 border-blue-200"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <div className="font-medium text-sm">{c.name}</div>
                <div className="text-xs opacity-75 mt-1">{c.count} games</div>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
