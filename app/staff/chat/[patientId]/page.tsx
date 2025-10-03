"use client";
import React from "react";
import ChatBox from "@/components/chat/ChatBox";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function StaffChatPage({ params }: { params: { patientId: string } }) {
  const sp = useSearchParams();
  const providerId = sp.get("providerId");
  const providerName = sp.get("name") ?? "Me";
  const providerRole = (sp.get("role") as "doctor" | "nurse" | "counselor") ?? "nurse";

  if (!providerId) {
    return <div className="p-6 text-sm text-red-600">Missing providerId in query string.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-3xl p-6">
        <ChatBox
          mode="staff"
          patientId={params.patientId}
          providerId={providerId}
          providerName={providerName}
          providerRole={providerRole}
        />
      </main>
      <Footer />
    </div>
  );
}
