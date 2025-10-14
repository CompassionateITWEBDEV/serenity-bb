// app/(calls)/[conversationId]/page.tsx
// Fixes: guaranteed bye delivery (subscribe+ack+retry), thread signaling subscribe guard,
// ICE watchdog to auto-end, consistent redirect for both parties.

"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

function buildIceServers(): RTCIceServer[] {
  const stun = process.env.NEXT_PUBLIC_ICE_STUN || "stun:stun.l.google.com:19302";
  const turn = process.env.NEXT_PUBLIC_ICE_TURN_URI || "";
  const user = process.env.NEXT_PUBLIC_ICE_TURN_USER || "";
  const pass = process.env.NEXT_PUBLIC_ICE_TURN_PASS || "";
  const servers: RTCIceServer[] = [{ urls: [stun] }];
  if (turn && user && pass) servers.push({ urls: [turn], username: user, credential: pass });
  return servers;
}

type SigPayload =
  | { kind: "webrtc-offer"; from: string; sdp: RTCSessionDescriptionInit }
  | { kind: "webrtc-answer"; from: string; sdp: RTCSessionDescriptionInit }
  | { kind: "webrtc-ice"; from: string; candidate: RTCIceCandidateInit }
  | { kind: "bye"; from: string };

function Tile({
  videoRef,
  label,
  mirrored = false,
}: {
  videoRef: React.RefObject<HTMLVideoElement>;
  label: string;
  mirrored?: boolean;
}) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl border bg-black/80 relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={label === "You"}
        className={`h-full w-full object-contain ${mirrored ? "scale-x-[-1]" : ""}`}
      />
      <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
        {label}
      </div>
    </div>
  );
}

export default function CallRoomPage() {
  const router = useRouter();
  const { conversationId } = useParams<{ conversationId: string }>();
  const qs = useSearchParams();

  const role = (qs.get("role") as "caller" | "callee") || "caller";
  const mode = (qs.get("mode") as "audio" | "video") || "audio";
  const peerUserId = qs.get("peer") || "";
  const peerName = decodeURIComponent(qs.get("peerName") || "Peer");

  const [authChecked, setAuthChecked] = useState(false);
  const [me, setMe] = useState<{ id: string; email?: string | null } | null>(null);

  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "ended">("idle");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(mode === "audio");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const threadChanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const iceWatchdogTimer = useRef<number | null>(null);

  // ---------- helpers: subscribe+ack and retry ----------
  async function ensureSubscribed(ch: ReturnType<typeof supabase.channel>) {
    await new Promise<void>((resolve, reject) => {
      const to = setTimeout(() => reject(new Error("subscribe timeout")), 10_000);
      ch.subscribe((s) => {
        if (s === "SUBSCRIBED") { clearTimeout(to); resolve(); }
        if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") { clearTimeout(to); reject(new Error(String(s))); }
      });
    });
  }

  async function broadcastWithAck(
    ch: ReturnType<typeof supabase.channel>,
    event: string,
    payload: any,
    retries = 3
  ) {
    await ensureSubscribed(ch);
    let lastErr: unknown = null;
    for (let i = 0; i < retries; i++) {
      try {
        await ch.send({ type: "broadcast", event, payload }); // ack enabled on channel
        return;
      } catch (e) {
        lastErr = e;
        await new Promise((r) => setTimeout(r, 300 * (i + 1))); // WHY: backoff for transient network
      }
    }
    throw lastErr;
  }

  // ---------- Auth ----------
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!alive) return;
      if (session.session?.user) {
        setMe({ id: session.session.user.id, email: session.session.user.email });
        setAuthChecked(true);
        return;
      }
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        setMe({ id: user.user.id, email: user.user.email });
        setAuthChecked(true);
        return;
      }
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed.session?.user) {
        setMe({ id: refreshed.session.user.id, email: refreshed.session.user.email });
        setAuthChecked(true);
      } else {
        const next = encodeURIComponent(location.pathname + location.search);
        router.replace(`/login?next=${next}`);
      }
    })();
    return () => { alive = false; };
  }, [router]);

  // ---------- WebRTC core ----------
  const ensurePC = useCallback(() => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection({ iceServers: buildIceServers() });

    pc.onicecandidate = async (ev) => {
      if (ev.candidate && me?.id && threadChanRef.current) {
        await broadcastWithAck(threadChanRef.current, "signal", {
          kind: "webrtc-ice", from: me.id, candidate: ev.candidate.toJSON(),
        }).catch(() => {/* ignore */});
      }
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") setStatus("connected");
      if (s === "failed" || s === "disconnected" || s === "closed") setStatus("ended");
    };

    // ICE watchdog: if disconnected > X ms, auto-end (covers tab close / network drop)
    pc.oniceconnectionstatechange = () => {
      const st = pc.iceConnectionState;
      if (st === "disconnected") {
        if (!iceWatchdogTimer.current) {
          iceWatchdogTimer.current = window.setTimeout(() => {
            endCall(true); // WHY: remote vanished, end both sides
          }, 6_000);
        }
      } else if (st === "connected" || st === "completed") {
        if (iceWatchdogTimer.current) { clearTimeout(iceWatchdogTimer.current); iceWatchdogTimer.current = null; }
      } else if (st === "failed") {
        endCall(true);
      }
    };

    pc.ontrack = (ev) => {
      if (!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
      remoteStreamRef.current.addTrack(ev.track);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
    };

    pcRef.current = pc;
    return pc;
  }, [me?.id]);

  const getConstraints = useCallback((): MediaStreamConstraints => {
    return { audio: true, video: mode === "video" ? { width: 1280, height: 720 } : false };
  }, [mode]);

  // ---------- thread_${conversationId} signaling ----------
  const threadChannel = useMemo(() => `thread_${conversationId}`, [conversationId]);

  const sendSignal = useCallback(async (payload: SigPayload) => {
    if (!threadChanRef.current) return;
    await broadcastWithAck(threadChanRef.current, "signal", payload).catch(() => {/* ignore */});
  }, []);

  useEffect(() => {
    if (!conversationId || !me?.id) return;

    const ch = supabase.channel(threadChannel, { config: { broadcast: { ack: true } } });
    threadChanRef.current = ch;

    ch.on("broadcast", { event: "signal" }, async (e) => {
      const msg = (e.payload || {}) as SigPayload;
      if (!msg || msg.from === me.id) return;

      if (msg.kind === "webrtc-offer") {
        const pc = ensurePC();
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal({ kind: "webrtc-answer", from: me.id, sdp: answer });
      } else if (msg.kind === "webrtc-answer") {
        const pc = ensurePC();
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      } else if (msg.kind === "webrtc-ice") {
        const pc = ensurePC();
        try { await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch { /* ignore */ }
      } else if (msg.kind === "bye") {
        endCall(true); // WHY: peer explicitly ended — auto-end locally (patient or staff)
      }
    });

    (async () => { await ensureSubscribed(ch); })();

    return () => {
      try { supabase.removeChannel(ch); } catch {}
      threadChanRef.current = null;
    };
  }, [conversationId, ensurePC, me?.id, sendSignal, threadChannel]);

  // ---------- user_${peer} banner ring / bye ----------
  async function ringPeer() {
    if (!peerUserId || !conversationId || !me?.id) return;
    const ch = supabase.channel(`user_${peerUserId}`, { config: { broadcast: { ack: true } } });
    try {
      await broadcastWithAck(ch, "invite", {
        conversationId, fromId: me.id, fromName: me.email || "Caller", mode,
      });
    } finally {
      try { supabase.removeChannel(ch); } catch {}
    }
  }

  async function byePeer() {
    if (!peerUserId || !conversationId) return;
    const ch = supabase.channel(`user_${peerUserId}`, { config: { broadcast: { ack: true } } });
    try {
      await broadcastWithAck(ch, "bye", { conversationId });
    } finally {
      try { supabase.removeChannel(ch); } catch {}
    }
  }

  // ---------- Start flow ----------
  const startOrPrep = useCallback(async () => {
    if (!me?.id) return;

    setStatus("connecting");

    localStreamRef.current = await navigator.mediaDevices.getUserMedia(getConstraints());
    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;

    const pc = ensurePC();
    localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));

    if (role === "caller") {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: mode === "video",
      });
      await pc.setLocalDescription(offer);
      await sendSignal({ kind: "webrtc-offer", from: me.id, sdp: offer });
      await ringPeer();
    }
  }, [ensurePC, getConstraints, me?.id, mode, role, sendSignal]);

  useEffect(() => {
    if (!authChecked || !me?.id) return;
    (async () => { await startOrPrep(); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, me?.id]);

  // ---------- Controls ----------
  const toggleMute = useCallback(() => {
    const s = localStreamRef.current;
    if (!s) return;
    s.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setMuted((m) => !m);
  }, []);

  const toggleCamera = useCallback(() => {
    const s = localStreamRef.current;
    if (!s) return;
    s.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setCamOff((v) => !v);
  }, []);

  const endCall = useCallback(
    async (remote = false) => {
      setStatus("ended");

      // send BYE first (WHY: avoid losing it on immediate teardown)
      if (!remote && me?.id) {
        // Try thread channel (P2P signaling) and user channel (banner) with retries
        await Promise.allSettled([
          sendSignal({ kind: "bye", from: me.id }),
          byePeer(),
        ]);
      }

      try { pcRef.current?.getSenders().forEach((s) => s.track?.stop()); } catch {}
      try { pcRef.current?.close(); } catch {}
      pcRef.current = null;

      try { localStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
      localStreamRef.current = null;

      if (iceWatchdogTimer.current) { clearTimeout(iceWatchdogTimer.current); iceWatchdogTimer.current = null; }

      // Navigate away for both patient and staff
      router.push("/dashboard/messages");
    },
    [byePeer, me?.id, router, sendSignal]
  );

  useEffect(() => {
    const onUnload = () => { void endCall(false); };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [endCall]);

  if (!authChecked) return <div className="p-6">Joining the call…</div>;

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Call • {mode}</h1>
          <p className="text-sm text-gray-500">
            You: <span className="font-mono">{me?.email || me?.id}</span> • Peer: {peerName}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Status: {status} • Role: {role}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={toggleMute}>{muted ? "Unmute" : "Mute"}</Button>
          {mode === "video" && (
            <Button variant="secondary" onClick={toggleCamera}>{camOff ? "Camera On" : "Camera Off"}</Button>
          )}
          <Button variant="destructive" onClick={() => void endCall(false)}>End</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Tile videoRef={remoteVideoRef} label="Remote" />
        <Tile videoRef={localVideoRef} label="You" mirrored />
      </div>
    </div>
  );
}
