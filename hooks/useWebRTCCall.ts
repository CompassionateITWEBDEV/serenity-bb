"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  userRingChannel,
  sendOfferToUser,
  sendAnswerToUser,
  sendIceToUser,
  sendHangupToUser,
  type SignalPayload,
} from "@/lib/webrtc/signaling";

export type CallMode = "audio" | "video";
export type CallRole = "caller" | "callee";

type UseCallArgs = {
  open: boolean;
  conversationId: string;
  role: CallRole;
  mode: CallMode;
  meId: string;
  peerUserId: string;
  turn?: { urls: string[]; username?: string; credential?: string };
};

type CallStatus = "ringing" | "connecting" | "connected" | "ended" | "missed";

type State = {
  status: CallStatus;
  dialSeconds: number;
  muted: boolean;
  camOff: boolean;
  mediaError: string | null;
  netOffline: boolean;
  stunOk: boolean | null;
  turnOk: boolean | null;
  usingRelayOnly: boolean;
};

const DEFAULT_STATE: State = {
  status: "ringing",
  dialSeconds: 0,
  muted: false,
  camOff: false,
  mediaError: null,
  netOffline: typeof navigator !== "undefined" ? !navigator.onLine : false,
  stunOk: null,
  turnOk: null,
  usingRelayOnly: false,
};

export function useWebRTCCall(args: UseCallArgs) {
  const { open, conversationId, role, mode, meId, peerUserId, turn } = args;

  // ---------- UI state ----------
  const [state, setState] = useState<State>(DEFAULT_STATE);
  const dialTimerRef = useRef<number | null>(null);

  // ---------- Media / DOM refs ----------
  const localVideoEl = useRef<HTMLVideoElement | null>(null);
  const remoteVideoEl = useRef<HTMLVideoElement | null>(null);
  const remoteAudioEl = useRef<HTMLAudioElement | null>(null);

  // ---------- WebRTC refs ----------
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const unsubRealtimeRef = useRef<(() => void) | null>(null);
  const endedRef = useRef(false);
  const relayOnlyTimerRef = useRef<number | null>(null);

  // ---------- helpers ----------
  const rtcConfig = useMemo<RTCConfiguration>(() => {
    const iceServers: RTCIceServer[] = [];
    // Always include a STUN (works for most). TURN is optional, if provided.
    iceServers.push({ urls: ["stun:stun.l.google.com:19302"] });
    if (turn?.urls?.length) {
      iceServers.push({
        urls: turn.urls,
        username: turn.username,
        credential: turn.credential,
      });
    }
    return { iceServers, iceTransportPolicy: "all" };
  }, [turn]);

  const setLocalVideoRef = useCallback((el: HTMLVideoElement | null) => {
    localVideoEl.current = el;
    if (el && localStreamRef.current) {
      el.srcObject = localStreamRef.current;
      el.muted = true;
      el.playsInline = true;
      el.play().catch(() => void 0);
    }
  }, []);

  const setRemoteVideoRef = useCallback((el: HTMLVideoElement | null) => {
    remoteVideoEl.current = el;
    if (el && remoteStreamRef.current) {
      el.srcObject = remoteStreamRef.current;
      el.playsInline = true;
      el.play().catch(() => void 0);
    }
  }, []);

  const setRemoteAudioRef = useCallback((el: HTMLAudioElement | null) => {
    remoteAudioEl.current = el;
    if (el && remoteStreamRef.current) {
      el.srcObject = remoteStreamRef.current;
      el.play().catch(() => void 0);
    }
  }, []);

  const stopLocal = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
  }, []);

  const cleanup = useCallback(async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    try {
      unsubRealtimeRef.current?.();
    } catch {}
    unsubRealtimeRef.current = null;

    if (pcRef.current) {
      try {
        pcRef.current.onicecandidate = null;
        pcRef.current.ontrack = null;
        pcRef.current.onconnectionstatechange = null;
        pcRef.current.close();
      } catch {}
      pcRef.current = null;
    }
    stopLocal();
    remoteStreamRef.current = null;
    if (dialTimerRef.current) {
      window.clearInterval(dialTimerRef.current);
      dialTimerRef.current = null;
    }
    if (relayOnlyTimerRef.current) {
      window.clearTimeout(relayOnlyTimerRef.current);
      relayOnlyTimerRef.current = null;
    }
  }, [stopLocal]);

  const hangup = useCallback(async () => {
    await sendHangupToUser(peerUserId, conversationId, meId).catch(() => {});
    await cleanup();
    setState((s) => ({ ...s, status: "ended" }));
  }, [cleanup, conversationId, meId, peerUserId]);

  // ---------- media acquisition with fallbacks ----------
  async function acquireLocalStream(wantAudio: boolean, wantVideo: boolean): Promise<MediaStream> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      throw new Error("Browser does not support camera/microphone.");
    }
    if (!isSecureContext) throw new Error("Camera/microphone require HTTPS.");
    const attempts: MediaStreamConstraints[] = [
      { audio: wantAudio, video: wantVideo ? { width: { ideal: 1280 } } : false },
      { audio: wantAudio, video: wantVideo ? { width: { ideal: 640 } } : false },
      { audio: wantAudio, video: wantVideo || false },
      { audio: wantAudio, video: false }, // audio-only fallback
    ];
    let last: any = null;
    for (const c of attempts) {
      try {
        return await navigator.mediaDevices.getUserMedia(c);
      } catch (e) {
        last = e;
      }
    }
    throw last ?? new Error("Failed to start media.");
  }

  // ---------- setup realtime signaling listeners ----------
  const subscribeSignaling = useCallback(() => {
    const ch = userRingChannel(meId);

    const off1 = ch.on("broadcast", { event: "webrtc-offer" }, async (msg) => {
      const p = msg.payload as Extract<SignalPayload, { type: "webrtc-offer" }>;
      if (p.conversationId !== conversationId || p.fromId !== peerUserId) return;
      if (!pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(p.sdp));
        const ans = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(ans);
        await sendAnswerToUser(peerUserId, {
          type: "webrtc-answer",
          conversationId,
          fromId: meId,
          sdp: ans,
        });
        setState((s) => ({ ...s, status: "connecting" }));
      } catch (e) {
        setState((s) => ({ ...s, mediaError: (e as any)?.message || "Failed to answer offer", status: "ended" }));
        cleanup();
      }
    });

    const off2 = ch.on("broadcast", { event: "webrtc-answer" }, async (msg) => {
      const p = msg.payload as Extract<SignalPayload, { type: "webrtc-answer" }>;
      if (p.conversationId !== conversationId || p.fromId !== peerUserId) return;
      if (!pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(p.sdp));
        // remain in connecting until remote track arrives / state changes
      } catch (e) {
        setState((s) => ({ ...s, mediaError: (e as any)?.message || "Failed to set answer", status: "ended" }));
        cleanup();
      }
    });

    const off3 = ch.on("broadcast", { event: "webrtc-ice" }, async (msg) => {
      const p = msg.payload as Extract<SignalPayload, { type: "webrtc-ice" }>;
      if (p.conversationId !== conversationId || p.fromId !== peerUserId) return;
      if (!pcRef.current) return;
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(p.candidate));
      } catch {
        // ignore, can arrive before remote description
      }
    });

    const off4 = ch.on("broadcast", { event: "hangup" }, (msg) => {
      const p = msg.payload as Extract<SignalPayload, { type: "hangup" }>;
      if (p.conversationId !== conversationId || p.fromId !== peerUserId) return;
      setState((s) => ({ ...s, status: "ended" }));
      cleanup();
    });

    // subscribe is already handled in signaling util; channel is cached
    const unsubscribe = () => {
      try {
        // Supabase .on returns channel; no specific off. Recreate no-op to align with cache.
        off1?.unsubscribe?.();
        off2?.unsubscribe?.();
        off3?.unsubscribe?.();
        off4?.unsubscribe?.();
      } catch {}
    };
    unsubRealtimeRef.current = unsubscribe;
  }, [cleanup, conversationId, meId, peerUserId]);

  // ---------- open/close lifecycle ----------
  useEffect(() => {
    if (!open) {
      cleanup();
      setState(DEFAULT_STATE);
      return;
    }

    endedRef.current = false;
    setState((s) => ({ ...DEFAULT_STATE, status: role === "caller" ? "ringing" : "connecting" }));

    // Dial-time timer (missed after 5 min)
    dialTimerRef.current = window.setInterval(() => {
      setState((s) => {
        const next = s.dialSeconds + 1;
        if ((s.status === "ringing" || s.status === "connecting") && next >= 300) {
          // 5 min timeout
          return { ...s, status: "missed", dialSeconds: next };
        }
        return { ...s, dialSeconds: next };
      });
    }, 1000);

    // Online/offline
    const onOnline = () => setState((s) => ({ ...s, netOffline: false }));
    const onOffline = () => setState((s) => ({ ...s, netOffline: true }));
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // Start media + PC
    (async () => {
      try {
        const wantVideo = mode === "video";
        const stream = await acquireLocalStream(true, wantVideo);
        localStreamRef.current = stream;

        if (localVideoEl.current) {
          localVideoEl.current.srcObject = stream;
          localVideoEl.current.muted = true;
          localVideoEl.current.playsInline = true;
          await localVideoEl.current.play().catch(() => void 0);
        }

        // Build PC
        const pc = new RTCPeerConnection(rtcConfig);
        pcRef.current = pc;

        // Track ICE success (stun/turn) and relay-only usage
        let sawHostOrSrflx = false;
        let sawRelay = false;

        pc.onicecandidate = async (e) => {
          if (e.candidate) {
            const c = e.candidate;
            const cand = c.candidate.toLowerCase();
            if (cand.includes(" typ host") || cand.includes(" typ srflx")) sawHostOrSrflx = true;
            if (cand.includes(" typ relay")) sawRelay = true;
            setState((s) => ({
              ...s,
              stunOk: sawHostOrSrflx || s.stunOk === true ? true : s.stunOk,
              turnOk: sawRelay || s.turnOk === true ? true : s.turnOk,
              usingRelayOnly: sawRelay && !sawHostOrSrflx,
            }));
            await sendIceToUser(peerUserId, {
              type: "webrtc-ice",
              conversationId,
              fromId: meId,
              candidate: e.candidate.toJSON(),
            });
          }
        };

        pc.onconnectionstatechange = () => {
          const cs = pc.connectionState;
          if (cs === "connected") {
            setState((s) => ({ ...s, status: "connected" }));
          }
          if (cs === "disconnected" || cs === "failed" || cs === "closed") {
            setState((s) => ({ ...s, status: "ended" }));
            cleanup();
          }
        };

        // Remote media tracks
        remoteStreamRef.current = new MediaStream();
        pc.ontrack = (ev) => {
          ev.streams[0]?.getTracks().forEach((t) => remoteStreamRef.current!.addTrack(t));
          if (remoteVideoEl.current) {
            remoteVideoEl.current.srcObject = remoteStreamRef.current!;
            remoteVideoEl.current.playsInline = true;
            remoteVideoEl.current.play().catch(() => void 0);
          }
          if (remoteAudioEl.current) {
            remoteAudioEl.current.srcObject = remoteStreamRef.current!;
            remoteAudioEl.current.play().catch(() => void 0);
          }
        };

        // Add local tracks
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        // Subscribe signaling after PC ready
        subscribeSignaling();

        if (role === "caller") {
          // Create and send offer
          const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: mode === "video" });
          await pc.setLocalDescription(offer);
          await sendOfferToUser(peerUserId, {
            type: "webrtc-offer",
            conversationId,
            fromId: meId,
            sdp: offer,
          });
          setState((s) => ({ ...s, status: "connecting" }));
        }
        // Callee waits for offer via subscribeSignaling → answers

        // If only relay candidates seen for N seconds, mark relay-only
        relayOnlyTimerRef.current = window.setTimeout(() => {
          setState((s) => ({ ...s, usingRelayOnly: sawRelay && !sawHostOrSrflx }));
        }, 8000);
      } catch (e: any) {
        const name = e?.name || "";
        const msg =
          name === "NotFoundError" || name === "OverconstrainedError"
            ? "Requested device not found. Check camera/mic or try audio-only."
            : name === "NotAllowedError"
            ? "Permission denied for camera/microphone."
            : e?.message || "Failed to start media.";
        setState((s) => ({ ...s, mediaError: msg, status: "ended" }));
        await cleanup();
      }
    })();

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, role, mode, conversationId, meId, peerUserId, rtcConfig]);

  // ---------- controls ----------
  const setMuted = useCallback((muted: boolean) => {
    setState((s) => ({ ...s, muted }));
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }, []);

  const setCamOff = useCallback((off: boolean) => {
    setState((s) => ({ ...s, camOff: off }));
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !off));
  }, []);

  return {
    state,
    setLocalVideoRef,
    setRemoteVideoRef,
    setRemoteAudioRef,
    setMuted,
    setCamOff,
    hangup,
  };
}
