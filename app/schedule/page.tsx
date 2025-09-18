// Example: route "/schedule"
// File: app/schedule/page.tsx
"use client";

import { formatTime } from "@/lib/time";

export default function SchedulePage() {
  const now = Date.now();
  const items = [
    { id: 1, title: "Intake", at: now + 15 * 60_000 },
    { id: 2, title: "Consult", at: now + 60 * 60_000 }
  ];

  return (
    <main className="p-6 space-y-3">
      <h1 className="text-xl font-semibold">Schedule</h1>
      <ul className="space-y-1 text-sm">
        {items.map((i) => (
          <li key={i.id}>
            {i.title}: {formatTime(i.at)}
          </li>
        ))}
      </ul>
    </main>
  );
}
