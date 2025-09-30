"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronDown } from "lucide-react";

type QA = { q: string; a: string };

const DATA: QA[] = [
  {
    q: "How do I manage my notifications?",
    a: 'To manage notifications, go to "Settings", select "Notification Preferences", and customize email/SMS/push.',
  },
  {
    q: "How do I start a guided meditation session?",
    a: "Open the Library, choose Meditation, then select a session and press Start.",
  },
  {
    q: "How do I join a group chat?",
    a: "From Community > Groups, pick a group and press Join. Some require approval.",
  },
  {
    q: "How do I manage my notifications (detail)?",
    a: "You can enable or disable channels individually and set quiet hours.",
  },
  {
    q: "Is my data safe and private?",
    a: "We use encryption in transit and at rest. Access is restricted to authorized staff only.",
  },
];

export default function HelpFaqPage() {
  const router = useRouter();
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-center relative">
          <button
            onClick={() => router.push("/staff/profile")}
            className="absolute left-4 h-9 w-9 rounded-full bg-slate-100 grid place-items-center"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </button>
          <h1 className="text-lg font-semibold">Help Center</h1>
        </div>

        {/* Tabs */}
        <div className="max-w-md mx-auto px-4 flex items-center gap-6 border-b">
          <button className="relative py-3 text-sm font-medium text-cyan-700">
            FAQ
            <span className="absolute left-0 -bottom-px h-0.5 w-full bg-cyan-500 rounded-full" />
          </button>
          <button
            className="py-3 text-sm text-slate-500 hover:text-slate-700"
            onClick={() => router.push("/help/contact")}
          >
            Contact Us
          </button>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-md mx-auto p-4 space-y-3">
        {DATA.map((item, idx) => {
          const open = openIdx === idx;
          return (
            <Card key={idx} className="border rounded-xl">
              <CardContent className="p-0">
                <button
                  className="w-full flex items-center justify-between px-3 py-3 text-left"
                  onClick={() => setOpenIdx(open ? null : idx)}
                  aria-expanded={open}
                >
                  <span className="text-sm text-slate-800">{item.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </button>
                {open && (
                  <div className="px-3 pb-3 -mt-1">
                    <p className="text-xs text-slate-600 leading-relaxed">{item.a}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </main>

      {/* Footer cta (optional) */}
      <div className="max-w-md mx-auto px-4 pb-5">
        <Button variant="outline" className="w-full" onClick={() => router.push("/help/contact")}>
          Need more help? Contact us
        </Button>
      </div>
    </div>
  );
}
