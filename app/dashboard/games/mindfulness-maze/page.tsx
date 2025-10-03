"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Trophy,
  Timer,
  Heart as HeartIcon,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";

/** WHY: Levels encoded as matrices. 0=path, 1=wall, 2=goal, 3=collectible. */
const LEVELS: number[][][] = [
  // Level 1 (8x8)
  [
    [1,1,1,1,1,1,1,1],
    [1,0,3,1,0,0,0,1],
    [1,0,1,1,0,1,0,1],
    [1,0,0,0,3,1,0,1],
    [1,1,1,0,1,1,0,1],
    [1,0,0,0,0,0,3,1],
    [1,0,1,1,1,1,2,1],
    [1,1,1,1,1,1,1,1],
  ],
  // Level 2 (9x9)
  [
    [1,1,1,1,1,1,1,1,1],
    [1,0,3,0,1,0,3,0,1],
    [1,0,1,0,1,0,1,0,1],
    [1,0,1,0,0,0,1,0,1],
    [1,0,1,1,1,0,1,0,1],
    [1,0,0,0,0,0,1,0,1],
    [1,1,1,1,1,0,1,0,1],
    [1,3,0,0,0,0,0,2,1],
    [1,1,1,1,1,1,1,1,1],
  ],
  // Level 3 (10x10)
  [
    [1,1,1,1,1,1,1,1,1,1],
    [1,0,3,0,0,1,0,0,3,1],
    [1,0,1,1,0,1,0,1,0,1],
    [1,0,1,0,0,0,0,1,0,1],
    [1,0,1,0,1,1,0,1,0,1],
    [1,0,0,0,0,0,0,1,0,1],
    [1,1,1,1,1,1,0,1,0,1],
    [1,3,0,0,0,0,0,0,0,1],
    [1,0,0,1,1,1,1,1,2,1],
    [1,1,1,1,1,1,1,1,1,1],
  ],
];

type Phase = "inhale" | "hold" | "exhale";

export default function MindfulnessMazePage() {
  const { isAuthenticated, loading, patient } = useAuth();
  const router = useRouter();

  const [gameState, setGameState] = useState<"menu" | "playing" | "paused" | "completed">("menu");
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [breathingPhase, setBreathingPhase] = useState<Phase>("inhale");
  const [breathingProgress, setBreathingProgress] = useState(0);
  const [focusMode, setFocusMode] = useState(false); // WHY: movement allowed only on exhale when enabled
  const [lives, setLives] = useState(3);
  const [shakeKey, setShakeKey] = useState(0); // WHY: re-trigger shake animation
  const [pausedReason, setPausedReason] = useState<string | null>(null);

  const currentMap = useMemo(() => LEVELS[level - 1], [level]);
  const rows = currentMap.length;
  const cols = currentMap[0].length;

  const startPos = useMemo(() => {
    // default to (1,1) if open; else first open tile
    if (currentMap[1]?.[1] === 0) return { x: 1, y: 1 };
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (currentMap[y][x] === 0) return { x, y };
    return { x: 1, y: 1 };
  }, [currentMap, rows, cols]);

  const goalPos = useMemo(() => {
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (currentMap[y][x] === 2) return { x, y };
    return { x: cols - 2, y: rows - 2 };
  }, [currentMap, rows, cols]);

  const [playerPosition, setPlayerPosition] = useState(startPos);
  useEffect(() => setPlayerPosition(startPos), [startPos]);

  const totalOrbs = useMemo(() => {
    let c = 0;
    currentMap.forEach((r) => r.forEach((v) => { if (v === 3) c++; }));
    return c;
  }, [currentMap]);

  const [collected, setCollected] = useState<Set<string>>(new Set());
  useEffect(() => setCollected(new Set()), [level]);

  // Guard: auth
  useEffect(() => {
    if (!loading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, loading, router]);

  // Breathing cycle
  useEffect(() => {
    if (gameState !== "playing") return;
    const cycle = { inhale: 4000, hold: 2000, exhale: 4000 } as const;
    const t = setInterval(() => {
      setBreathingProgress((p) => {
        const span = cycle[breathingPhase];
        const np = p + 100 / (span / 100);
        if (np >= 100) {
          if (breathingPhase === "inhale") setBreathingPhase("hold");
          else if (breathingPhase === "hold") setBreathingPhase("exhale");
          else { setBreathingPhase("inhale"); setScore((s) => s + 10); }
          return 0;
        }
        return np;
      });
    }, 100);
    return () => clearInterval(t);
  }, [gameState, breathingPhase]);

  // Game timer
  useEffect(() => {
    if (gameState !== "playing") return;
    const t = setInterval(() => setTimeElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [gameState]);

  // Keyboard controls
  const tryMove = useCallback((dx: number, dy: number) => {
    if (gameState !== "playing") return;

    // Focus gating
    if (focusMode && breathingPhase !== "exhale") {
      setPausedReason("Move on EXHALE in Focus Mode");
      setShakeKey((k) => k + 1);
      return;
    }

    const { x, y } = playerPosition;
    const nx = Math.max(0, Math.min(cols - 1, x + dx));
    const ny = Math.max(0, Math.min(rows - 1, y + dy));

    if (nx === x && ny === y) return;

    const cell = currentMap[ny][nx];

    if (cell === 1) {
      // Wall hit
      setShakeKey((k) => k + 1);
      setLives((L) => (L > 1 ? L - 1 : 0));
      if (lives <= 1) {
        setGameState("completed");
      }
      return;
    }

    // Move
    setPlayerPosition({ x: nx, y: ny });
    setScore((s) => s + 1);

    // Orb
    if (cell === 3) {
      const key = `${nx},${ny}`;
      if (!collected.has(key)) {
        setCollected((prev) => new Set(prev).add(key));
        setScore((s) => s + 10);
      }
    }

    // Goal (require all orbs)
    if (nx === goalPos.x && ny === goalPos.y && collected.size + (cell === 3 ? 1 : 0) >= totalOrbs) {
      saveBestTime(level, timeElapsed + 0);
      if (level < LEVELS.length) {
        // next level
        setLevel((lv) => lv + 1);
        setTimeElapsed(0);
        setGameState("playing");
        setScore((s) => s + 100);
        setLives((L) => Math.min(5, L + 1)); // small reward
        setBreathingPhase("inhale");
        setBreathingProgress(0);
      } else {
        setScore((s) => s + 200);
        setGameState("completed");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, playerPosition, cols, rows, currentMap, goalPos, collected, totalOrbs, focusMode, breathingPhase, lives, level, timeElapsed]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (gameState !== "playing") return;
      const k = e.key.toLowerCase();
      if (k === "arrowup" || k === "w" || k === "k") tryMove(0, -1);
      else if (k === "arrowdown" || k === "s" || k === "j") tryMove(0, 1);
      else if (k === "arrowleft" || k === "a" || k === "h") tryMove(-1, 0);
      else if (k === "arrowright" || k === "d" || k === "l") tryMove(1, 0);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [gameState, tryMove]);

  // Best times (localStorage)
  const [bestTimes, setBestTimes] = useState<Record<string, number>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem("mm_bestTimes");
      if (raw) setBestTimes(JSON.parse(raw));
    } catch {}
  }, []);
  const saveBestTime = (lv: number, secs: number) => {
    setBestTimes((prev) => {
      const b = prev[lv] ?? Infinity;
      const next = secs < b ? { ...prev, [lv]: secs } : prev;
      try { localStorage.setItem("mm_bestTimes", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Menu + control handlers
  const startGame = () => {
    setGameState("playing");
    setScore(0);
    setTimeElapsed(0);
    setLives(3);
    setCollected(new Set());
    setBreathingPhase("inhale");
    setBreathingProgress(0);
    setLevel(1);
    setPausedReason(null);
  };
  const pauseGame = () => { setGameState("paused"); setPausedReason(null); };
  const resumeGame = () => setGameState("playing");
  const resetGame = () => {
    setGameState("menu");
    setScore(0);
    setTimeElapsed(0);
    setBreathingPhase("inhale");
    setBreathingProgress(0);
    setLives(3);
    setCollected(new Set());
    setPausedReason(null);
    setLevel(1);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading game...</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated || !patient) return null;

  const bestCurrent = bestTimes[level]?.toString() ? formatTime(bestTimes[level]) : "—";
  const collectedAll = collected.size >= totalOrbs;

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader patient={patient} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/games">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Games
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-serif font-bold text-gray-900">Mindfulness Maze</h1>
            <p className="text-gray-600">Navigate the maze while syncing movement with your breath.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Game Area */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    Level {level} <Sparkles className="h-4 w-4 text-purple-500" />
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Trophy className="h-3 w-3" /> {score}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Timer className="h-3 w-3" /> {formatTime(timeElapsed)}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <HeartIcon className="h-3 w-3 text-red-500" /> {lives}
                    </Badge>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Orbs: {collected.size}/{totalOrbs}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {gameState === "menu" && (
                  <div className="text-center py-12">
                    <div className="bg-purple-100 p-6 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                      <Target className="h-12 w-12 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Ready to Start?</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Use Arrow keys, WASD, or HJKL to move. Collect all orbs and reach the goal 🎯.
                    </p>
                    <div className="flex items-center justify-center gap-3 mb-6">
                      <Button
                        variant={focusMode ? "default" : "outline"}
                        onClick={() => setFocusMode((f) => !f)}
                        className="gap-2"
                      >
                        <Zap className="h-4 w-4" />
                        Focus Mode {focusMode ? "On" : "Off"}
                      </Button>
                    </div>
                    <Button onClick={startGame} className="bg-purple-600 hover:bg-purple-700">
                      <Play className="h-4 w-4 mr-2" />
                      Start Game
                    </Button>
                  </div>
                )}

                {(gameState === "playing" || gameState === "paused") && (
                  <div className="space-y-4">
                    {/* Controls */}
                    <div className="flex justify-center gap-2">
                      {gameState === "playing" ? (
                        <Button onClick={pauseGame} variant="outline" size="sm">
                          <Pause className="h-4 w-4 mr-2" /> Pause
                        </Button>
                      ) : (
                        <Button onClick={resumeGame} size="sm">
                          <Play className="h-4 w-4 mr-2" /> Resume
                        </Button>
                      )}
                      <Button onClick={resetGame} variant="outline" size="sm">
                        <RotateCcw className="h-4 w-4 mr-2" /> Reset
                      </Button>
                      <Button
                        variant={focusMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFocusMode((f) => !f)}
                        title="Allow moves only on exhale when ON"
                      >
                        <Zap className="h-4 w-4 mr-2" /> Focus: {focusMode ? "On" : "Off"}
                      </Button>
                    </div>

                    {/* Maze */}
                    <div
                      key={shakeKey}
                      className="bg-gray-100 p-4 rounded-lg transition-transform duration-150"
                    >
                      <div
                        className={`grid gap-1 max-w-full mx-auto`}
                        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, width: Math.min(64 * cols, 512) }}
                      >
                        {currentMap.map((row, y) =>
                          row.map((cell, x) => {
                            const isPlayer = playerPosition.x === x && playerPosition.y === y;
                            const isGoal = cell === 2;
                            const orbKey = `${x},${y}`;
                            const isOrb = cell === 3 && !collected.has(orbKey);
                            const base =
                              cell === 1
                                ? "bg-gray-800"
                                : isGoal
                                ? "bg-green-500"
                                : "bg-white";
                            return (
                              <div
                                key={`${x}-${y}`}
                                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-sm flex items-center justify-center text-xs font-bold ${base} ${
                                  isPlayer ? "ring-2 ring-blue-400" : ""
                                }`}
                              >
                                {isPlayer ? "🧘" : isGoal ? "🎯" : isOrb ? "🟣" : ""}
                              </div>
                            );
                          })
                        )}
                      </div>
                      {/* D-pad for mobile */}
                      <div className="flex justify-center gap-3 mt-4 sm:hidden">
                        <div className="flex flex-col gap-2">
                          <Button size="icon" variant="outline" onClick={() => tryMove(0, -1)}>↑</Button>
                          <div className="flex gap-2">
                            <Button size="icon" variant="outline" onClick={() => tryMove(-1, 0)}>←</Button>
                            <Button size="icon" variant="outline" onClick={() => tryMove(1, 0)}>→</Button>
                          </div>
                          <Button size="icon" variant="outline" onClick={() => tryMove(0, 1)}>↓</Button>
                        </div>
                      </div>

                      {pausedReason && gameState === "playing" && (
                        <div className="text-center text-xs text-amber-700 mt-2">{pausedReason}</div>
                      )}
                    </div>

                    <div className="text-center text-sm text-gray-600">
                      Collect all orbs, then reach the goal 🎯 • Moves award points • Full breath cycle +10
                    </div>
                  </div>
                )}

                {gameState === "completed" && (
                  <div className="text-center py-12">
                    <div className="bg-green-100 p-6 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                      <Trophy className="h-12 w-12 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-4">Great job!</h3>
                    <p className="text-gray-600 mb-2">
                      Final Score: <span className="font-semibold">{score}</span>
                    </p>
                    <p className="text-gray-600 mb-6">
                      Time: {formatTime(timeElapsed)} • Levels Cleared: {level > LEVELS.length ? LEVELS.length : level}
                    </p>
                    <div className="flex justify-center gap-4">
                      <Button onClick={startGame} className="bg-green-600 hover:bg-green-700">
                        Play Again
                      </Button>
                      <Link href="/dashboard/games">
                        <Button variant="outline">Back to Games</Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Breathing Guide + Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HeartIcon className="h-5 w-5 text-pink-600" />
                  Breathing Guide
                </CardTitle>
              </CardHeader>
              <CardContent>
                {gameState === "playing" ? (
                  <div className="text-center space-y-4">
                    <div className="text-lg font-medium text-gray-900">
                      {breathingPhase === "inhale" ? "Breathe In…" : breathingPhase === "hold" ? "Hold…" : "Breathe Out…"}
                    </div>
                    <div className="relative">
                      <div className="w-24 h-24 mx-auto rounded-full border-4 border-gray-200 flex items-center justify-center">
                        <div
                          className={`w-16 h-16 rounded-full transition-all duration-300 ${
                            breathingPhase === "inhale" ? "bg-blue-500" : breathingPhase === "hold" ? "bg-yellow-500" : "bg-green-500"
                          }`}
                          style={{ transform: `scale(${0.5 + (breathingProgress / 100) * 0.5})` }}
                        />
                      </div>
                    </div>
                    <Progress value={breathingProgress} className="h-2" />
                    <div className="text-sm text-gray-600">
                      {focusMode ? "Focus Mode: move only on EXHALE." : "Tip: moving on EXHALE can feel calmer."}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <HeartIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Start the game to begin breathing exercises</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stats & Goals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>Best Time (Level {level})</span>
                  <span className="font-medium">{bestCurrent}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Orbs Collected</span>
                  <span className="font-medium">{collected.size}/{totalOrbs}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Goal Availability</span>
                  <span className={`font-medium ${collectedAll ? "text-green-600" : "text-amber-600"}`}>
                    {collectedAll ? "Goal open" : "Collect all orbs"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
