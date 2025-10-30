"use client";
export const dynamic = "error"; // static
export const revalidate = 604800; // 7 days

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";

export default function TermsPage() {
  const router = useRouter();

  const items = [
    {
      t: "Medical Disclaimer",
      d:
        "This app does not replace professional medical advice. Always consult your clinician for medical decisions.",
    },
    {
      t: "User Responsibilities",
      d:
        "Provide accurate information and use the app for lawful purposes only.",
    },
    {
      t: "Confidentiality",
      d:
        "Your medical and personal data is confidential. We use encryption and secure systems to protect your privacy.",
    },
    {
      t: "Communication",
      d:
        "By using the app, you agree to receive notifications, messages, or reminders related to your health care.",
    },
    {
      t: "Limitation of Liability",
      d:
        "We are not liable for damages resulting from misuse of the app or incorrect information submitted by users.",
    },
    {
      t: "Modifications",
      d:
        "We reserve the right to update these terms. You’ll be notified of significant changes.",
    },
    {
      t: "Termination",
      d:
        "Violation of any terms may result in suspension or removal from the app.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push("/staff/profile")}
            className="h-9 w-9 rounded-full bg-slate-100 grid place-items-center"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </button>
          <h1 className="text-lg font-semibold">Terms and Conditions</h1>
        </div>
      </header>

      {/* Hero card */}
      <main className="max-w-md mx-auto p-4 space-y-4">
        <div className="rounded-xl bg-cyan-500 text-white p-4">
          <div className="text-base font-semibold">Terms &amp; Conditions</div>
          <div className="text-[11px] mt-0.5 opacity-80">Last Updated: 12 June 2025</div>
          <p className="text-sm mt-2 opacity-95">
            Welcome to our patient care app. By accessing or using our services, you agree to the following terms and
            conditions:
          </p>
        </div>

        <Card>
          <CardContent className="p-4 space-y-3">
            {items.map((it, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-cyan-100 text-cyan-700 grid place-items-center text-xs font-semibold shrink-0">
                  {i + 1}.
                </div>
                <div>
                  <div className="text-sm font-medium">{it.t}</div>
                  <p className="text-xs text-slate-600">{it.d}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <button
            className="flex-1 h-10 rounded-full bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-600"
            onClick={() => router.push("/staff/profile")}
          >
            Agree
          </button>
          <button
            className="flex-1 h-10 rounded-full border border-slate-300 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
            onClick={() => router.push("/staff/profile")}
          >
            Disagree
          </button>
        </div>
      </main>
    </div>
  );
}
