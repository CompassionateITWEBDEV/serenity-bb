"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  StreamVideo,
  StreamVideoClient,
  Call,
  CallControls,
  SpeakerLayout,
  PaginatedGridLayout,
} from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";

type TokenRes = { apiKey: string; token: string; callId: string };

export default function StreamCallPage() {
  const { callId } = useParams<{ callId: string }>();
  const router = useRouter();
  const qs = useSearchParams();
  const mode = (qs.get("mode") as "audio" | "video") || "video";
  const displayName = decodeURIComponent(qs.get("me") || "You");

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // your app's auth (replace with your real user object)
  const [me, setMe] = useState<{ id: string; name: string }>({ id: "me", name: displayName });

  // fetch a Stream token for this user & call
  useEffect(() => {
    let alive = true;
    (async () => {
      // Replace with your actual user ID/name from Supabase auth
      // Here we assume you already have the user's id/email from your session
      const userId = me.id;
      const userName = me.name;
      const res = await fetch("/api/stream/create-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId, userId, userName }),
      });
      const data = (await res.json()) as TokenRes & { error?: string };
      if (!alive) return;
      if (!res.ok || data.error) {
        console.error(data.error || "Failed creating call");
        router.replace("/dashboard/messages");
        return;
      }
      setApiKey(data.apiKey);
      setToken(data.token);
    })();
    return () => { alive = false; };
  }, [callId, me.id, me.name, router]);

  const client = useMemo(() => {
    if (!apiKey || !token) return null;
    return new StreamVideoClient({
      apiKey,
      user: { id: me.id, name: me.name },
      token,
    });
  }, [apiKey, token, me.id, me.name]);

  if (!client) {
    return <div className="grid min-h-screen place-content-center text-sm text-gray-500">Loading call…</div>;
  }

  const call = client.call("default", String(callId));

  return (
    <StreamVideo client={client}>
      <Call call={call}>
        <AutoJoin mode={mode} />
        <div className="mx-auto grid min-h-screen max-w-6xl grid-rows-[auto_1fr_auto] gap-3 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">Call • {mode}</div>
            <button
              className="rounded-lg border px-3 py-1 text-sm"
              onClick={async () => {
                try { await call.leave(); } finally { router.push("/dashboard/messages"); }
              }}
              aria-label="Leave call"
            >
              Leave
            </button>
          </div>

          {/* Choose one of the layouts */}
          <SpeakerLayout />
          {/* Or: <PaginatedGridLayout /> */}

          <div className="flex items-center justify-center">
            <CallControls />
          </div>
        </div>
      </Call>
    </StreamVideo>
  );
}

function AutoJoin({ mode }: { mode: "audio" | "video" }) {
  const qs = useSearchParams(); // optionally use peer params
  const { callId } = useParams<{ callId: string }>();
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    (async () => {
      const event = new CustomEvent("stream-call-ready");
      window.dispatchEvent(event);
    })();
  }, []);

  useEffect(() => {
    const handler = async () => {
      const el = document.querySelector("[data-test='call-controls-join-button']") as HTMLButtonElement | null;
      if (!el) return;
      // emulate desired defaults
      if (mode === "audio") {
        const camToggle = document.querySelector("[data-test='toggle-camera']") as HTMLButtonElement | null;
        if (camToggle?.getAttribute("aria-pressed") === "true") camToggle.click();
      }
      if (!joined) { el.click(); setJoined(true); }
    };
    window.addEventListener("stream-call-ready", handler);
    return () => window.removeEventListener("stream-call-ready", handler);
  }, [joined, mode, callId]);

  return null;
}

// ===============================================
// 3) PATCH your existing chat page method startCall()
//    Replace only the function body to route into Stream
//    File: the big chat page you pasted — keep everything else.
// ===============================================
// Find the existing startCall function and REPLACE it with:

// const startCall = useCallback(
async function startCall(mode: "audio" | "video") {
  if (!selectedId || !me?.id) {
    // optionally show your SweetAlert here
    return;
  }
  const peerUserId = providerInfo.id;
  if (!peerUserId) return;

  // (Optional) still ring the peer via Supabase for your banner
  try {
    await ringPeer(peerUserId, {
      conversationId: selectedId,
      fromId: me.id,
      fromName: providerInfo.name ? me.name : "Patient",
      mode,
    });
  } catch {}

  // Create/ensure Stream call and navigate
  // callId = conversationId to keep 1:1 mapping
  try {
    const res = await fetch("/api/stream/create-call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callId: selectedId, userId: me.id, userName: me.name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Stream create-call failed");
  } catch {
    // fallback to messages on failure
    return;
  }

  router.push(
    `/video/${encodeURIComponent(selectedId)}?mode=${mode}&me=${encodeURIComponent(me.name)}`
  );
}
// , [selectedId, me?.id, me?.name, providerInfo.id, providerInfo.name, router]);

// ===============================================
// 4) .env  (Next.js)
// ===============================================
// NEXT_PUBLIC_STREAM_API_KEY=pk_from_stream_dashboard
// STREAM_API_SECRET=sk_from_stream_dashboard
