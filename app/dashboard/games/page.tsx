"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import GameCard from "@/components/games/game-card";   // must be default export
import GameStats from "@/components/games/game-stats"; // must be default export
import { Gamepad2 } from "lucide-react";
import Link from "next/link";

/** ---------- Types ---------- */
type Game = {
  id: string;
  title: string;
  category: string;
  rating?: number | null;
  completed?: boolean;
};

type PatientGamesResponse = {
  patientId: string;
  games: Game[];
  totals: { total: number; completed: number; backlog: number; avgRating: number | null };
};

/** ---------- Error Boundary (find the real offender fast) ---------- */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // why: surface the exact component/stack that crashed (prod-friendly)
    console.error("[GamesPage ErrorBoundary]", error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="max-w-2xl mx-auto mt-16 p-6 rounded-xl border bg-white">
          <h2 className="text-lg font-semibold text-red-700">Something crashed on this page</h2>
          <p className="text-sm text-gray-700 mt-2">
            We couldn’t render one of the widgets. The team has been notified.
          </p>
          <pre className="mt-4 text-xs overflow-auto max-h-64 whitespace-pre-wrap">
            {this.state.error.message}
          </pre>
          <button
            className="mt-4 px-3 py-1.5 rounded-md border hover:bg-gray-50"
            onClick={() => location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** ---------- Fetch util ---------- */
async function jsonFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => res.statusText)}`);
  return res.json() as Promise<T>;
}

/** ---------- Page ---------- */
export default function GamesPage() {
  const { isAuthenticated, loading, patient } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<PatientGamesResponse | null>(null);
  const [isLoadingRemote, setIsLoadingRemote] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auth gate
  useEffect(() => {
    if (!loading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, loading, router]);

  // Live polling (no external libs)
  useEffect(() => {
    if (!patient?.id) return;

    let mounted = true;
    const url = `/api/patient/games?patientId=${encodeURIComponent(patient.id)}`;

    const load = async (initial = false) => {
      try {
        initial ? setIsLoadingRemote(true) : setIsValidating(true);
        const next = await jsonFetcher<PatientGamesResponse>(url);
        if (mounted) {
          // defensive: ensure array + required fields
          const safeGames = Array.isArray(next.games)
            ? next.games.filter(Boolean).map((g) => ({
                id: String(g.id ?? ""),
                title: String(g.title ?? "Untitled"),
                category: String(g.category ?? "Uncategorized"),
                rating: g.rating ?? null,
                completed: !!g.completed,
              }))
            : [];
          setData({
            patientId: String(next.patientId ?? ""),
            games: safeGames,
            totals: next.totals ?? { total: safeGames.length, completed: 0, backlog: safeGames.length, avgRating: null },
          });
          setError(null);
        }
      } catch (e) {
        if (mounted) setError(e as Error);
      } finally {
        if (mounted) {
          setIsLoadingRemote(false);
          setIsValidating(false);
        }
      }
    };

    load(true);

    intervalRef.current = setInterval(() => load(false), 5000);
    const onVis = () => document.visibilityState === "visible" && load(false);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      mounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [patient?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading session…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !patient) return null;

  const games = data?.games ?? [];
  const totals = data?.totals ?? { total: 0, completed: 0, backlog: 0, avgRating: null };

  // Minimal shape for GameStats (guaranteed stable)
  const statsInput = useMemo(
    () => games.map((g) => ({ completed: !!g.completed, rating: g.rating ?? null })),
    [games]
  );

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader patient={patient} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Title */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Gamepad2 className="h-8 w-8 text-purple-600" />
              </div>
              <div>
                <h1 className="text-3xl font-serif font-bold text-gray-900">Recovery Games</h1>
                <p className="text-gray-600">
                  Interactive activities to support your healing journey
                  {isValidating ? <span className="ml-2 text-xs text-gray-500">(updating…)</span> : null}
                </p>
              </div>
            </div>

            {/* Summary + manual refresh */}
            <div className="flex items-center gap-3 text-sm text-gray-600">
              {isLoadingRemote
                ? "Loading games…"
                : error
                ? `Error loading games: ${error.message}`
                : `${totals.total} games • ${totals.completed} completed • ${totals.backlog} backlog`}
              <button
                onClick={() => {
                  if (!patient?.id) return;
                  const url = `/api/patient/games?patientId=${encodeURIComponent(patient.id)}`;
                  setIsValidating(true);
                  jsonFetcher<PatientGamesResponse>(url)
                    .then((next) => {
                      setData(next);
                      setError(null);
                    })
                    .catch((e) => setError(e as Error))
                    .finally(() => setIsValidating(false));
                }}
                className="ml-3 px-3 py-1.5 rounded-md border hover:bg-gray-50"
                aria-label="Refresh"
                title="Refresh"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Stats (defensive) */}
          <section className="mb-8">
            <GameStats games={Array.isArray(statsInput) ? statsInput : []} />
          </section>

          {/* Games Grid (defensive) */}
          <section className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Available Games</h2>
            {error ? (
              <div className="text-sm text-red-600">Failed to load games.</div>
            ) : games.length === 0 && !isLoadingRemote ? (
              <div className="text-sm text-gray-600">No games yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {games.map((g) =>
                  g?.id ? (
                    <GameCard
                      key={g.id}
                      game={{
                        id: String(g.id),
                        title: String(g.title ?? "Untitled"),
                        rating: g.rating ?? null,
                        completed: !!g.completed,
                      }}
                    />
                  ) : null
                )}
              </div>
            )}
          </section>

          {/* Categories */}
          <section className="mt-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Game Categories</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {getCategoriesFrom(games).map((c) => (
                <Link key={c.name} href={`/dashboard/games?category=${encodeURIComponent(c.name)}`}>
                  <div
                    className={`p-4 rounded-lg text-center cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105 ${c.color}`}
                  >
                    <div className="font-medium text-sm">{c.name}</div>
                    <div className="text-xs opacity-75 mt-1">{c.count} games</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </main>
      </div>
    </ErrorBoundary>
  );
}
