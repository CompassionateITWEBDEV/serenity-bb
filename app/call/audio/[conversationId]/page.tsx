"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { callTracker, type CallStatus as CallTrackingStatus } from "@/lib/call-tracking";
import { determineUserRole, getMessagesUrl, type UserRole } from "@/lib/user-role";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ArrowLeft,
} from "lucide-react";
import AudioCallInterface from "@/components/call/AudioCallInterface";

/**
 * Optional TURN/STUN via env:
 * NEXT_PUBLIC_ICE_STUN=stun:stun.l.google.com:19302
 * NEXT_PUBLIC_ICE_TURN_URI=turns:YOUR_TURN_HOST:5349
 * NEXT_PUBLIC_ICE_TURN_USER=turn_user
 * NEXT_PUBLIC_ICE_TURN_PASS=turn_pass
 */
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

export default function AudioCallPage() {
  const router = useRouter();
  const { conversationId } = useParams<{ conversationId: string }>();
  const qs = useSearchParams();

  const role = (qs.get("role") as "caller" | "callee") || "caller";
  const peerUserId = qs.get("peer") || "";
  const peerName = decodeURIComponent(qs.get("peerName") || "Peer");

  const [authChecked, setAuthChecked] = useState(false);
  const [me, setMe] = useState<{ id: string; email?: string | null; name?: string; role?: UserRole } | null>(null);
  const [peerInfo, setPeerInfo] = useState<{ name: string; avatar?: string } | null>(null);

  type CallUIStatus = "idle" | "ringing" | "connecting" | "connected" | "ended" | "failed";
  const [status, setStatus] = useState<CallUIStatus>("idle");
  const [muted, setMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [hasAudio, setHasAudio] = useState<boolean | null>(null);
  const [isFallbackStream, setIsFallbackStream] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isCheckingDevices, setIsCheckingDevices] = useState(false);
  const [connectionTimeout, setConnectionTimeout] = useState<NodeJS.Timeout | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const threadChanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const supabaseChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Audio level monitoring
  const startAudioLevelMonitoring = useCallback(() => {
    if (!localStreamRef.current) return;
    
    const audioTracks = localStreamRef.current.getAudioTracks();
    if (audioTracks.length === 0) {
      console.log("No audio tracks available for level monitoring");
      return;
    }
    
    console.log("Starting audio level monitoring with", audioTracks.length, "audio tracks");
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(localStreamRef.current);
      
      source.connect(analyser);
      analyser.fftSize = 256;
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateAudioLevel = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average);
        
        if (average > 10) {
          console.log(`Audio level: ${average.toFixed(1)} (speaking detected)`);
        }
        
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      
      updateAudioLevel();
    } catch (error) {
      console.warn('Failed to start audio level monitoring:', error);
    }
  }, []);

  const stopAudioLevelMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  // ---------- Auth and user info ----------
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!alive) return;
      if (session.session?.user) {
        const user = session.session.user;
        const userRole = await determineUserRole(user.id);
        setMe({ 
          id: user.id, 
          email: user.email,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          role: userRole
        });
        setAuthChecked(true);
        return;
      }
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        const userRole = await determineUserRole(user.user.id);
        setMe({ 
          id: user.user.id, 
          email: user.user.email,
          name: user.user.user_metadata?.name || user.user.email?.split('@')[0] || 'User',
          role: userRole
        });
        setAuthChecked(true);
        return;
      }
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed.session?.user) {
        const user = refreshed.session.user;
        const userRole = await determineUserRole(user.id);
        setMe({ 
          id: user.id, 
          email: user.email,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          role: userRole
        });
        setAuthChecked(true);
      } else {
        const next = encodeURIComponent(location.pathname + location.search);
        router.replace(`/login?next=${next}`);
      }
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  // Set peer info
  useEffect(() => {
    setPeerInfo({ name: peerName });
  }, [peerName]);

  // Call duration timer
  useEffect(() => {
    if (status === "connected") {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    }
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    };
  }, [status]);

  // ---------- WebRTC core ----------
  const ensurePC = useCallback(() => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection({ iceServers: buildIceServers() });

    pc.onicecandidate = (ev) => {
      if (ev.candidate && me?.id) {
        sendSignal({ kind: "webrtc-ice", from: me.id, candidate: ev.candidate.toJSON() });
      }
    };
    
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      console.log(`🔗 PeerConnection state changed: ${s}`);
      
      if (s === "connected") {
        setStatus("connected");
        callTracker.updateCallStatus(conversationId!, "connected").catch(console.warn);
        startAudioLevelMonitoring();
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          setConnectionTimeout(null);
        }
      } else if (s === "connecting") {
        setStatus("connecting");
      } else if (s === "failed" || s === "disconnected" || s === "closed") {
        setStatus("ended");
        callTracker.updateCallStatus(conversationId!, "ended").catch(console.warn);
        stopAudioLevelMonitoring();
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          setConnectionTimeout(null);
        }
      }
    };

    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState;
      console.log(`🧊 ICE connection state: ${iceState}`);
      
      if (iceState === "connected" || iceState === "completed") {
        console.log("✅ ICE connection established");
        if (status !== "connected") {
          setStatus("connected");
          callTracker.updateCallStatus(conversationId!, "connected").catch(console.warn);
          startAudioLevelMonitoring();
        }
      } else if (iceState === "failed") {
        console.error("❌ ICE connection failed - trying to restart ICE");
        pc.restartIce();
      }
    };

    pc.ontrack = (ev) => {
      console.log(`📡 Received remote ${ev.track.kind} track:`, ev.track.label);
      // For audio calls, we just log the track - no video element needed
    };

    pcRef.current = pc;
    return pc;
  }, [me?.id, conversationId, startAudioLevelMonitoring, stopAudioLevelMonitoring, status]);

  // Get available media devices
  const getAvailableDevices = useCallback(async () => {
    setIsCheckingDevices(true);
    try {
      try {
        const testStream = await navigator.mediaDevices.getUserMedia({ 
          audio: true, 
          video: false 
        });
        testStream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.log("Test stream failed (this is normal):", error);
      }
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log("All detected devices:", devices);
      
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      console.log("Audio input devices:", audioDevices);
      
      setAvailableDevices(devices);
      return devices;
    } catch (error) {
      console.warn("Failed to enumerate devices:", error);
      return [];
    } finally {
      setIsCheckingDevices(false);
    }
  }, []);

  // Enhanced media stream acquisition for audio calls
  const getMediaStream = useCallback(async (): Promise<MediaStream> => {
    try {
      setMediaError(null);
      
      console.log('=== GETTING AUDIO STREAM ===');
      
      const devices = await getAvailableDevices();
      const audioAvailable = devices.some(device => device.kind === 'audioinput');
      
      setHasAudio(audioAvailable);
      
      console.log("Available devices:", { hasAudio: audioAvailable });
      
      if (!audioAvailable) {
        console.warn("No microphone found for audio call, creating fallback");
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.gain.value = 0; // Silent
          oscillator.frequency.value = 440;
          oscillator.start();
          
          const destination = audioContext.createMediaStreamDestination();
          oscillator.connect(destination);
          
          const stream = destination.stream;
          setIsFallbackStream(true);
          return stream;
        } catch (error) {
          console.warn("Failed to create audio fallback, using video fallback instead");
          const canvas = document.createElement('canvas');
          canvas.width = 320;
          canvas.height = 240;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 320, 240);
            ctx.fillStyle = '#ffffff';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No Microphone', 160, 120);
          }
          
          const stream = canvas.captureStream(30);
          setIsFallbackStream(true);
          return stream;
        }
      }
      
      const constraints: MediaStreamConstraints = {
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      };
      
      try {
        console.log('🎯 Trying audio constraints:', constraints);
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('✅ Audio stream acquired:', {
          audioTracks: stream.getAudioTracks().length,
          streamId: stream.id,
          active: stream.active
        });
        
        stream.getAudioTracks().forEach(track => {
          track.enabled = true;
          console.log(`🔊 Audio track enabled: ${track.label}`);
        });
        
        return stream;
      } catch (error: any) {
        console.warn("❌ Audio constraints failed, trying basic constraints:", error);
        
        try {
          const basicStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          console.log('✅ Audio stream acquired with basic constraints:', {
            audioTracks: basicStream.getAudioTracks().length,
            streamId: basicStream.id,
            active: basicStream.active
          });
          
          basicStream.getAudioTracks().forEach(track => {
            track.enabled = true;
            console.log(`🔊 Audio track enabled: ${track.label}`);
          });
          
          return basicStream;
        } catch (basicError: any) {
          console.warn("❌ Basic audio constraints also failed:", basicError);
          throw error;
        }
      }
    } catch (error: any) {
      console.error("Audio access error:", error);
      
      let errorMessage = "Unable to access microphone.";
      
      if (error.name === "NotAllowedError" || error.message?.includes("Permission denied")) {
        errorMessage = "Microphone access denied. Please allow microphone access and try again.";
      } else if (error.name === "NotFoundError") {
        errorMessage = "No microphone found. Please connect your microphone and try again.";
      } else if (error.name === "NotReadableError") {
        errorMessage = "Microphone is being used by another application. Please close other apps and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setMediaError(errorMessage);
      setStatus("failed");
      throw error;
    }
  }, [getAvailableDevices]);

  // ---------- Signaling ----------
  const threadChannel = useMemo(() => `thread_${conversationId}`, [conversationId]);

  const sendSignal = useCallback((payload: SigPayload) => {
    if (!supabaseChannelRef.current) {
      console.warn("Cannot send signal: supabaseChannelRef.current is null");
      return;
    }
    try {
      supabaseChannelRef.current.send({ type: "broadcast", event: "signal", payload });
      console.log(`✅ Sent signal: ${payload.kind}`);
    } catch (error) {
      console.error("Failed to send signal:", error);
    }
  }, []);

  useEffect(() => {
    if (!conversationId || !me?.id) return;

    const ch = supabase.channel(threadChannel, { config: { broadcast: { ack: true } } });
    supabaseChannelRef.current = ch;

    ch.on("broadcast", { event: "signal" }, async (e) => {
      const msg = (e.payload || {}) as SigPayload;
      if (!msg || msg.from === me.id) return;

      if (msg.kind === "webrtc-offer") {
        console.log('📞 Received offer from peer, answering immediately...');
        setStatus("connecting");
        
        try {
          if (!localStreamRef.current) {
            console.log('🎤 Getting local audio stream for callee...');
            localStreamRef.current = await getMediaStream();
            console.log('✅ Local audio stream acquired for callee:', {
              audioTracks: localStreamRef.current.getAudioTracks().length,
              streamId: localStreamRef.current.id
            });
            
            const pc = ensurePC();
            localStreamRef.current.getTracks().forEach((t) => {
              console.log(`Adding ${t.kind} track to peer connection:`, t.label);
              pc.addTrack(t, localStreamRef.current!);
            });
          }
          
          const pc = ensurePC();
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          const answer = await pc.createAnswer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: false,
          });
          console.log('Created answer with audio:', answer.sdp?.includes('m=audio'));
          await pc.setLocalDescription(answer);
          sendSignal({ kind: "webrtc-answer", from: me.id, sdp: answer });
          console.log('✅ Answer sent to peer - connection should establish now');
          
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
            setConnectionTimeout(null);
          }
        } catch (error) {
          console.error('❌ Failed to handle offer:', error);
          setStatus("failed");
          setMediaError("Failed to establish connection. Please try again.");
        }
      } else if (msg.kind === "webrtc-answer") {
        const pc = ensurePC();
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      } else if (msg.kind === "webrtc-ice") {
        try {
          const pc = ensurePC();
          console.log(`🧊 Adding ICE candidate:`, msg.candidate);
          await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
          console.log(`✅ ICE candidate added successfully`);
        } catch (error) {
          console.warn(`⚠️ Failed to add ICE candidate:`, error);
        }
      } else if (msg.kind === "bye") {
        endCall(true);
      }
    });

    ch.subscribe();
    threadChanRef.current = ch;

    return () => {
      try {
        if (supabaseChannelRef.current) {
          supabase.removeChannel(supabaseChannelRef.current);
          supabaseChannelRef.current = null;
        }
      } catch {}
      threadChanRef.current = null;
    };
  }, [conversationId, ensurePC, me?.id, threadChannel, getMediaStream, sendSignal, connectionTimeout]);

  // ---------- Ring peer ----------
  async function ringPeer() {
    if (!peerUserId || !conversationId || !me?.id) return;
    
    const callerName = me.name || me.email || "Caller";
    const callerAvatar = null;
    
    const ch = supabase.channel(`user_${peerUserId}`, { config: { broadcast: { ack: true } } });
    const staffCh = supabase.channel(`staff-calls-${peerUserId}`, { config: { broadcast: { ack: true } } });
    
    try {
      await Promise.all([
        new Promise<void>((res, rej) => {
          const to = setTimeout(() => rej(new Error("subscribe timeout")), 8000);
          ch.subscribe((s) => {
            if (s === "SUBSCRIBED") {
              clearTimeout(to);
              res();
            }
            if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") {
              clearTimeout(to);
              rej(new Error(String(s)));
            }
          });
        }),
        new Promise<void>((res, rej) => {
          const to = setTimeout(() => rej(new Error("staff subscribe timeout")), 8000);
          staffCh.subscribe((s) => {
            if (s === "SUBSCRIBED") {
              clearTimeout(to);
              res();
            }
            if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") {
              clearTimeout(to);
              rej(new Error(String(s)));
            }
          });
        })
      ]);

      await ch.send({
        type: "broadcast",
        event: "invite",
        payload: { conversationId, fromId: me.id, fromName: callerName, mode: "audio" },
      });

      await staffCh.send({
        type: "broadcast",
        event: "incoming-call",
        payload: {
          conversationId,
          callerId: me.id,
          callerName,
          callerAvatar,
          mode: "audio",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Failed to send ring notification:", error);
    } finally {
      try {
        supabase.removeChannel(ch);
        supabase.removeChannel(staffCh);
      } catch {}
    }
  }

  async function byePeer() {
    if (!peerUserId || !conversationId) return;
    const ch = supabase.channel(`user_${peerUserId}`, { config: { broadcast: { ack: true } } });
    await new Promise<void>((res) => ch.subscribe((s) => s === "SUBSCRIBED" && res()));
    await ch.send({ type: "broadcast", event: "bye", payload: { conversationId } });
    try {
      supabase.removeChannel(ch);
    } catch {}
  }

  // ---------- Start flow ----------
  const startOrPrep = useCallback(async () => {
    if (!me?.id) return;

    setStatus("connecting");
    setMediaError(null);

    callTracker.logCallEvent({
      conversationId: conversationId!,
      callerId: me.id,
      calleeId: peerUserId,
      callerName: me.name || me.email || "Caller",
      calleeName: peerInfo?.name || peerName,
      callType: "audio",
      status: "initiated",
      startedAt: new Date().toISOString(),
    }).catch(console.warn);

    try {
      localStreamRef.current = await getMediaStream();
      console.log('Audio stream acquired:', {
        audioTracks: localStreamRef.current.getAudioTracks().length,
        streamId: localStreamRef.current.id
      });

      const pc = ensurePC();
      localStreamRef.current.getTracks().forEach((t) => {
        console.log(`Adding ${t.kind} track to peer connection:`, t.label);
        pc.addTrack(t, localStreamRef.current!);
      });

      if (role === "caller") {
        setStatus("ringing");
        callTracker.updateCallStatus(conversationId!, "ringing").catch(console.warn);
        
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false,
        });
        console.log('Created offer with audio:', offer.sdp?.includes('m=audio'));
        await pc.setLocalDescription(offer);
        sendSignal({ kind: "webrtc-offer", from: me.id, sdp: offer });
        await ringPeer();
        
        const timeout = setTimeout(() => {
          if (status !== "connected") {
            console.warn("⚠️ Connection timeout - no response from peer");
            setStatus("failed");
            setMediaError("Connection timeout. The other person may not be available or there may be a network issue.");
          }
        }, 30000);
        setConnectionTimeout(timeout);
      }
    } catch (error) {
      console.error("Failed to start call:", error);
      setStatus("failed");
    }
  }, [ensurePC, getMediaStream, me?.id, role, sendSignal, conversationId, peerUserId, peerInfo?.name, peerName, status]);

  useEffect(() => {
    if (!authChecked || !me?.id) return;
    
    if (role === "caller") {
      (async () => {
        await startOrPrep();
      })();
    } else {
      console.log('📞 Callee ready, waiting for offer...');
      setStatus("idle");
      getAvailableDevices();
      
      const calleeTimeout = setTimeout(() => {
        if (status === "idle") {
          console.warn("⚠️ Callee timeout - no offer received");
          setStatus("failed");
          setMediaError("No incoming call received. The caller may have cancelled or there may be a connection issue.");
        }
      }, 60000);
      
      return () => clearTimeout(calleeTimeout);
    }
  }, [authChecked, me?.id, role, startOrPrep, getAvailableDevices, status]);

  // Auto-accept incoming calls for callees
  useEffect(() => {
    if (role === "callee" && status === "idle" && authChecked && me?.id) {
      const urlParams = new URLSearchParams(window.location.search);
      const autoAccept = urlParams.get('autoAccept');
      
      if (autoAccept === 'true') {
        console.log('📞 Auto-accepting incoming audio call - preparing immediately...');
        
        (async () => {
          try {
            localStreamRef.current = await getMediaStream();
            console.log('✅ Local audio stream acquired for auto-accept:', {
              audioTracks: localStreamRef.current.getAudioTracks().length,
              streamId: localStreamRef.current.id
            });
            
            const pc = ensurePC();
            localStreamRef.current.getTracks().forEach((t) => {
              console.log(`Adding ${t.kind} track to peer connection:`, t.label);
              pc.addTrack(t, localStreamRef.current!);
            });
            
            console.log('✅ Callee ready for immediate connection');
          } catch (error) {
            console.error('❌ Failed to prepare auto-accept call:', error);
            setStatus("failed");
            setMediaError("Failed to prepare call. Please try again.");
          }
        })();
      }
    }
  }, [role, status, authChecked, me?.id, getMediaStream, ensurePC]);

  // Cleanup connection timeout on unmount
  useEffect(() => {
    return () => {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
    };
  }, [connectionTimeout]);

  // ---------- Controls ----------
  const toggleMute = useCallback(() => {
    const s = localStreamRef.current;
    if (!s) {
      console.warn("No local stream available for mute toggle");
      return;
    }
    
    const audioTracks = s.getAudioTracks();
    console.log(`Toggling mute for ${audioTracks.length} audio tracks`);
    
    if (audioTracks.length === 0) {
      console.warn("No audio tracks found in local stream");
      return;
    }
    
    const newMutedState = !muted;
    audioTracks.forEach((t) => {
      t.enabled = !newMutedState;
      console.log(`Audio track ${t.label} enabled: ${t.enabled}`);
    });
    
    setMuted(newMutedState);
    console.log(`Mute state changed to: ${newMutedState}`);
  }, [muted]);

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn(prev => !prev);
  }, []);

  const endCall = useCallback(
    (remote = false) => {
      setStatus("ended");
      
      callTracker.updateCallStatus(conversationId!, "ended").catch(console.warn);
      stopAudioLevelMonitoring();
      
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
      
      try {
        pcRef.current?.getSenders().forEach((s) => s.track?.stop());
      } catch {}
      try {
        pcRef.current?.close();
      } catch {}
      pcRef.current = null;
      
      try {
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
      } catch {}
      localStreamRef.current = null;

      if (!remote && me?.id) {
        sendSignal({ kind: "bye", from: me.id });
        void byePeer();
      }

      const messagesUrl = me?.role ? getMessagesUrl(me.role) : '/dashboard/messages';
      router.push(messagesUrl);
    },
    [byePeer, me?.id, router, sendSignal, conversationId, stopAudioLevelMonitoring]
  );

  useEffect(() => {
    const onUnload = () => endCall(false);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      stopAudioLevelMonitoring();
    };
  }, [endCall, stopAudioLevelMonitoring]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Joining the call...</p>
        </div>
      </div>
    );
  }

  if (status === "connecting") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Connecting...</p>
          <p className="text-gray-400 text-sm mt-2">Setting up microphone</p>
        </div>
      </div>
    );
  }

  if (status === "idle" && role === "callee") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse rounded-full h-12 w-12 border-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-white text-lg">Waiting for call...</p>
          <p className="text-gray-400 text-sm mt-2">Ready to receive incoming call from {peerInfo?.name || peerName}</p>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-500 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
            <PhoneOff className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Call Failed</h2>
          <p className="text-gray-300 mb-6">
            {mediaError || "Unable to establish connection. Please try again."}
          </p>
          
          <div className="space-y-3">
            <Button onClick={() => window.location.reload()} className="w-full">
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                const messagesUrl = me?.role ? getMessagesUrl(me.role) : '/dashboard/messages';
                router.push(messagesUrl);
              }} 
              className="w-full"
            >
              Back to Messages
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AudioCallInterface
      peerName={peerInfo?.name || peerName}
      peerAvatar={peerInfo?.avatar}
      status={status}
      callDuration={callDuration}
      muted={muted}
      isMuted={muted}
      onToggleMute={toggleMute}
      onEndCall={() => endCall(false)}
      onToggleSpeaker={toggleSpeaker}
      isSpeakerOn={isSpeakerOn}
      audioLevel={audioLevel}
      hasAudio={hasAudio}
      isFallbackStream={isFallbackStream}
      formatDuration={formatDuration}
    />
  );
}
