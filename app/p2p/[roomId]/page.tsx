"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Mic, MicOff, Video as CamOn, VideoOff as CamOff, MonitorUp, PhoneOff, RefreshCw, Send
} from "lucide-react";

/** WHY: TURN is essential behind NAT/firewalls; keep in env, not code */
function buildIceServers(): RTCIceServer[] {
  const stun = process.env.NEXT_PUBLIC_ICE_STUN || "stun:stun.l.google.com:19302";
  const turn = process.env.NEXT_PUBLIC_ICE_TURN_URI || "";
  const user = process.env.NEXT_PUBLIC_ICE_TURN_USER || "";
  const pass = process.env.NEXT_PUBLIC_ICE_TURN_PASS || "";
  const servers: RTCIceServer[] = [{ urls: [stun] }];
  if (turn && user && pass) servers.push({ urls: [turn], username: user, credential: pass });
  return servers;
}

type Signal =
  | { kind: "offer"; from: string; sdp: RTCSessionDescriptionInit }
  | { kind: "answer"; from: string; sdp: RTCSessionDescriptionInit }
  | { kind: "ice"; from: string; candidate: RTCIceCandidateInit }
  | { kind: "bye"; from: string };

export default function P2PPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const sp = useSearchParams();
  const router = useRouter();

  const roleParam = (sp.get("role") || "auto") as "caller" | "callee" | "auto";
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "ended">("idle");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);

  const [dcOpen, setDcOpen] = useState(false);
  const [chatIn, setChatIn] = useState("");
  const [chatLog, setChatLog] = useState<Array<{ who: "me" | "peer"; text: string }>>([]);

  const channelName = useMemo(() => `p2p_${roomId}`, [roomId]);

  useEffect(() => {
    (async () => {
      const { data: au } = await supabase.auth.getUser();
      const uid = au.user?.id;
      if (!uid) { router.push("/login"); return; }
      setMe({ id: uid, name: au.user?.email || "Me" });
    })();
  }, [router]);

  const sendSignal = useCallback((payload: Signal) => {
    if (!chanRef.current) return;
    void chanRef.current.send({ type: "broadcast", event: "signal", payload });
  }, []);

  const ensurePC = useCallback(() => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection({ iceServers: buildIceServers() });
    pc.onicecandidate = (e) => {
      if (e.candidate && me?.id) sendSignal({ kind: "ice", from: me.id, candidate: e.candidate.toJSON() });
    };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") setStatus("connected");
      if (s === "failed" || s === "disconnected" || s === "closed") setStatus("ended");
    };
    pc.ontrack = (ev) => {
      if (!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
      remoteStreamRef.current.addTrack(ev.track);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
    };
    pc.ondatachannel = (ev) => {
      const ch = ev.channel;
      dcRef.current = ch;
      bindDataChannel(ch);
    };
    pcRef.current = pc;
    return pc;
  }, [me?.id, sendSignal]);

  function bindDataChannel(ch: RTCDataChannel) {
    ch.onopen = () => setDcOpen(true);
    ch.onclose = () => setDcOpen(false);
    ch.onmessage = (e) => setChatLog((l) => [...l, { who: "peer", text: String(e.data) }]);
  }

  async function attachLocalMedia(video: boolean) {
    localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true, video });
    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    const pc = ensurePC();
    localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));
  }

  const startAsCaller = useCallback(async () => {
    if (!me?.id) return;
    setStatus("connecting");
    await attachLocalMedia(true);
    const pc = ensurePC();
    const dc = pc.createDataChannel("chat", { ordered: true });
    dcRef.current = dc;
    bindDataChannel(dc);
    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
    await pc.setLocalDescription(offer);
    sendSignal({ kind: "offer", from: me.id, sdp: offer });
  }, [ensurePC, me?.id, sendSignal]);

  const acceptAsCallee = useCallback(async () => {
    if (!me?.id) return;
    // Nothing special to do here; callee logic runs on receiving offer.
    setStatus("connecting");
  }, [me?.id]);

  useEffect(() => {
    if (!roomId || !me?.id) return;
    const ch = supabase.channel(channelName, { config: { broadcast: { ack: true } } });
    ch.on("broadcast", { event: "signal" }, async (e) => {
      const msg = (e.payload || {}) as Signal;
      if (!msg || (msg as any).from === me.id) return;

      const pc = ensurePC();

      if (msg.kind === "offer") {
        await attachLocalMedia(true);
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal({ kind: "answer", from: me.id, sdp: answer });
        setStatus("connecting");
      } else if (msg.kind === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      } else if (msg.kind === "ice") {
        try { await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch { /* ignore */ }
      } else if (msg.kind === "bye") {
        endCall(true);
      }
    });
    ch.subscribe();
    chanRef.current = ch;
    return () => { try { supabase.removeChannel(ch); } catch {} };
  }, [channelName, ensurePC, me?.id, roomId, sendSignal]);

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
  const shareScreen = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    const ds: MediaStream | null = await (navigator.mediaDevices as any).getDisplayMedia?.({ video: true, audio: false }).catch(() => null);
    if (!ds) return;
    const sender = pc.getSenders().find((s) => s.track?.kind === "video");
    if (sender && ds.getVideoTracks()[0]) await sender.replaceTrack(ds.getVideoTracks()[0]);
    ds.getVideoTracks()[0].addEventListener("ended", async () => {
      const cam = localStreamRef.current?.getVideoTracks()[0];
      if (cam && sender) await sender.replaceTrack(cam);
    });
  }, []);
  const renegotiate = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !me?.id) return;
    const offer = await pc.createOffer({ iceRestart: true });
    await pc.setLocalDescription(offer);
    sendSignal({ kind: "offer", from: me.id, sdp: offer });
  }, [me?.id, sendSignal]);

  const endCall = useCallback((remote = false) => {
    setStatus("ended");
    try { dcRef.current?.close(); } catch {}
    try { pcRef.current?.getSenders().forEach((s) => s.track?.stop()); } catch {}
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;
    try { localStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    localStreamRef.current = null;
    if (!remote && me?.id) sendSignal({ kind: "bye", from: me.id });
  }, [me?.id, sendSignal]);

  const sendChat = useCallback(() => {
    const ch = dcRef.current;
    const text = chatIn.trim();
    if (!ch || !text) return;
    ch.send(text);
    setChatLog((l) => [...l, { who: "me", text }]);
    setChatIn("");
  }, [chatIn]);

  // Optional auto role: if ?role=caller, auto-start; if callee, wait & press Accept.
  useEffect(() => {
    if (!me?.id) return;
    if (roleParam === "caller") void startAsCaller();
    if (roleParam === "callee") void acceptAsCallee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id]);

  return (
    <div className="mx-auto grid min-h-screen max-w-6xl grid-rows-[auto_1fr_auto] gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">room: <span className="font-mono">{roomId}</span> • {status}</div>
        <div className="flex items-center gap-2">
          <Button onClick={startAsCaller} disabled={status !== "idle"}>Start</Button>
          <Button variant="secondary" onClick={acceptAsCallee} disabled={status !== "idle"}>Accept</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr]">
        <Card className="relative flex min-h-[50vh] items-center justify-center overflow-hidden rounded-xl">
          <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full bg-black object-contain" />
          <video ref={localVideoRef} autoPlay muted playsInline className="absolute bottom-3 right-3 h-32 w-48 rounded-lg bg-black/70 object-cover ring-2 ring-white/70" />
          <div className="pointer-events-none absolute left-3 top-3 rounded bg-black/60 px-2 py-1 text-xs text-white">{status}</div>
        </Card>

        <Card className="flex flex-col rounded-xl p-3">
          <div className="mb-2 text-sm font-medium">Data Channel</div>
          <div className="mb-2 rounded-lg border p-2 text-sm h-64 overflow-auto">
            {chatLog.map((m, i) => (
              <div key={i} className={`mb-1 ${m.who === "me" ? "text-right" : "text-left"}`}>
                <span className={`inline-block rounded px-2 py-1 ${m.who === "me" ? "bg-cyan-100" : "bg-gray-100"}`}>{m.text}</span>
              </div>
            ))}
            {!dcOpen && <div className="text-xs text-gray-500">Channel closed or not ready.</div>}
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder={dcOpen ? "Type a message…" : "Channel not ready"}
              value={chatIn}
              onChange={(e) => setChatIn(e.target.value)}
              disabled={!dcOpen}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendChat(); } }}
            />
            <Button onClick={sendChat} disabled={!dcOpen || !chatIn.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="secondary" onClick={toggleMute} className="rounded-full">
          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
        <Button variant="secondary" onClick={toggleCamera} className="rounded-full">
          {camOff ? <CamOff className="h-5 w-5" /> : <CamOn className="h-5 w-5" />}
        </Button>
        <Button variant="secondary" onClick={shareScreen} className="rounded-full">
          <MonitorUp className="h-5 w-5" />
        </Button>
        <Button variant="secondary" onClick={renegotiate} className="rounded-full" title="ICE restart">
          <RefreshCw className="h-5 w-5" />
        </Button>
        <Button variant="destructive" onClick={() => endCall(false)} className="rounded-full">
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
