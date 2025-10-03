"use client";
import React from "react";
import ChatBox from "@/components/chat/ChatBox";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function PatientChatPage({ params }: { params: { providerId: string } }) {
  const sp = useSearchParams();
  const providerName = sp.get("name") ?? "Care Team";
  const providerRole = (sp.get("role") as "doctor" | "nurse" | "counselor") ?? "nurse";
  const patientId = sp.get("patientId"); // if you store it in user metadata, you can fetch instead

  if (!patientId) {
    return <div className="p-6 text-sm text-red-600">Missing patientId in query string.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-3xl p-6">
        <ChatBox
          mode="patient"
          patientId={patientId}
          providerId={params.providerId}
          providerName={providerName}
          providerRole={providerRole}
        />
      </main>
      <Footer />
    </div>
  );
}
