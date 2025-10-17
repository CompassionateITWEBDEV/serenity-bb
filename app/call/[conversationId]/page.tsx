"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  ArrowLeft,
} from "lucide-react";

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

export default function CallPage() {
  const router = useRouter();
  const { conversationId } = useParams<{ conversationId: string }>();
  const qs = useSearchParams();

  const mode = qs.get("mode") || "audio";
  const role = qs.get("role") || "caller";
  const peerUserId = qs.get("peer") || "";
  const peerName = qs.get("peerName") || "Peer";

  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "ended">("idle");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState({
    localStream: false,
    remoteStream: false,
    peerConnection: false,
    connectionState: 'new'
  });

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const supabaseChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const threadChannel = useMemo(() => `thread_${conversationId}`, [conversationId]);

  // Auth
  useEffect(() => {
    (async () => {
      const { data: au } = await supabase.auth.getUser();
      const uid = au.user?.id;
      if (!uid) {
        router.push("/login");
        return;
      }
      setMe({ id: uid, name: au.user?.email || "Me" });
    })();
  }, [router]);

  // Get media stream
  const getMediaStream = useCallback(async (): Promise<MediaStream> => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: mode === "video" ? {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ Media stream acquired:', {
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length,
        streamId: stream.id
      });
      return stream;
    } catch (error) {
      console.error('❌ Failed to get media stream:', error);
      throw new Error('Failed to access camera/microphone. Please check permissions.');
    }
  }, [mode]);

  // Setup video element
  const setupVideoElement = useCallback((videoRef: React.RefObject<HTMLVideoElement | null>, stream: MediaStream, isLocal = true) => {
    if (videoRef.current && stream) {
      console.log(`🎥 Setting up ${isLocal ? 'local' : 'remote'} video:`, {
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length,
        streamId: stream.id
      });
      
      videoRef.current.srcObject = stream;
      videoRef.current.muted = isLocal; // Mute local video, unmute remote
      videoRef.current.autoplay = true;
      videoRef.current.playsInline = true;
      videoRef.current.controls = false;
      
      videoRef.current.play().then(() => {
        console.log(`✅ ${isLocal ? 'Local' : 'Remote'} video started playing`);
      }).catch(err => {
        console.warn(`⚠️ Failed to auto-play ${isLocal ? 'local' : 'remote'} video:`, err);
        // Retry after a short delay
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.play().catch(console.warn);
          }
        }, 500);
      });
    }
  }, []);

  // Ensure peer connection
  const ensurePC = useCallback((): RTCPeerConnection => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection({
      iceServers: buildIceServers(),
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && me?.id) {
        sendSignal({ kind: "webrtc-ice", from: me.id, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      console.log('📺 Received remote track:', event.track.kind, event.track.label);
      if (event.streams[0]) {
        remoteStreamRef.current = event.streams[0];
        console.log('📺 Remote stream received:', {
          audioTracks: event.streams[0].getAudioTracks().length,
          videoTracks: event.streams[0].getVideoTracks().length,
          streamId: event.streams[0].id
        });
        
        // Setup video element with retry mechanism
        const setupRemoteVideo = () => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
            remoteVideoRef.current.muted = false; // Don't mute remote video
            remoteVideoRef.current.autoplay = true;
            remoteVideoRef.current.playsInline = true;
            remoteVideoRef.current.controls = false;
            
            // Update debug info
            setDebugInfo(prev => ({ ...prev, remoteStream: true }));
            
            remoteVideoRef.current.play().then(() => {
              console.log('✅ Remote video started playing');
            }).catch(err => {
              console.warn('⚠️ Failed to auto-play remote video:', err);
              // Retry after a short delay
              setTimeout(() => {
                if (remoteVideoRef.current) {
                  remoteVideoRef.current.play().catch(console.warn);
                }
              }, 500);
            });
    } else {
            // Retry if video element not ready
            setTimeout(setupRemoteVideo, 100);
          }
        };
        
        setupRemoteVideo();
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('🔗 Connection state:', pc.connectionState);
      setDebugInfo(prev => ({ ...prev, connectionState: pc.connectionState }));
      
      if (pc.connectionState === "connected") {
        setStatus("connected");
        setConnectionError(null);
      } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        setStatus("ended");
        setConnectionError("Connection failed");
      }
    };

    pcRef.current = pc;
    return pc;
  }, [me?.id, setupVideoElement]);

  // Send signal
  const sendSignal = useCallback((payload: SigPayload) => {
    try {
      const ch = supabaseChannelRef.current;
      if (ch) {
        ch.send({ type: "broadcast", event: "signal", payload });
      }
    } catch (error) {
      console.error("Failed to send signal:", error);
    }
  }, []);

  // Start call
  const startCall = useCallback(async () => {
    if (!me?.id || !peerUserId) return;

    try {
      setStatus("connecting");
      setConnectionError(null);

      // Get local media
      localStreamRef.current = await getMediaStream();
      setDebugInfo(prev => ({ ...prev, localStream: true }));
      setupVideoElement(localVideoRef, localStreamRef.current, true);

      // Setup peer connection
      const pc = ensurePC();
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });

      // Create offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: mode === "video",
      });
      await pc.setLocalDescription(offer);
      sendSignal({ kind: "webrtc-offer", from: me.id, sdp: offer });
    } catch (error) {
      console.error("Failed to start call:", error);
      setConnectionError(error instanceof Error ? error.message : "Failed to start call");
      setStatus("ended");
    }
  }, [me?.id, peerUserId, getMediaStream, setupVideoElement, ensurePC, sendSignal, mode]);

  // Handle incoming signals
  useEffect(() => {
    if (!conversationId || !me?.id) return;

    const ch = supabase.channel(threadChannel, { config: { broadcast: { ack: true } } });
    supabaseChannelRef.current = ch;

    ch.on("broadcast", { event: "signal" }, async (e) => {
      const msg = (e.payload || {}) as SigPayload;
      if (!msg || msg.from === me.id) return;

      const pc = ensurePC();

      try {
        if (msg.kind === "webrtc-offer") {
          console.log('📞 Received offer from peer, answering...');
          setStatus("connecting");

          // Get local media if not already available
          if (!localStreamRef.current) {
            localStreamRef.current = await getMediaStream();
            setupVideoElement(localVideoRef, localStreamRef.current, true);
            localStreamRef.current.getTracks().forEach((track) => {
              pc.addTrack(track, localStreamRef.current!);
            });
          }

          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          const answer = await pc.createAnswer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: mode === "video",
          });
          await pc.setLocalDescription(answer);
          sendSignal({ kind: "webrtc-answer", from: me.id, sdp: answer });
        } else if (msg.kind === "webrtc-answer") {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        } else if (msg.kind === "webrtc-ice") {
          await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
        } else if (msg.kind === "bye") {
          setStatus("ended");
        }
      } catch (error) {
        console.error("Error handling signal:", error);
        setConnectionError(error instanceof Error ? error.message : "Connection error");
      }
    });

    ch.subscribe();

    return () => {
      try {
        supabase.removeChannel(ch);
      } catch {}
    };
  }, [conversationId, me?.id, threadChannel, ensurePC, getMediaStream, setupVideoElement, sendSignal, mode]);

  // Auto-start call for caller
  useEffect(() => {
    if (role === "caller" && me?.id && status === "idle") {
      startCall();
    }
  }, [role, me?.id, status, startCall]);

  // Controls
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setMuted(!muted);
    }
  }, [muted]);

  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setCamOff(!camOff);
    }
  }, [camOff]);

  const endCall = useCallback(() => {
    if (me?.id) {
      sendSignal({ kind: "bye", from: me.id });
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (pcRef.current) {
      pcRef.current.close();
    }
    setStatus("ended");
    router.push(`/dashboard/messages`);
  }, [me?.id, sendSignal, router]);

  if (!me) {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "ended") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-6">
            <PhoneOff className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Call Ended</h1>
            {connectionError && (
              <p className="text-red-400 mb-4">{connectionError}</p>
            )}
          </div>
          <Button onClick={() => router.push("/dashboard/messages")} className="bg-blue-600 hover:bg-blue-700">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Messages
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/messages")}
            className="text-white hover:bg-gray-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">
              {mode === "video" ? "Video" : "Audio"} Call
            </h1>
            <p className="text-sm text-gray-400">with {peerName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={status === "connected" ? "default" : "secondary"}>
            {status === "connecting" ? "Connecting..." : status === "connected" ? "Connected" : "Idle"}
          </Badge>
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-400">
              Local: {debugInfo.localStream ? '✅' : '❌'} | 
              Remote: {debugInfo.remoteStream ? '✅' : '❌'} | 
              PC: {debugInfo.connectionState}
            </div>
          )}
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative">
        {mode === "video" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 h-[calc(100vh-200px)]">
            {/* Remote Video */}
            <div className="relative bg-gray-800">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                onLoadedMetadata={() => {
                  console.log('✅ Remote video metadata loaded');
                }}
                onCanPlay={() => {
                  console.log('✅ Remote video can play');
                }}
                onPlay={() => {
                  console.log('✅ Remote video is playing');
                }}
                onError={(e) => {
                  console.error('❌ Remote video error:', e);
                }}
              />
              <div className="absolute top-4 left-4">
                <div className="flex items-center gap-2 bg-black/50 px-3 py-2 rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{peerName[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{peerName}</span>
                </div>
              </div>
              {!remoteStreamRef.current && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="text-center text-white">
                    <div className="animate-pulse text-lg mb-2">Waiting for video...</div>
                    <div className="text-sm text-gray-400">Status: {status}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Local Video */}
            <div className="relative bg-gray-800">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                onLoadedMetadata={() => {
                  console.log('✅ Local video metadata loaded');
                }}
                onCanPlay={() => {
                  console.log('✅ Local video can play');
                }}
                onPlay={() => {
                  console.log('✅ Local video is playing');
                }}
                onError={(e) => {
                  console.error('❌ Local video error:', e);
                }}
              />
              <div className="absolute top-4 left-4">
                <div className="flex items-center gap-2 bg-black/50 px-3 py-2 rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{me.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">You</span>
                </div>
              </div>
              {!localStreamRef.current && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="text-center text-white">
                    <div className="animate-pulse text-lg mb-2">Getting camera...</div>
                    <div className="text-sm text-gray-400">Please allow camera access</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Audio Call Interface */
          <div className="flex items-center justify-center h-[calc(100vh-200px)]">
            <div className="text-center">
              <div className="mb-8">
                <div className="w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="text-2xl">{peerName[0]}</AvatarFallback>
                  </Avatar>
                </div>
                <h2 className="text-2xl font-semibold mb-2">{peerName}</h2>
                <p className="text-gray-400">
                  {status === "connecting" ? "Connecting..." : status === "connected" ? "Connected" : "Calling..."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 p-6 border-t border-gray-700">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMute}
          className={`w-12 h-12 rounded-full ${muted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'}`}
        >
          {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </Button>

        {mode === "video" && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCamera}
            className={`w-12 h-12 rounded-full ${camOff ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            {camOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={endCall}
          className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700"
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}