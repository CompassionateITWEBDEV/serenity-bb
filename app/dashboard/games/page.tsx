"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import GameCard from "@/components/games/game-card";       // ✅ default import
import GameStats from "@/components/games/game-stats";     // ✅ default import
import { Gamepad2 } from "lucide-react";
import Link from "next/link";
import { useGamesCatalog } from "@/hooks/use-games-catalog";
import { usePatientGameSessions } from "@/hooks/use-patient-game-sessions";

export default function GamesPage() {
  const { isAuthenticated, loading: authLoading, patient } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading games…</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated || !patient) return null;

  // Real-time data
  const { games: catalog, loading: catLoading, error: catErr, envOk: env1 } = useGamesCatalog();
  const { sessions, loading: sesLoading, error: sesErr, envOk: env2 } =
    usePatientGameSessions(patient.id);

  const envOk = env1 && env2;

  // Played if any session exists for that game
  const playedSet = useMemo(() => new Set(sessions.map((s) => s.game_id)), [sessions]);

  // Minimal shape for stats: only {completed, rating?}
  const statsInput = useMemo(
    () => catalog.map((g) => ({ completed: playedSet.has(g.id), rating: null as number | null })),
    [catalog, playedSet]
  );

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

          {!envOk && (
            <div className="rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
              Supabase env not set (or realtime blocked). Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>. Page will not crash, but will show empty data.
            </div>
          )}
          {catErr && <div className="text-sm text-red-600">Catalog error: {catErr}</div>}
          {sesErr && <div className="text-sm text-red-600">Sessions error: {sesErr}</div>}
        </div>

        {/* ✅ Stats must receive props */}
        <GameStats games={statsInput} />
        {(catLoading || sesLoading) && (
          <div className="mt-2 text-xs text-gray-500">Syncing in real time…</div>
        )}

        {/* Games Grid */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Available Games</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {catalog.map((game) => (
              <div key={game.id} className="relative">
                {playedSet.has(game.id) && (
                  <span className="absolute -top-2 -right-2 rounded-full border bg-green-50 text-green-700 text-xs px-2 py-0.5">
                    Played
                  </span>
                )}
                <GameCard
                  game={{
                    id: game.id,
                    title: game.title,
                    completed: playedSet.has(game.id),
                    rating: null,
                  }}
                />
              </div>
            ))}
            {!catLoading && catalog.length === 0 && envOk && (
              <div className="col-span-full text-sm text-gray-500">
                No games available. Seed the <code>public.games</code> table.
              </div>
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Game Categories</h2>
        </div>
      </main>
    </div>
  );
}
