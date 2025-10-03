"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Puzzle, ArrowLeft, RotateCcw, Eye, Brain, CheckCircle, Image as ImageIcon } from "lucide-react";

/** WHY: match by pairKey; images use fallback emoji when file not found. */
type Mode = "pictures" | "mixed";

interface MemoryItem {
  id: number;
  type: "image" | "word" | "number";
  /** For images: key e.g. "apple"; for others: literal */
  content: string;
  pairKey: string; // match key
  revealed: boolean;
  matched: boolean;
}

const IMAGE_SET: Array<{ key: string; src: string; alt: string; fallback: string }> = [
  { key: "apple", src: "/memory/apple.jpg", alt: "Apple", fallback: "🍎" },
  { key: "ball", src: "/memory/ball.jpg", alt: "Ball", fallback: "🏀" },
  { key: "car", src: "/memory/car.jpg", alt: "Car", fallback: "🚗" },
  { key: "tree", src: "/memory/tree.jpg", alt: "Tree", fallback: "🌳" },
  { key: "book", src: "/memory/book.jpg", alt: "Book", fallback: "📚" },
  { key: "coffee", src: "/memory/coffee.jpg", alt: "Coffee", fallback: "☕" },
  { key: "music", src: "/memory/music.jpg", alt: "Music", fallback: "🎵" },
  { key: "star", src: "/memory/star.jpg", alt: "Star", fallback: "🌟" },
  { key: "paint", src: "/memory/paint.jpg", alt: "Paint", fallback: "🎨" },
  { key: "mountain", src: "/memory/mountain.jpg", alt: "Mountain", fallback: "🏔️" },
  { key: "wave", src: "/memory/wave.jpg", alt: "Wave", fallback: "🌊" },
  { key: "house", src: "/memory/house.jpg", alt: "House", fallback: "🏠" },
];

const WORD_POOL = ["PEACE", "HOPE", "STRENGTH", "CALM", "FOCUS", "GROWTH", "HEALING", "BALANCE", "WISDOM", "COURAGE"];
const NUM_POOL = ["42", "17", "89", "23", "56", "34", "78", "91", "65", "12"];

function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function MemoryPalaceGame() {
  const router = useRouter();

  const [gameState, setGameState] = useState<"menu" | "study" | "recall" | "complete">("menu");
  const [mode, setMode] = useState<Mode>("pictures");
  const [currentLevel, setCurrentLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [studyTime, setStudyTime] = useState(15);
  const [memoryItems, setMemoryItems] = useState<MemoryItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [correctMatches, setCorrectMatches] = useState(0);
  const [lives, setLives] = useState(3);
  const [checking, setChecking] = useState(false);

  /** WHY: always pairs; more pairs by level; pictures-only or mixed. */
  const buildDeck = (lvl: number, m: Mode): MemoryItem[] => {
    const maxPairs = 8; // 16 cards
    const numPairs = Math.min(2 + lvl, maxPairs);

    const sources: Array<{ type: MemoryItem["type"]; pairKey: string; content: string }> = [];
    const picks: Array<{ type: MemoryItem["type"]; pairKey: string; content: string }> = [];

    if (m === "pictures") {
      IMAGE_SET.forEach((img) => sources.push({ type: "image", pairKey: `img:${img.key}`, content: img.key }));
    } else {
      IMAGE_SET.forEach((img) => sources.push({ type: "image", pairKey: `img:${img.key}`, content: img.key }));
      WORD_POOL.forEach((w) => sources.push({ type: "word", pairKey: `word:${w}`, content: w }));
      NUM_POOL.forEach((n) => sources.push({ type: "number", pairKey: `num:${n}`, content: n }));
    }

    shuffle(sources);
    for (let i = 0; i < numPairs && i < sources.length; i++) picks.push(sources[i]);

    const deck: MemoryItem[] = [];
    let id = 0;
    picks.forEach((p) => {
      deck.push(
        { id: id++, type: p.type, content: p.content, pairKey: p.pairKey, revealed: false, matched: false },
        { id: id++, type: p.type, content: p.content, pairKey: p.pairKey, revealed: false, matched: false },
      );
    });

    return shuffle(deck);
  };

  const studyDuration = useMemo(() => 15 + currentLevel * 2, [currentLevel]);
  const recallDuration = useMemo(() => 30 + currentLevel * 5, [currentLevel]);

  const startGame = () => {
    setGameState("study");
    setCurrentLevel(1);
    setScore(0);
    setLives(3);
    setCorrectMatches(0);
    const deck = buildDeck(1, mode);
    setMemoryItems(deck.map((c) => ({ ...c, revealed: true })));
    setStudyTime(studyDuration);
    setSelectedIds([]);
  };

  const nextLevel = () => {
    const lvl = currentLevel + 1;
    setCurrentLevel(lvl);
    setCorrectMatches(0);
    const deck = buildDeck(lvl, mode);
    setMemoryItems(deck.map((c) => ({ ...c, revealed: true })));
    setStudyTime(15 + lvl * 2);
    setGameState("study");
    setSelectedIds([]);
  };

  const startRecallPhase = () => {
    setGameState("recall");
    setTimeLeft(recallDuration);
    setMemoryItems((items) => items.map((i) => ({ ...i, revealed: false })));
    setSelectedIds([]);
  };

  /** WHY: click to reveal; check pair after 2 cards; lock board while checking. */
  const handleItemClick = (id: number) => {
    if (gameState !== "recall" || checking) return;

    setMemoryItems((prev) => {
      const card = prev.find((c) => c.id === id);
      if (!card || card.revealed || card.matched) return prev;
      const next = prev.map((c) => (c.id === id ? { ...c, revealed: true } : c));
      return next;
    });

    setSelectedIds((prevSel) => {
      if (prevSel.includes(id)) return prevSel;
      const sel = [...prevSel, id].slice(-2);
      if (sel.length === 2) {
        setChecking(true);
        setTimeout(() => checkForMatch(sel), 650);
      }
      return sel;
    });
  };

  const checkForMatch = (sel: number[]) => {
    const [aId, bId] = sel;
    const a = memoryItems.find((i) => i.id === aId);
    const b = memoryItems.find((i) => i.id === bId);

    if (a && b && a.pairKey === b.pairKey) {
      setMemoryItems((items) => items.map((i) => (sel.includes(i.id) ? { ...i, matched: true, revealed: true } : i)));
      setCorrectMatches((m) => m + 1);
      setScore((s) => s + 100 * currentLevel);
    } else {
      setLives((lv) => lv - 1);
      setTimeout(() => {
        setMemoryItems((items) =>
          items.map((i) => (sel.includes(i.id) && !i.matched ? { ...i, revealed: false } : i)),
        );
      }, 400);
    }

    setSelectedIds([]);
    setChecking(false);
  };

  // Study timer
  useEffect(() => {
    if (gameState !== "study") return;
    if (studyTime <= 0) {
      startRecallPhase();
      return;
    }
    const t = setTimeout(() => setStudyTime((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [gameState, studyTime]);

  // Recall timer
  useEffect(() => {
    if (gameState !== "recall") return;
    if (timeLeft <= 0) {
      setGameState("complete");
      return;
    }
    const t = setTimeout(() => setTimeLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [gameState, timeLeft]);

  // Win/lose checks
  useEffect(() => {
    const totalPairs = memoryItems.length / 2;
    if (gameState === "recall" && correctMatches >= totalPairs && totalPairs > 0) {
      setTimeout(() => nextLevel(), 900);
    }
  }, [correctMatches, memoryItems.length, gameState]);

  useEffect(() => {
    if (gameState === "recall" && lives <= 0) {
      setGameState("complete");
    }
  }, [lives, gameState]);

  const resetGame = () => {
    setGameState("menu");
    setCurrentLevel(1);
    setScore(0);
    setLives(3);
    setMemoryItems([]);
    setSelectedIds([]);
    setCorrectMatches(0);
  };

  const totalPairs = memoryItems.length / 2;

  if (gameState === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Button variant="outline" onClick={() => router.push("/dashboard/games")} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Games
          </Button>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Puzzle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-gray-900">Memory Palace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-gray-600">
                Study the grid, then find the matching pairs. Choose pictures-only to practice visual memory.
              </p>

              <div className="bg-green-50 p-4 rounded-lg text-left">
                <h3 className="font-semibold text-green-900 mb-2">Mode</h3>
                <div className="flex gap-2">
                  <Button
                    variant={mode === "pictures" ? "default" : "outline"}
                    onClick={() => setMode("pictures")}
                    className="gap-2"
                  >
                    <ImageIcon className="h-4 w-4" /> Pictures Only
                  </Button>
                  <Button
                    variant={mode === "mixed" ? "default" : "outline"}
                    onClick={() => setMode("mixed")}
                    className="gap-2"
                  >
                    🔀 Mixed
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg text-left">
                <h3 className="font-semibold text-blue-900 mb-2">How to Play</h3>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>• Study cards during the Study phase</li>
                  <li>• In Recall, click two cards to find a match</li>
                  <li>• Pictures-mode: match identical images</li>
                  <li>• Finish all pairs to advance; 3 lives per level</li>
                </ul>
              </div>

              <Button onClick={startGame} className="px-8 py-3">
                <Brain className="h-4 w-4 mr-2" />
                Start Memory Training
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (gameState === "complete") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Puzzle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-gray-900">Memory Training Complete!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{score}</div>
                  <div className="text-sm text-gray-600">Final Score</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{currentLevel - 1}</div>
                  <div className="text-sm text-gray-600">Levels Completed</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{correctMatches}</div>
                  <div className="text-sm text-gray-600">Pairs Matched (last level)</div>
                </div>
              </div>

              <div className="text-left bg-emerald-50 p-4 rounded-lg">
                <h3 className="font-semibold text-emerald-900 mb-2">Nice work!</h3>
                <p className="text-emerald-800 text-sm">
                  Visual and working-memory practice improves focus and cognitive resilience—great for daily recovery.
                </p>
              </div>

              <div className="flex gap-3">
                <Button onClick={resetGame} className="flex-1">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Train Again
                </Button>
                <Button variant="outline" onClick={() => router.push("/dashboard/games")} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Games
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={() => router.push("/dashboard/games")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Games
          </Button>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">Level {currentLevel}</Badge>
            <Badge variant="outline">Score: {score}</Badge>
            <Badge variant="destructive">Lives: {lives}</Badge>
            <Badge variant="outline">{mode === "pictures" ? "Pictures" : "Mixed"}</Badge>
          </div>
        </div>

        {/* Stats */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{gameState === "study" ? "Study Time" : "Recall Time"}</span>
              <span className="text-sm text-gray-600">{gameState === "study" ? `${studyTime}s` : `${timeLeft}s`}</span>
            </div>
            <Progress
              value={
                gameState === "study"
                  ? ((studyDuration - studyTime) / studyDuration) * 100
                  : ((recallDuration - timeLeft) / recallDuration) * 100
              }
              className="h-2"
            />
            {gameState === "recall" && (
              <div className="flex items-center justify-between mt-2 text-sm">
                <span>
                  Matches: {correctMatches}/{totalPairs || 0}
                </span>
                <span>Selected: {selectedIds.length}/2</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Game Board */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-center">
              <Puzzle className="h-5 w-5 text-green-600" />
              {gameState === "study" ? (
                <>
                  <Eye className="h-5 w-5" />
                  Study Phase - Memorize the cards
                </>
              ) : (
                <>
                  <Brain className="h-5 w-5" />
                  Recall Phase - Find matching pairs
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative rounded-lg p-4 min-h-[420px]">
              <div className="grid grid-cols-4 gap-4 max-w-xl mx-auto">
                {memoryItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    disabled={checking || item.matched || (gameState !== "recall" && !item.revealed)}
                    className={`
                      aspect-square rounded-xl border-2 flex items-center justify-center text-lg font-bold
                      transition-all duration-300 shadow-sm
                      ${item.revealed || item.matched ? "bg-white border-gray-300" : "bg-gray-200 border-gray-400 hover:bg-gray-300"}
                      ${gameState === "recall" && !item.matched ? "hover:scale-105" : ""}
                      ${item.matched ? "ring-2 ring-green-300" : ""}
                    `}
                  >
                    {item.revealed || item.matched ? (
                      item.type === "image" ? (
                        <PictureCard keyName={item.content} />
                      ) : (
                        <div className="text-center">
                          <div className="text-xl mb-1">
                            {item.type === "word" ? item.content : item.content}
                          </div>
                          {item.matched && <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />}
                        </div>
                      )
                    ) : (
                      <div className="w-10 h-10 bg-gray-400/60 rounded"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {gameState === "study" && (
              <div className="text-center mt-6">
                <div className="inline-flex items-center gap-2 bg-green-100 px-4 py-2 rounded-full">
                  <Eye className="h-4 w-4 text-green-600" />
                  <span className="text-green-700 text-sm">Study the cards and their positions…</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** WHY: image card with graceful emoji fallback if /public/memory/*.jpg missing. */
function PictureCard({ keyName }: { keyName: string }) {
  const meta = IMAGE_SET.find((x) => x.key === keyName);
  const [broken, setBroken] = useState(false);
  if (!meta) return <span className="text-2xl">🖼️</span>;
  return broken ? (
    <span className="text-3xl" title={meta.alt}>{meta.fallback}</span>
  ) : (
    // plain <img> avoids Next <Image> domain/config needs; works from /public
    <img
      src={meta.src}
      alt={meta.alt}
      className="w-14 h-14 object-cover rounded-md select-none"
      draggable={false}
      onError={() => setBroken(true)}
    />
  );
}
