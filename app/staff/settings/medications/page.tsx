"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Plus } from "lucide-react";

type Item = { id: string; name: string; due: string; status: "pending" | "done" };

export default function StaffSettingsMedicationCallbacksPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([
    { id: "1", name: "Methadone follow-up", due: "Tue, 3:45 pm", status: "pending" },
    { id: "2", name: "Naltrexone check-in", due: "Fri, 9:15 am", status: "done" },
  ]);

  function addMock() {
    const n: Item = {
      id: Date.now().toString(),
      name: "New callback",
      due: "Today, 5:00 pm",
      status: "pending",
    };
    setItems((s) => [n, ...s]);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push("/app/staff/dashboard")} // back → dashboard
            className="h-9 w-9 rounded-full bg-slate-100 grid place-items-center"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </button>
          <h1 className="text-lg font-semibold">Medication Callback Tracker</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-3">
        <Button onClick={addMock} className="w-full gap-2">
          <Plus className="h-4 w-4" /> Add callback
        </Button>

        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {items.map((i) => (
                <li key={i.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{i.name}</div>
                    <div className="text-xs text-slate-500">{i.due}</div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full border ${
                      i.status === "done"
                        ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                        : "text-amber-700 bg-amber-50 border-amber-200"
                    }`}
                  >
                    {i.status === "done" ? "Done" : "Pending"}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
