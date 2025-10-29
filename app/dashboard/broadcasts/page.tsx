"use client";

import { useRouter } from "next/navigation";
import PatientBroadcasts from "@/components/patient/PatientBroadcasts";

export default function PatientBroadcastsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Announcements</h1>
            <p className="text-slate-600 mt-1">Important updates and messages from your care team</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Back to Dashboard
          </button>
        </div>

        <PatientBroadcasts />
      </main>
    </div>
  );
}

