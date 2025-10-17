"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { determineUserRole, getMessagesUrl } from "@/lib/user-role";
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
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      console.log('🎥 Requesting media stream for mode:', mode);
      
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

      console.log('🎥 Media constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('✅ Media stream acquired successfully:', {
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length,
        streamId: stream.id,
        audioTrackLabels: stream.getAudioTracks().map(t => t.label),
        videoTrackLabels: stream.getVideoTracks().map(t => t.label)
      });
      
      // Ensure tracks are enabled
      stream.getAudioTracks().forEach(track => {
        track.enabled = true;
        console.log('🔊 Audio track enabled:', track.label, track.enabled);
      });
      
      stream.getVideoTracks().forEach(track => {
        track.enabled = true;
        console.log('📹 Video track enabled:', track.label, track.enabled);
      });
      
      return stream;
    } catch (error) {
      console.error('❌ Failed to get media stream:', error);
      throw new Error('Failed to access camera/microphone. Please check permissions and try again.');
    }
  }, [mode]);

  // Setup video element - Enhanced version
  const setupVideoElement = useCallback((videoRef: React.RefObject<HTMLVideoElement | null>, stream: MediaStream, isLocal = true) => {
    if (!videoRef.current || !stream) {
      console.warn(`⚠️ Cannot setup video element: videoRef=${!!videoRef.current}, stream=${!!stream}`);
      return false;
    }

    const video = videoRef.current;
    console.log(`🎥 Setting up ${isLocal ? 'local' : 'remote'} video:`, {
      audioTracks: stream.getAudioTracks().length,
      videoTracks: stream.getVideoTracks().length,
      streamId: stream.id,
      videoElement: !!video,
      videoElementReady: video.readyState
    });

    // Stop any existing tracks
    if (video.srcObject) {
      const oldStream = video.srcObject as MediaStream;
      oldStream.getTracks().forEach(track => track.stop());
    }

    // Clear and set new stream
    video.srcObject = null;
    video.srcObject = stream;
    
    // Set video properties
    video.muted = isLocal; // Mute local video, unmute remote
    video.autoplay = true;
    video.playsInline = true;
    video.controls = false;
    video.loop = false;
    
    // Force video to load
    video.load();
    
    // Create a more robust play function
    const playVideo = async () => {
      try {
        console.log(`🎬 Attempting to play ${isLocal ? 'local' : 'remote'} video...`);
        
        // Wait a bit for the video to be ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await video.play();
        console.log(`✅ ${isLocal ? 'Local' : 'Remote'} video started playing successfully`);
        
        // Update debug info
        setDebugInfo(prev => ({ 
          ...prev, 
          [isLocal ? 'localStream' : 'remoteStream']: true 
        }));
        
        // Verify video is actually playing
        setTimeout(() => {
          if (video.readyState >= 2 && video.videoWidth > 0) {
            console.log(`✅ ${isLocal ? 'Local' : 'Remote'} video verified: ${video.videoWidth}x${video.videoHeight}`);
          } else {
            console.warn(`⚠️ ${isLocal ? 'Local' : 'Remote'} video not ready: readyState=${video.readyState}, dimensions=${video.videoWidth}x${video.videoHeight}`);
          }
        }, 1000);
        
      } catch (err) {
        console.warn(`⚠️ Failed to auto-play ${isLocal ? 'local' : 'remote'} video:`, err);
        
        // Multiple retry attempts
        for (let i = 0; i < 3; i++) {
          setTimeout(async () => {
            try {
              if (videoRef.current && videoRef.current.srcObject === stream) {
                await videoRef.current.play();
                console.log(`✅ ${isLocal ? 'Local' : 'Remote'} video started playing on retry ${i + 1}`);
              }
            } catch (retryErr) {
              console.warn(`⚠️ Retry ${i + 1} failed:`, retryErr);
            }
          }, (i + 1) * 500);
        }
      }
    };

    // Try to play immediately
    playVideo();

    // Also try when video events fire
    const handleLoadedMetadata = () => {
      console.log(`📺 ${isLocal ? 'Local' : 'Remote'} video metadata loaded`);
      playVideo();
    };
    
    const handleCanPlay = () => {
      console.log(`▶️ ${isLocal ? 'Local' : 'Remote'} video can play`);
      playVideo();
    };
    
    const handlePlay = () => {
      console.log(`🎬 ${isLocal ? 'Local' : 'Remote'} video is playing`);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
    video.addEventListener('canplay', handleCanPlay, { once: true });
    video.addEventListener('play', handlePlay, { once: true });

    return true;
  }, []);

  // Ensure video elements are set up when streams are available
  useEffect(() => {
    if (localStreamRef.current && localVideoRef.current) {
      console.log('🔄 Re-setting up local video element...');
      setupVideoElement(localVideoRef, localStreamRef.current, true);
    }
  }, [localStreamRef.current, setupVideoElement]);

  useEffect(() => {
    if (remoteStreamRef.current && remoteVideoRef.current) {
      console.log('🔄 Re-setting up remote video element...');
      setupVideoElement(remoteVideoRef, remoteStreamRef.current, false);
    }
  }, [remoteStreamRef.current, setupVideoElement]);

  // Force video setup on component mount
  useEffect(() => {
    const forceVideoSetup = () => {
      console.log('🔧 Force video setup on mount...');
      
      // Check if we have streams and video elements
      if (localStreamRef.current && localVideoRef.current) {
        console.log('🎥 Setting up local video on mount...');
        setupVideoElement(localVideoRef, localStreamRef.current, true);
      }
      
      if (remoteStreamRef.current && remoteVideoRef.current) {
        console.log('🎥 Setting up remote video on mount...');
        setupVideoElement(remoteVideoRef, remoteStreamRef.current, false);
      }
    };

    // Run immediately
    forceVideoSetup();
    
    // Also run after a short delay
    const timeout = setTimeout(forceVideoSetup, 1000);
    
    return () => clearTimeout(timeout);
  }, [setupVideoElement]);

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
        
        // Use the improved setupVideoElement function
        const setupRemoteVideo = () => {
          if (remoteVideoRef.current && event.streams[0]) {
            const success = setupVideoElement(remoteVideoRef, event.streams[0], false);
            if (success) {
              setDebugInfo(prev => ({ ...prev, remoteStream: true }));
            } else {
              // Retry if setup failed
              setTimeout(setupRemoteVideo, 100);
            }
          } else {
            // Retry if video element not ready
            setTimeout(setupRemoteVideo, 100);
          }
        };
        
        setupRemoteVideo();
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('🔗 Connection state changed:', pc.connectionState);
      setDebugInfo(prev => ({ ...prev, connectionState: pc.connectionState }));
      
      if (pc.connectionState === "connected") {
        console.log('✅ Peer connection established!');
        setStatus("connected");
        setConnectionError(null);
        
        // Force video elements to play
        if (localVideoRef.current && localStreamRef.current) {
          localVideoRef.current.play().catch(console.warn);
        }
        if (remoteVideoRef.current && remoteStreamRef.current) {
          remoteVideoRef.current.play().catch(console.warn);
        }
      } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        console.log('❌ Peer connection failed or disconnected');
        setStatus("ended");
        setConnectionError("Connection failed");
      } else if (pc.connectionState === "connecting") {
        console.log('🔄 Peer connection connecting...');
        setStatus("connecting");
      }
    };
    
    // Monitor ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log('🧊 ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        console.log('✅ ICE connection established!');
      } else if (pc.iceConnectionState === "failed") {
        console.log('❌ ICE connection failed');
      }
    };
    
    // Monitor ICE gathering state
    pc.onicegatheringstatechange = () => {
      console.log('🧊 ICE gathering state:', pc.iceGatheringState);
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
      
      // Setup video element with retry
      let videoSetupSuccess = false;
      let retries = 0;
      const maxRetries = 3;
      
      while (!videoSetupSuccess && retries < maxRetries) {
        videoSetupSuccess = setupVideoElement(localVideoRef, localStreamRef.current, true);
        if (!videoSetupSuccess) {
          retries++;
          console.log(`🔄 Retrying video setup (${retries}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      if (!videoSetupSuccess) {
        console.warn('⚠️ Failed to setup local video after retries');
      }

      // Setup peer connection
      const pc = ensurePC();
      console.log('🔗 Adding tracks to peer connection...');
      localStreamRef.current.getTracks().forEach((track) => {
        console.log(`➕ Adding ${track.kind} track:`, track.label, track.enabled);
        pc.addTrack(track, localStreamRef.current!);
      });
      
      // Verify tracks were added
      const senders = pc.getSenders();
      console.log('📤 Peer connection senders:', senders.length);
      senders.forEach((sender, index) => {
        console.log(`Sender ${index}:`, {
          track: sender.track?.kind,
          label: sender.track?.label,
          enabled: sender.track?.enabled
        });
      });

      // Create offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: mode === "video",
      });
      await pc.setLocalDescription(offer);
      sendSignal({ kind: "webrtc-offer", from: me.id, sdp: offer });
      
      // Set connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        if (status !== "connected") {
          console.log('⏰ Connection timeout, forcing connection...');
          // Force video elements to play even if connection state is not "connected"
          if (localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.play().catch(console.warn);
          }
          if (remoteVideoRef.current && remoteStreamRef.current) {
            remoteVideoRef.current.play().catch(console.warn);
          }
          setStatus("connected");
        }
      }, 10000); // 10 second timeout
      
      console.log('✅ Call initiated successfully');
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
            console.log('🎥 Callee getting local media...');
            localStreamRef.current = await getMediaStream();
            setDebugInfo(prev => ({ ...prev, localStream: true }));
            setupVideoElement(localVideoRef, localStreamRef.current, true);
            
            console.log('🔗 Callee adding tracks to peer connection...');
            localStreamRef.current.getTracks().forEach((track) => {
              console.log(`➕ Callee adding ${track.kind} track:`, track.label, track.enabled);
              pc.addTrack(track, localStreamRef.current!);
            });
            
            // Verify tracks were added
            const senders = pc.getSenders();
            console.log('📤 Callee peer connection senders:', senders.length);
            senders.forEach((sender, index) => {
              console.log(`Callee Sender ${index}:`, {
                track: sender.track?.kind,
                label: sender.track?.label,
                enabled: sender.track?.enabled
              });
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

  // Force connection (for debugging)
  const forceConnection = useCallback(() => {
    console.log('🔧 Force connecting...');
    setStatus("connected");
    
    // Force video elements to play
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.play().catch(console.warn);
    }
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.play().catch(console.warn);
    }
  }, []);

  // Force video setup (for debugging)
  const forceVideoSetup = useCallback(() => {
    console.log('🔧 Force video setup...');
    
    if (localStreamRef.current && localVideoRef.current) {
      setupVideoElement(localVideoRef, localStreamRef.current, true);
    }
    if (remoteStreamRef.current && remoteVideoRef.current) {
      setupVideoElement(remoteVideoRef, remoteStreamRef.current, false);
    }
  }, [setupVideoElement]);

  const endCall = useCallback(async () => {
    console.log('📞 Ending call...');
    
    // Clear timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    
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
    setConnectionError(null);
    setMuted(false);
    setCamOff(false);
    setDebugInfo({
      localStream: false,
      remoteStream: false,
      peerConnection: false,
      connectionState: 'new'
    });
    
    // Determine user role and redirect appropriately
    if (me?.id) {
      try {
        const userRole = await determineUserRole(me.id);
        const messagesUrl = getMessagesUrl(userRole);
        console.log(`🔄 Redirecting to ${messagesUrl} for ${userRole} user`);
        router.push(messagesUrl);
      } catch (error) {
        console.error('❌ Error determining user role:', error);
        // Fallback to patient messages page
        router.push('/dashboard/messages');
      }
    } else {
      // Fallback if no user ID
      router.push('/dashboard/messages');
    }
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
          <Button onClick={async () => {
            if (me?.id) {
              try {
                const userRole = await determineUserRole(me.id);
                const messagesUrl = getMessagesUrl(userRole);
                router.push(messagesUrl);
              } catch (error) {
                router.push('/dashboard/messages');
              }
            } else {
              router.push('/dashboard/messages');
            }
          }} className="bg-blue-600 hover:bg-blue-700">
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
            onClick={async () => {
              if (me?.id) {
                try {
                  const userRole = await determineUserRole(me.id);
                  const messagesUrl = getMessagesUrl(userRole);
                  router.push(messagesUrl);
                } catch (error) {
                  router.push('/dashboard/messages');
                }
              } else {
                router.push('/dashboard/messages');
              }
            }}
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
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-400">
                Local: {debugInfo.localStream ? '✅' : '❌'} | 
                Remote: {debugInfo.remoteStream ? '✅' : '❌'} | 
                PC: {debugInfo.connectionState}
              </div>
              {status === "connecting" && (
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={forceConnection}
                    className="text-xs"
                  >
                    Force Connect
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={forceVideoSetup}
                    className="text-xs"
                  >
                    Force Video
                  </Button>
                </div>
              )}
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
                ref={(ref) => {
                  remoteVideoRef.current = ref;
                  // Directly assign stream if available
                  if (ref && remoteStreamRef.current) {
                    console.log('🔗 Directly assigning remote stream to video element');
                    ref.srcObject = remoteStreamRef.current;
                    ref.muted = false;
                    ref.autoplay = true;
                    ref.playsInline = true;
                    ref.play().catch(console.warn);
                  }
                }}
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
                ref={(ref) => {
                  localVideoRef.current = ref;
                  // Directly assign stream if available
                  if (ref && localStreamRef.current) {
                    console.log('🔗 Directly assigning local stream to video element');
                    ref.srcObject = localStreamRef.current;
                    ref.muted = true;
                    ref.autoplay = true;
                    ref.playsInline = true;
                    ref.play().catch(console.warn);
                  }
                }}
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