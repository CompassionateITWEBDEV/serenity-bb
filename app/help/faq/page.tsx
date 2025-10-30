export const dynamic = "error"; // static
export const revalidate = 86400; // 24h ISR

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import HelpFaqClient from "@/components/help/HelpFaqClient";

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
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-center relative">
          <Link href="/staff/profile" aria-label="Back" className="absolute left-4 h-9 w-9 rounded-full bg-slate-100 grid place-items-center">
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </Link>
          <h1 className="text-lg font-semibold">Help Center</h1>
        </div>

        {/* Tabs */}
        <div className="max-w-md mx-auto px-4 flex items-center gap-6 border-b">
          <button className="relative py-3 text-sm font-medium text-cyan-700">
            FAQ
            <span className="absolute left-0 -bottom-px h-0.5 w-full bg-cyan-500 rounded-full" />
          </button>
          <Link href="/help/contact" className="py-3 text-sm text-slate-500 hover:text-slate-700">
            Contact Us
          </Link>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-md mx-auto p-4 space-y-3">
        <HelpFaqClient data={DATA} />
      </main>

      {/* Footer cta (optional) */}
      <div className="max-w-md mx-auto px-4 pb-5">
        <Link href="/help/contact" className="w-full">
          <Button variant="outline" className="w-full">
            Need more help? Contact us
          </Button>
        </Link>
      </div>
    </div>
  );
}
