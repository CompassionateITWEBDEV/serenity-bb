"use client";
export const dynamic = "error";
export const revalidate = 604800;

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";

export default function TermsPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push("/staff/profile")} className="h-9 w-9 rounded-full bg-slate-100 grid place-items-center" aria-label="Back">
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </button>
          <h1 className="text-lg font-semibold">Terms & Conditions</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        <Card>
          <CardContent className="p-4 space-y-3 text-sm text-slate-700">
            <p>By using this application you agree to the following terms and conditions.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi. Sed non dui vel lacus bibendum vehicula. Integer eget augue at nunc tempus accumsan.</p>
            <p>Data handling complies with HIPAA principles; do not share PHI outside intended workflows.</p>
            <p>These terms may change. Continued use constitutes acceptance of the updated terms.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
