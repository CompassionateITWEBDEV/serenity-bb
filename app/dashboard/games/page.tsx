"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Gamepad2, Heart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth"; // keep your existing auth hook

/* =========================
   Types
   ========================= */
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

/* =========================
   Utilities
   ========================= */
async function jsonFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => res.statusText)}`);
  return res.json() as Promise<T>;
}

/* =========================
   Local, safe components
   (no external imports)
   ========================= */

/** Minimal card – no external UI libs, no conditional hooks */
function LocalGameCard({ game, onToggle }: { game: Game; onToggle?: (id: string, next: boolean) => void }) {
  const [completed, setCompleted] = useState<boolean>(!!game.completed);
  const toggle = () => {
    const next = !completed;
    setCompleted(next);
    onToggle?.(game.id, next);
  };
  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      <div className="p-4 flex gap-4">
        <div className="h-24 w-24 rounded-xl bg-gray-200 flex items-center justify-center text-xs">No Art</div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold leading-tight">{game.title || "Untitled"}</h3>
              <p className="text-sm text-gray-500">{game.category || "Uncategorized"}</p>
            </div>
            <button
              onClick={toggle}
              className={`px-3 py-1 rounded-full text-sm border ${
                completed ? "bg-green-100 border-green-300" : "bg-white"
              }`}
            >
              {completed ? "Completed" : "Mark complete"}
            </button>
          </div>
          {typeof game.rating === "number" ? (
            <p className="mt-2 text-sm">Rating: {game.rating.toFixed(1)}/5</p>
          ) : (
            <p className="mt-2 text-sm text-gray-500">No rating</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Local stats – accepts minimal array, no external hook */
function LocalGameStats({ games }: { games: { completed?: boolean; rating?: number | null }[] }) {
  const total = games.length;
  const completed = games.filter((g) => !!g.completed).length;
  const backlog = total - completed;
  const ratings = games.map((g) => g.rating).filter((n): n is number => n != null);
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

  const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="rounded-2xl border p-4 bg-white">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Stat label="Total" value={total} />
      <Stat label="Completed" value={completed} />
      <Stat label="Backlog" value={backlog} />
      <Stat label="Avg Rating" value={avg == null ? "—" : avg.toFixed(2)} />
    </div>
  );
}

/** Local header to avoid importing a Server Component by accident */
function LocalHeader({ patient }: { patient: { firstName?: string } | null | undefined }) {
  return (
    <header className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 text-cyan-600">
          <Heart className="h-6 w-6" />
          <span className="font-serif font-bold">Serenity Rehabilitation Center</span>
        </Link>
        <div className="text-sm text-gray-600">Welcome{patient?.firstName ? `, ${patient.firstName}` : ""}</div>
      </div>
    </header>
  );
}

/* =========================
   Page
   ========================= */
export default function GamesPage() {
  const { isAuthenticated, loading, patient } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<PatientGamesResponse | null>(null);
  const [isLoadingRemote, setIsLoadingRemote] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auth redirect
  useEffect(() => {
    if (!loading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, loading, router]);

  // Live polling fetch
  useEffect(() => {
    if (!patient?.id) return;

    let mounted = true;
    const url = `/api/patient/games?patientId=${encodeURIComponent(patient.id)}`;

    const load = async (initial = false) => {
      try {
        initial ? setIsLoadingRemote(true) : setIsValidating(true);
        const next = await jsonFetcher<PatientGamesResponse>(url);
        if (!mounted) return;

        const safeGames = Array.isArray(next.games)
          ? next.games.filter(Boolean).map((g) => ({
              id: String(g?.id ?? ""),
              title: String(g?.title ?? "Untitled"),
              category: String(g?.category ?? "Uncategorized"),
              rating: g?.rating ?? null,
              completed: !!g?.completed,
            }))
          : [];

        setData({
          patientId: String(next?.patientId ?? patient.id),
          games: safeGames,
          totals:
            next?.totals ?? {
              total: safeGames.length,
              completed: safeGames.filter((x) => x.completed).length,
              backlog: safeGames.filter((x) => !x.completed).length,
              avgRating: null,
            },
        });
        setError(null);
      } catch (e) {
        setError(e as Error);
      } finally {
        setIsLoadingRemote(false);
        setIsValidating(false);
      }
    };

    load(true);
    intervalRef.current = setInterval(() => load(false), 5000);
    const onVis = () => document.visibilityState === "visible" && load(false);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVis);
      mounted = false;
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

  const statsInput = games.map((g) => ({ completed: !!g.completed, rating: g.rating ?? null }));

  return (
    <div className="min-h-screen bg-gray-50">
      <LocalHeader patient={patient} />

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

          <div className="flex items-center gap-3 text-sm text-gray-600">
            {isLoadingRemote
              ? "Loading games…"
              : error
              ? `Error loading games: ${error.message}`
              : `${totals.total} games • ${totals.completed} completed • ${totals.backlog} backlog`}
            <button
              onClick={async () => {
                if (!patient?.id) return;
                try {
                  setIsValidating(true);
                  const next = await jsonFetcher<PatientGamesResponse>(
                    `/api/patient/games?patientId=${encodeURIComponent(patient.id)}`
                  );
                  setData(next);
                  setError(null);
                } catch (e) {
                  setError(e as Error);
                } finally {
                  setIsValidating(false);
                }
              }}
              className="ml-3 px-3 py-1.5 rounded-md border hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <section className="mb-8">
          <LocalGameStats games={statsInput} />
        </section>

        {/* Games grid */}
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
                  <LocalGameCard
                    key={g.id}
                    game={{
                      id: String(g.id),
                      title: String(g.title ?? "Untitled"),
                      category: String(g.category ?? "Uncategorized"),
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

/* =========================
   Helpers
   ========================= */
function getCategoriesFrom(games: { category: string }[]) {
  const palette = [
    "bg-purple-100 text-purple-700",
    "bg-pink-100 text-pink-700",
    "bg-blue-100 text-blue-700",
    "bg-yellow-100 text-yellow-700",
    "bg-green-100 text-green-700",
    "bg-emerald-100 text-emerald-700",
  ];
  const map = new Map<string, number>();
  games.forEach((g) => {
    const cat = g?.category ? String(g.category) : "Uncategorized";
    map.set(cat, (map.get(cat) ?? 0) + 1);
  });
  return [...map.entries()].map(([name, count], i) => ({ name, count, color: palette[i % palette.length] }));
}
