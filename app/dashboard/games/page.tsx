// app/dashboard/games/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";

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
} from "lucide-react";

function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push("/dashboard")} // explicit nav (vs. browser history)
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors text-sm"
      aria-label="Back to dashboard"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Dashboard
    </button>
  );
}

// GameStats Component
function GameStats({ games }: { games: Array<{ completed: boolean; rating: number | null }> }) {
  const totalGames = games.length;
  const completedGames = games.filter(g => g.completed).length;
  const averageRating = games
    .filter(g => g.rating !== null)
    .reduce((acc, g, _, arr) => acc + (g.rating || 0) / arr.length, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-3 rounded-lg">
            <Gamepad2 className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{totalGames}</h3>
            <p className="text-gray-600">Total Games</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 p-3 rounded-lg">
            <Trophy className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{completedGames}</h3>
            <p className="text-gray-600">Games Completed</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-100 p-3 rounded-lg">
            <Star className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              {averageRating ? averageRating.toFixed(1) : "N/A"}
            </h3>
            <p className="text-gray-600">Average Rating</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// GameCard Component
function GameCard({ game }: { 
  game: { 
    id: string; 
    title: string; 
    genre: string; 
    rating?: number; 
    completed: boolean 
  } 
}) {
  const gameData = games.find(g => g.id === game.id);
  const IconComponent = gameData?.icon || Gamepad2;
  
  return (
    <div className={`bg-white rounded-lg shadow-sm border hover:shadow-md transition-all duration-200 hover:scale-105 ${gameData?.borderColor || 'border-gray-200'}`}>
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-lg ${gameData?.color || 'bg-gray-100 text-gray-600'}`}>
            <IconComponent className="h-6 w-6" />
          </div>
          {gameData?.isNew && (
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
              New
            </span>
          )}
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{game.title}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {gameData?.description || "An engaging recovery game"}
        </p>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>{gameData?.duration || "5-10 min"}</span>
          </div>
          <div className="text-sm text-gray-500">
            {gameData?.difficulty || "Medium"}
          </div>
        </div>
        
        {gameData?.bestScore ? (
          <div className="flex items-center justify-between mb-4 text-sm">
            <span className="text-gray-600">Best Score:</span>
            <span className="font-medium text-gray-900">{gameData.bestScore}</span>
          </div>
        ) : null}
        
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Last played: {gameData?.lastPlayed || "Never"}
          </div>
          <Link 
            href={`/dashboard/games/${game.id}`}
            className="inline-flex items-center gap-2 bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-cyan-700 transition-colors"
          >
            <Play className="h-4 w-4" />
            Play
          </Link>
        </div>
      </div>
    </div>
  );
}

// Games data
const games = [
  {
    id: "mindfulness-maze",
    title: "Mindfulness Maze",
    description:
      "Navigate through calming environments while practicing breathing exercises",
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
    description:
      "Identify and understand different emotions through interactive scenarios",
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
    description:
      "Improve concentration with attention-building exercises and puzzles",
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
    description:
      "Learn coping strategies through interactive stress management activities",
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
    description:
      "Build memory skills through engaging visual and spatial challenges",
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
    description:
      "Cultivate positivity by growing a virtual garden of grateful thoughts",
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
];

export default function GamesPage() {
  const { isAuthenticated, loading, patient } = useAuth();
  const router = useRouter();

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

  const statsInput = games.map(() => ({ completed: false, rating: null as number | null }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-cyan-600">
            <HeartIcon className="h-6 w-6" />
            <span className="font-serif font-bold">
              Serenity Rehabilitation Center
            </span>
          </Link>
          <div className="text-sm text-gray-600">
            Welcome{patient?.firstName ? `, ${patient.firstName}` : ""}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Gamepad2 className="h-8 w-8 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-bold text-gray-900">
                Recovery Games
              </h1>
              <p className="text-gray-600">
                Interactive activities to support your healing journey
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <section className="mb-8">
          <GameStats games={statsInput} />
        </section>

        {/* Games Grid */}
        <section className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Available Games
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => (
              <GameCard
                key={game.id}
                game={{
                  id: game.id,
                  title: game.title,
                  genre: game.category,
                  rating: undefined,
                  completed: false,
                }}
              />
            ))}
          </div>
        </section>

        {/* Categories */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Game Categories
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { name: "Mindfulness", count: 2, color: "bg-purple-100 text-purple-700", href: "/dashboard/games?category=mindfulness" },
              { name: "Emotional Wellness", count: 2, color: "bg-pink-100 text-pink-700", href: "/dashboard/games?category=emotional" },
              { name: "Cognitive Training", count: 2, color: "bg-blue-100 text-blue-700", href: "/dashboard/games?category=cognitive" },
              { name: "Stress Management", count: 1, color: "bg-yellow-100 text-yellow-700", href: "/dashboard/games?category=stress" },
              { name: "Memory Training", count: 1, color: "bg-green-100 text-green-700", href: "/dashboard/games?category=memory" },
              { name: "Positive Psychology", count: 1, color: "bg-emerald-100 text-emerald-700", href: "/dashboard/games?category=positive" },
            ].map((c) => (
              <Link key={c.name} href={c.href}>
                <div className={`p-4 rounded-lg text-center cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105 ${c.color}`}>
                  <div className="font-medium text-sm">{c.name}</div>
                  <div className="text-xs opacity-75 mt-1">{c.count} games</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
