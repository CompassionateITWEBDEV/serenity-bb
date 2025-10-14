"use client";

import { useEffect, useMemo, useState } from "react";
import {
  StreamVideo,
  StreamVideoClient,
  Call,
  StreamTheme,
  CallContent,
} from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import { supabase } from "@/lib/supabase/client";

type Props = {
  callId: string;
  role: "caller" | "callee";
  mode: "audio" | "video";
  peer: string;        // user_id of the other side
  peerName: string;
};

export default function CallClient({ callId, mode, peer }: Props) {
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<ReturnType<StreamVideoClient["call"]> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Use the *actual* authenticated user id
  const me = useMemo(() => ({ id: "anonymous" }), []);
  useEffect(() => {
    (async () => {
      try {
        const { data: au } = await supabase.auth.getUser();
        if (au.user?.id) {
          (me as any).id = au.user.id; // keep id stable
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // 1) Ask our API to create the call and issue a token (also add both members)
        const res = await fetch("/api/stream/create-call", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ callId, user: { id: me.id }, peerId: peer }),
        });

        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error || `create-call failed (${res.status})`);
        }

        // 2) Init client
        const c = new StreamVideoClient({
          apiKey: payload.apiKey,
          user: { id: String(payload.user.id) },
          token: payload.token,
        });
        if (!mounted) return;
        setClient(c);

        // 3) Join the call
        const _call = c.call("default", callId);
        setCall(_call);
        await _call.join({
          create: false,
          audio: true,
          video: mode === "video",
        });
      } catch (e: any) {
        console.error("[CallClient] join failed:", e);
        setErr(e?.message || "Unable to start the call.");
      }
    })();

    return () => {
      mounted = false;
      (async () => {
        try {
          await call?.leave();
          client?.disconnectUser();
        } catch {}
      })();
    };
  }, [callId, mode, peer, me.id]);

  if (err) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="rounded-lg border p-6 text-center">
          <div className="mb-2 text-lg font-semibold">Call error</div>
          <div className="mb-4 text-sm text-gray-600">{err}</div>
          <button className="rounded bg-gray-900 px-4 py-2 text-white" onClick={() => location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!client || !call) return <div className="p-6">Connecting to call…</div>;

  return (
    <StreamVideo client={client}>
      <StreamTheme>
        <Call call={call}>
          <CallContent />
        </Call>
      </StreamTheme>
    </StreamVideo>
  );
}
