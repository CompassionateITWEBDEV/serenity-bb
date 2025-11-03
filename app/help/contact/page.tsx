// Enable static generation for help contact page
export const dynamic = "error"; // Force static generation
export const revalidate = 3600; // Revalidate every hour (ISR)

"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Headphones, MessageCircle, Globe, Facebook, Twitter, Instagram } from "lucide-react";

function Row({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <li>
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 rounded-xl border bg-white px-3 py-3 text-left hover:bg-slate-50"
      >
        <span className="h-10 w-10 rounded-full bg-cyan-100 text-cyan-700 grid place-items-center">{icon}</span>
        <span className="text-sm text-slate-800">{label}</span>
      </button>
    </li>
  );
}

export default function HelpContactPage() {
  const router = useRouter();

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
          <button
            className="py-3 text-sm text-slate-500 hover:text-slate-700"
            onClick={() => router.push("/help/faq")}
          >
            FAQ
          </button>
          <button className="relative py-3 text-sm font-medium text-cyan-700">
            Contact Us
            <span className="absolute left-0 -bottom-px h-0.5 w-full bg-cyan-500 rounded-full" />
          </button>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-md mx-auto p-4">
        <Card>
          <CardContent className="p-3">
            <ul className="space-y-3">
              <Row icon={<Headphones className="h-5 w-5" />} label="Customer Services" />
              <Row icon={<MessageCircle className="h-5 w-5" />} label="WhatsApp" />
              <Row icon={<Globe className="h-5 w-5" />} label="Website" />
              <Row icon={<Facebook className="h-5 w-5" />} label="Facebook" />
              <Row icon={<Twitter className="h-5 w-5" />} label="Twitter" />
              <Row icon={<Instagram className="h-5 w-5" />} label="Instagram" />
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
