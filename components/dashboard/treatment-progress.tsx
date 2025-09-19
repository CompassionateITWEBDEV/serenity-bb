"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Why: clear public API; can be used as named or default to avoid future import confusion.
export type TreatmentProgressProps = {
  label?: string;
  target?: number;       // 0..100
  value?: number;        // 0..100; if omitted, component simulates live progress
  intervalMs?: number;   // simulation tick
};

export const TreatmentProgress = ({
  label = "Recovery Progress",
  target = 100,
  value,
  intervalMs = 1200,
}: TreatmentProgressProps) => {
  const [internal, setInternal] = useState<number>(() => (typeof value === "number" ? value : 62));
  const timerRef = useRef<number | null>(null);

  // Simulate live updates only when value prop is not provided.
  useEffect(() => {
    if (typeof value === "number") {
      setInternal(Math.max(0, Math.min(100, value)));
      return;
    }
    timerRef.current = window.setInterval(() => {
      setInternal((v) => {
        const next = v + Math.max(1, Math.round((100 - v) * 0.05));
        return Math.min(next, 100);
      });
    }, intervalMs);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [value, intervalMs]);

  const pct = useMemo(() => Math.round(Math.max(0, Math.min(100, internal))), [internal]);
  const meetsTarget = pct >= target;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">{label}</h2>
          <span className="text-sm text-gray-500">{pct}%</span>
        </div>

        <div className="w-full h-3 rounded-lg bg-gray-200 overflow-hidden mb-4">
          <div
            className="h-full rounded-lg transition-all"
            // Why: width is dynamic and unstyled to respect app theme tokens
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            Target: <strong>{target}%</strong> {meetsTarget ? "(met)" : ""}
          </span>
          <Button
            variant="secondary"
            onClick={() => setInternal((v) => Math.min(v + 5, 100))}
            aria-label="Nudge progress"
          >
            Nudge +5%
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Optional default alias so BOTH `import X` and `import { X }` work.
// Remove if you want to enforce one import style across the codebase.
export default TreatmentProgress;
