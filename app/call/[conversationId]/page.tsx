"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

// (Optional) tiny WebRTC UI placeholder
function VideoTile({ label }: { label: string }) {
  return (
    <div className="aspect-video w-full rounded-xl border bg-black/80 text-white grid place-items-center">
      <span className="opacity-70">{label}</span>
    </div>
  );
}

export default function CallRoomPage() {
  const router = useRouter();
  const { conversationId } = useParams<{ conversationId: string }>();
  const qs = useSearchParams();

  const role = (qs.get("role") as "caller" | "callee") || "caller";
  const mode = (qs.get("mode") as "audio" | "video") || "audio";
  const peer = qs.get("peer") || "";
  const peerName = qs.get("peerName") || "Peer";

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<{ id: string; email?: string | null } | null>(null);

  // 🔐 Client-side auth gate (avoid SSR redirect to /login)
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      if (!data.session) {
        // preserve where we were trying to go
        const next = encodeURIComponent(location.pathname + location.search);
        router.replace(`/login?next=${next}`);
        return;
      }
      setMe({ id: data.session.user.id, email: data.session.user.email });
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [router]);

  // —— put your WebRTC init here after auth —— //
  useEffect(() => {
    if (loading || !me) return;
    // Example: lazy-init your RTCPeerConnection + Supabase signaling here
    // initCall({ conversationId, role, mode, meId: me.id, peerId: peer });
  }, [loading, me, conversationId, role, mode, peer]);

  if (loading) {
    return <div className="p-6">Joining the call…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Call • {mode}</h1>
          <p className="text-sm text-gray-500">
            You: <span className="font-mono">{me?.email || me?.id}</span> • Peer: {peerName}
          </p>
        </div>
        <button
          className="rounded-md bg-rose-600 px-3 py-1.5 text-white hover:bg-rose-700"
          onClick={() => router.back()}
        >
          Hang up
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <VideoTile label="Remote stream" />
        <VideoTile label="Your stream" />
      </div>

      {/* Controls placeholder */}
      <div className="flex gap-2">
        <button className="rounded-md border px-3 py-1.5">Mute</button>
        {mode === "video" && <button className="rounded-md border px-3 py-1.5">Toggle camera</button>}
      </div>
    </div>
  );
}
