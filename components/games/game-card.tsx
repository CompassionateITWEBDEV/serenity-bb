"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

export type Game = {
  id: string;
  title: string;
  coverUrl?: string;
  genre?: string;
  rating?: number;
  completed?: boolean;
};

type Props = {
  game: Game;
  onToggleComplete?: (id: string, next: boolean) => void;
};

function GameCard({ game, onToggleComplete }: Props) {
  const [completed, setCompleted] = useState<boolean>(Boolean(game.completed));

  const toggle = () => {
    const next = !completed;
    setCompleted(next);
    onToggleComplete?.(game.id, next);
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 flex gap-4">
        {game.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={game.coverUrl} alt={game.title} className="h-24 w-24 rounded-xl object-cover" />
        ) : (
          <div className="h-24 w-24 rounded-xl bg-gray-200 flex items-center justify-center text-sm">
            No Art
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold leading-tight">{game.title}</h3>
              {game.genre && <p className="text-sm text-muted-foreground">{game.genre}</p>}
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
          {typeof game.rating === "number" && (
            <p className="mt-2 text-sm">Rating: {game.rating.toFixed(1)}/5</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default GameCard;
export { GameCard };
