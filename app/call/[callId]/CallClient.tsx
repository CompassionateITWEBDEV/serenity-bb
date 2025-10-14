"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  StreamVideo,
  StreamVideoClient,
  Call,
  CallControls,
  SpeakerLayout,
} from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";

type TokenRes = { token?: string; error?: string };

export default function CallClient() {
  const { callId } = useParams<{ callId: string }>();
  const router = useRouter();
  const qs = useSearchParams();

  const mode = (qs.get("mode") as "audio" | "video") || "video";
  const displayName = decodeURIComponent(qs.get("me") || "You");
  const userId = qs.get("uid") || "anon"; // this comes from your messages page

  const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY as string | undefined;

  const [token, setToken] = useState<string | null>(null);

  // get a Stream user token for this call/user
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!apiKey) {
        console.error("Missing NEXT_PUBLIC_STREAM_API_KEY");
        router.replace("/dashboard/messages");
        return;
      }
      const res = await fetch("/api/stream/create-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callId: String(callId),
          userId,
          userName: displayName,
        }),
      });
      const text = await res.text();
      let data: TokenRes = {};
      try { data = JSON.parse(text) as TokenRes; } catch {}
      if (!alive) return;
      if (!res.ok || data.error || !data.token) {
        console.error(data.error || text || "Failed creating call");
        router.replace("/dashboard/messages");
        return;
      }
      setToken(data.token);
    })();
    return () => { alive = false; };
  }, [apiKey, callId, userId, displayName, router]);

  const client = useMemo(() => {
    if (!apiKey || !token) return null;
    return new StreamVideoClient({
      apiKey,
      user: { id: userId, name: displayName },
      token,
    });
  }, [apiKey, token, userId, displayName]);

  if (!client) {
    return (
      <div className="grid min-h-screen place-content-center text-sm text-gray-500">
        Loading call…
      </div>
    );
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

          <SpeakerLayout />

          <div className="flex items-center justify-center">
            <CallControls />
          </div>
        </div>
      </Call>
    </StreamVideo>
  );
}

function AutoJoin({ mode }: { mode: "audio" | "video" }) {
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      const joinBtn = document.querySelector(
        "[data-test='call-controls-join-button']"
      ) as HTMLButtonElement | null;
      if (!joinBtn) return;

      if (mode === "audio") {
        const camToggle = document.querySelector(
          "[data-test='toggle-camera']"
        ) as HTMLButtonElement | null;
        if (camToggle?.getAttribute("aria-pressed") === "true") camToggle.click();
      }

      if (!joined) {
        joinBtn.click();
        setJoined(true);
      }
      window.clearInterval(id);
    }, 150);
    return () => window.clearInterval(id);
  }, [mode, joined]);

  return null;
}
