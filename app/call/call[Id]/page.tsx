"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  StreamVideo,
  StreamCall,
  CallControls,
  SpeakerLayout,
} from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import { supabase } from "@/lib/supabase/client";

export default function CallPage() {
  const { callId } = useParams<{ callId: string }>();
  const qs = useSearchParams();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // 1) get current user id
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id || null;
      setUserId(uid);
    })();
  }, []);

  // 2) ask server to create/fetch call & mint token
  useEffect(() => {
    if (!callId || !userId) return;
    (async () => {
      try {
        setErr(null);
        const res = await fetch("/api/stream/create-call", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callId, userId }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error || `HTTP ${res.status}`);
        }
        setApiKey(json.apiKey);
        setToken(json.token);
      } catch (e: any) {
        console.error("[call bootstrap] ", e);
        setErr(e?.message || "Failed to create call");
      }
    })();
  }, [callId, userId]);

  // 3) bootstrap Stream client
  const client = useMemo(() => {
    if (!apiKey || !userId || !token) return null;
    const { StreamVideoClient } = require("@stream-io/video-react-sdk");
    return new StreamVideoClient({
      apiKey,
      user: { id: userId },
      token,
    });
  }, [apiKey, userId, token]);

  if (err) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-2">Call error</h2>
        <pre className="rounded bg-rose-50 p-3 text-rose-700 text-sm whitespace-pre-wrap">
          {err}
        </pre>
      </div>
    );
  }

  if (!client) {
    return <div className="p-6">Starting call…</div>;
  }

  return (
    <StreamVideo client={client}>
      <StreamCall callId={String(callId)} type="default">
        <div className="h-screen flex flex-col">
          <div className="flex-1 overflow-hidden">
            <SpeakerLayout />
          </div>
          <div className="border-t p-2">
            <CallControls onLeave={() => window.close()} />
          </div>
        </div>
      </StreamCall>
    </StreamVideo>
  );
}
