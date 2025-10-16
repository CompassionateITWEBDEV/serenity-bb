"use client";

import React, { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

export default function CallRedirectPage() {
  const router = useRouter();
  const { conversationId } = useParams<{ conversationId: string }>();
  const qs = useSearchParams();

  useEffect(() => {
    const mode = qs.get("mode") || "audio";
    const role = qs.get("role") || "caller";
    const peer = qs.get("peer") || "";
    const peerName = qs.get("peerName") || "Peer";
    const autoAccept = qs.get("autoAccept") || "";

    // Build the new URL with all parameters
    const params = new URLSearchParams();
    params.set("role", role);
    params.set("peer", peer);
    params.set("peerName", peerName);
    if (autoAccept) params.set("autoAccept", autoAccept);

    // Redirect to the appropriate call type
    if (mode === "video") {
      router.replace(`/call/video/${conversationId}?${params.toString()}`);
    } else {
      router.replace(`/call/audio/${conversationId}?${params.toString()}`);
    }
  }, [router, conversationId, qs]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white text-lg">Redirecting to call...</p>
      </div>
    </div>
  );
}