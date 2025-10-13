"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getSafeMedia, type CallMode } from "@/lib/webrtc/media";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, MonitorUp, ScreenShare, Camera, RefreshCw
} from "lucide-react";

/** Simple helper for unique client id per tab */
function makeClientId() {
  return `${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

type SigMessage =
  | { type: "offer"; from: string; sdp: string }
  | { type: "answer"; from: string; sdp: string }
  | { type: "ice"; from: string; candidate: RTCIceCandidateInit }
  | { type: "bye"; from: string };

export default function CallPage() {
  const { id } = useParams<{ id: string }>();
  const qp = useSearchParams();
  const router = useRouter();

  const mode = (qp.get("mode") as CallMode) || "audio";
  const role = (qp.get("role") as "caller" | "callee") || "caller";
  const peerName = qp.get("peerName") || "Peer";

  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);

  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "ended" | "failed">("idle");
  const [notice, setNotice] = useState<string | null>(null);
  const [timer, setTimer] = useState(0); // seconds since connected

  // controls
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(mode === "audio");
  const [sharing, setSharing] = useState(false);

  // devices
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);
  const [micId, setMicId] = useState<string | undefined>(undefined);
  const [camId, setCamId] = useState<string | undefined>(undefined);

  // core refs
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const chRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const clientIdRef = useRef<string>(makeClientId());
  const connectedAtRef = useRef<number | null>(null);

  // ----- Device enumeration -----
  const refreshDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setMics(all.filter(d => d.kind === "audioinput"));
      setCams(all.filter(d => d.kind === "videoinput"));
    } catch {
      // ignore
    }
  }, []);

  // ----- Signaling helpers (Supabase Realtime) -----
  const publish = useCallback(async (msg: SigMessage) => {
    const ch = chRef.current;
    if (!ch) return;
    await ch.send({
      type: "broadcast",
      event: "signal",
      payload: { ...msg, ts: Date.now() },
    });
  }, []);

  const startSignaling = useCallback((onMsg: (m: SigMessage) => void) => {
    const channel = supabase.channel(`call_${id}`, {
      config: { broadcast: { ack: true } },
    });

    channel.on("broadcast", { event: "signal" }, (e) => {
      const payload = (e?.payload ?? {}) as SigMessage & { from?: string };
      // ignore own messages
      if (!payload?.from || payload.from === clientIdRef.current) return;
      onMsg(payload);
    });

    channel.subscribe((st) => {
      if (st === "SUBSCRIBED") {
        // noop
      }
    });

    chRef.current = channel;
  }, [id]);

  // ------- Create/Replace local media -------
  const attachLocal = useCallback(async (targetMode: CallMode, opts?: { force?: boolean }) => {
    // If camera is off by UI, still request audio when possible
    const wantVideo = targetMode === "video" && !camOff && !sharing;
    const wantAudio = true;

    // If specific devices chosen, request with constraints
    const constraints: MediaStreamConstraints = {
      audio: wantAudio ? (micId ? { deviceId: { exact: micId } } : true) : false,
      video: wantVideo ? (camId ? { deviceId: { exact: camId } } : { width: { ideal: 1280 }, height: { ideal: 720 } }) : false,
    };

    let ms: MediaStream | null = null;

    // First try exact constraints; fallback using getSafeMedia
    try {
      ms = (await navigator.mediaDevices.getUserMedia(constraints)) as MediaStream;
    } catch {
      ms = await getSafeMedia(targetMode);
    }

    if (!ms) {
      if (!notice) setNotice("No mic/camera available. You joined in listen-only mode.");
      // clear local preview
      if (localRef.current) {
        localRef.current.srcObject = null;
      }
      return null;
    }

    // connect preview
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = ms;
    if (localRef.current) {
      localRef.current.srcObject = ms;
      await localRef.current.play().catch(() => {});
    }

    // replace tracks in sender if pc exists
    const pc = pcRef.current;
    if (pc) {
      const senders = pc.getSenders();

      // audio
      const a = ms.getAudioTracks()[0];
      const aSender = senders.find(s => s.track && s.track.kind === "audio");
      if (a) {
        if (aSender) await aSender.replaceTrack(a);
        else pc.addTrack(a, ms);
      } else if (aSender) {
        await aSender.replaceTrack(null);
      }

      // video
      const v = ms.getVideoTracks()[0];
      const vSender = senders.find(s => s.track && s.track.kind === "video");
      if (v) {
        if (vSender) await vSender.replaceTrack(v);
        else pc.addTrack(v, ms);
      } else if (vSender) {
        await vSender.replaceTrack(null);
      }
    }

    // apply mute state
    ms.getAudioTracks().forEach(t => (t.enabled = !muted));
    ms.getVideoTracks().forEach(t => (t.enabled = !camOff));

    return ms;
  }, [camOff, sharing, micId, camId, notice, muted]);

  // ----- Build connection and negotiate -----
  const buildPeer = useCallback(async () => {
    setStatus("connecting");
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pcRef.current = pc;

    // Remote media
    pc.ontrack = (e) => {
      const stream = e.streams?.[0];
      if (stream && remoteRef.current) {
        remoteRef.current.srcObject = stream;
        remoteRef.current
          .play()
          .catch(() => {});
      }
    };

    // ICE
    pc.onicecandidate = async (ev) => {
      if (ev.candidate) {
        await publish({ type: "ice", from: clientIdRef.current, candidate: ev.candidate.toJSON() });
      }
    };

    // Connection state
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") {
        setStatus("connected");
        if (!connectedAtRef.current) connectedAtRef.current = Date.now();
      } else if (s === "disconnected" || s === "failed" || s === "closed") {
        if (status !== "ended") setStatus(s === "failed" ? "failed" : "ended");
      }
    };

    // Local media (attach whatever is available)
    await attachLocal(mode);

    // Signaling
    startSignaling(async (msg) => {
      if (!pcRef.current) return;
      const pc = pcRef.current;

      if (msg.type === "offer") {
        await pc.setRemoteDescription({ type: "offer", sdp: msg.sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await publish({ type: "answer", from: clientIdRef.current, sdp: answer.sdp! });
      } else if (msg.type === "answer") {
        if (!pc.currentRemoteDescription) {
          await pc.setRemoteDescription({ type: "answer", sdp: msg.sdp });
        }
      } else if (msg.type === "ice") {
        try {
          await pc.addIceCandidate(msg.candidate);
        } catch {
          // ignore bad candidates
        }
      } else if (msg.type === "bye") {
        endCall();
      }
    });

    // Kick off offer if we are caller
    if (role === "caller") {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: mode === "video" });
      await pc.setLocalDescription(offer);
      await publish({ type: "offer", from: clientIdRef.current, sdp: offer.sdp! });
    }

    setStatus("connecting");
  }, [attachLocal, mode, publish, role, startSignaling, status]);

  // ----- Screen share -----
  const startScreen = useCallback(async () => {
    try {
      const display = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: false });
      screenStreamRef.current = display;
      const screenTrack = display.getVideoTracks()[0];

      const pc = pcRef.current;
      if (!pc) return;

      const sender = pc.getSenders().find(s => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(screenTrack);

      setSharing(true);
      setCamOff(true);

      // when user stops sharing, revert
      screenTrack.onended = async () => {
        setSharing(false);
        setCamOff(false);
        await attachLocal("video", { force: true });
      };
    } catch {
      // user cancelled
    }
  }, [attachLocal]);

  // ----- End call / cleanup -----
  const endCall = useCallback(async () => {
    try {
      await publish({ type: "bye", from: clientIdRef.current });
    } catch {}
    setStatus("ended");

    try { chRef.current && supabase.removeChannel(chRef.current); } catch {}

    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;

    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;

    try { pcRef.current?.getSenders().forEach(s => s.track?.stop()); } catch {}
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;
  }, [publish]);

  // ----- Lifecycle -----
  useEffect(() => {
    buildPeer().catch(() => setStatus("failed"));
    refreshDevices().catch(() => {});
    const vis = () => document.visibilityState === "visible" && refreshDevices();
    document.addEventListener("visibilitychange", vis);
    return () => {
      document.removeEventListener("visibilitychange", vis);
      endCall().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, mode, role]);

  // call timer
  useEffect(() => {
    let t: any;
    if (status === "connected") {
      t = setInterval(() => {
        if (connectedAtRef.current) {
          setTimer(Math.max(0, Math.round((Date.now() - connectedAtRef.current) / 1000)));
        }
      }, 1000);
    }
    return () => clearInterval(t);
  }, [status]);

  // mute / cam toggles modify track.enabled
  useEffect(() => {
    localStreamRef.current?.getAudioTracks().forEach(tr => (tr.enabled = !muted));
  }, [muted]);
  useEffect(() => {
    localStreamRef.current?.getVideoTracks().forEach(tr => (tr.enabled = !camOff));
  }, [camOff]);

  // device change
  const onPickMic = async (id: string) => {
    setMicId(id);
    await attachLocal(mode);
  };
  const onPickCam = async (id: string) => {
    setCamId(id);
    await attachLocal("video");
  };

  const statusText = useMemo(() => {
    if (status === "connected") return `Connected • ${formatTime(timer)}`;
    if (status === "connecting") return "Connecting…";
    if (status === "ended") return "Call ended";
    if (status === "failed") return "Call failed";
    return "Ready";
  }, [status, timer]);

  return (
    <div className="mx-auto max-w-6xl p-4">
      <div className="mb-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-zinc-800"
          title="Back"
        >
          ← Back
        </button>
        <div className="text-lg font-semibold">
          {mode === "video" ? "Video Call" : "Audio Call"} • {peerName}
        </div>
        <div className="ml-auto text-sm text-gray-500">{statusText}</div>
      </div>

      {notice && (
        <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {notice}
        </div>
      )}

      {/* media panes */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
          <video
            ref={remoteRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />
          {status !== "connected" && (
            <div className="absolute inset-0 grid place-items-center text-sm text-white/70">
              {status === "connecting" ? "Connecting…" : status === "failed" ? "Failed" : "Waiting…"}
            </div>
          )}
        </div>
        <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
          <video
            ref={localRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
          {camOff && (
            <div className="absolute inset-0 grid place-items-center text-sm text-white/70">
              Camera off
            </div>
          )}
        </div>
      </div>

      {/* controls */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setMuted((m) => !m)}
          className="rounded-full border px-3 py-2 hover:bg-gray-50 dark:hover:bg-zinc-800"
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>

        {mode === "video" && (
          <button
            onClick={() => setCamOff((c) => !c)}
            className="rounded-full border px-3 py-2 hover:bg-gray-50 dark:hover:bg-zinc-800"
            title={camOff ? "Turn camera on" : "Turn camera off"}
          >
            {camOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </button>
        )}

        {mode === "video" && (
          <button
            onClick={startScreen}
            className="rounded-full border px-3 py-2 hover:bg-gray-50 dark:hover:bg-zinc-800"
            title="Share screen"
          >
            {sharing ? <MonitorUp className="h-5 w-5" /> : <ScreenShare className="h-5 w-5" />}
          </button>
        )}

        <button
          onClick={() => endCall()}
          className="rounded-full border border-rose-300 bg-rose-600 px-3 py-2 text-white hover:bg-rose-700"
          title="End call"
        >
          <PhoneOff className="h-5 w-5" />
        </button>

        <span className="mx-2 h-6 w-px bg-gray-200" />

        {/* mic picker */}
        <label className="flex items-center gap-2 text-sm">
          Mic
          <select
            className="rounded-md border px-2 py-1"
            value={micId || ""}
            onChange={(e) => onPickMic(e.target.value)}
          >
            <option value="">Default</option>
            {mics.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Mic ${d.deviceId.slice(0, 6)}`}
              </option>
            ))}
          </select>
        </label>

        {/* camera picker */}
        {mode === "video" && (
          <label className="flex items-center gap-2 text-sm">
            Camera
            <select
              className="rounded-md border px-2 py-1"
              value={camId || ""}
              onChange={(e) => onPickCam(e.target.value)}
            >
              <option value="">Default</option>
              {cams.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Cam ${d.deviceId.slice(0, 6)}`}
                </option>
              ))}
            </select>
          </label>
        )}

        <button
          onClick={() => refreshDevices()}
          className="ml-auto rounded-md border px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-zinc-800"
          title="Refresh devices"
        >
          <RefreshCw className="h-4 w-4 inline -mt-0.5" /> Refresh devices
        </button>
      </div>
    </div>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
