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
  RefreshCw,
} from "lucide-react";

/**
 * ICE Servers configuration
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
  const peerName = qs.get("peerName") || "Unknown";
  const autoAccept = qs.get("autoAccept") === "true";

  // State
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "ended">("idle");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<{
    camera: boolean;
    microphone: boolean;
  }>({ camera: true, microphone: true });
  const [userInteracted, setUserInteracted] = useState(false);
  const [videoPlaybackBlocked, setVideoPlaybackBlocked] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    localStream: false,
    remoteStream: false,
    peerConnection: false,
    connectionState: 'new'
  });

  // Refs
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const supabaseChannelRef = useRef<any>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const threadChannel = `thread_${conversationId}`;

  // Get user info
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

  // Get media stream with device fallbacks
  const getMediaStream = useCallback(async (): Promise<MediaStream> => {
    try {
      console.log('🎥 Requesting media stream for mode:', mode);
      
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Media devices not supported in this browser');
      }
      
      // Try full constraints first
      const fullConstraints: MediaStreamConstraints = {
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

      console.log('🎥 Trying full media constraints:', fullConstraints);
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia(fullConstraints);
        console.log('✅ Full media stream acquired successfully');
        setDeviceStatus({ camera: true, microphone: true });
        return stream;
      } catch (fullError) {
        console.warn('⚠️ Full constraints failed, trying fallbacks...', fullError);
        
        // Try audio only
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ 
            audio: true, 
            video: false 
          });
          console.log('✅ Audio-only stream acquired');
          setDeviceStatus({ camera: false, microphone: true });
          return audioStream;
        } catch (audioError) {
          console.warn('⚠️ Audio-only failed, trying no media...', audioError);
          
          // Try no media (connection only)
          try {
            const noMediaStream = await navigator.mediaDevices.getUserMedia({ 
              audio: false, 
              video: false 
            });
            console.log('✅ No-media stream acquired (connection only)');
            setDeviceStatus({ camera: false, microphone: false });
            return noMediaStream;
          } catch (noMediaError) {
            console.error('❌ All media attempts failed');
            setDeviceStatus({ camera: false, microphone: false });
            throw new Error('No camera/microphone available. You are connected (audio/video disabled).');
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to get media stream:', error);
      setDeviceStatus({ camera: false, microphone: false });
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new Error('Camera/microphone access denied. Please allow access and try again.');
        } else if (error.name === 'NotFoundError') {
          throw new Error('No camera/microphone found. Please check your devices.');
        } else if (error.name === 'NotReadableError') {
          throw new Error('Camera/microphone is being used by another application.');
        }
      }
      
      throw error;
    }
  }, [mode]);

  // Enhanced video element setup
  const setupVideoElement = useCallback((videoRef: React.RefObject<HTMLVideoElement | null>, stream: MediaStream, isLocal = true) => {
    try {
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
      
      // Set video properties safely
      try {
        video.muted = isLocal; // Mute local video, unmute remote
        video.autoplay = true;
        video.playsInline = true;
        video.controls = false;
        video.loop = false;
        
        // Force video to load
        video.load();
        
        // Force play immediately after setting srcObject
        setTimeout(() => {
          if (video.paused) {
            console.log(`🔄 Force playing ${isLocal ? 'local' : 'remote'} video immediately...`);
            video.play().catch(console.warn);
          }
        }, 100);
      } catch (videoError) {
        console.warn('⚠️ Error setting video properties:', videoError);
      }
      
      // Create a more robust play function
    const playVideo = async () => {
      try {
        console.log(`🎬 Attempting to play ${isLocal ? 'local' : 'remote'} video...`);
        
        // Check if user has interacted with the page
        if (!userInteracted) {
          console.log(`⏳ Waiting for user interaction before playing ${isLocal ? 'local' : 'remote'} video...`);
          setVideoPlaybackBlocked(true);
          return;
        }
        
        // Force play immediately - don't wait for readyState
        const playPromise = video.play();
        
        // Handle play promise
        if (playPromise !== undefined) {
          await playPromise;
        }
        
        console.log(`✅ ${isLocal ? 'Local' : 'Remote'} video started playing successfully`);
        setVideoPlaybackBlocked(false);
        
        // Update debug info
        setDebugInfo(prev => ({ 
          ...prev, 
          [isLocal ? 'localStream' : 'remoteStream']: true 
        }));
        
        // Force status to connected if local video is working
        if (isLocal) {
          setTimeout(() => {
            setStatus("connected");
            console.log('✅ Status set to connected due to local video working');
          }, 500);
        }
        
        // Verify video is actually playing and force play if needed
        setTimeout(() => {
          if (video.readyState >= 2 && video.videoWidth > 0) {
            console.log(`✅ ${isLocal ? 'Local' : 'Remote'} video verified: ${video.videoWidth}x${video.videoHeight}`);
          } else {
            console.warn(`⚠️ ${isLocal ? 'Local' : 'Remote'} video not ready: readyState=${video.readyState}, dimensions=${video.videoWidth}x${video.videoHeight}`);
            // Force play again
            video.play().catch(console.warn);
          }
        }, 1000);
        
      } catch (err) {
        console.warn(`⚠️ Failed to auto-play ${isLocal ? 'local' : 'remote'} video:`, err);
        
        // Handle autoplay policy error
        if (err instanceof Error && err.name === 'NotAllowedError') {
          console.log(`ℹ️ Video play blocked by browser autoplay policy - user interaction required`);
          setVideoPlaybackBlocked(true);
          return;
        }
        
        // Retry after a short delay for other errors
        setTimeout(async () => {
          try {
            if (videoRef.current && videoRef.current.srcObject === stream) {
              await videoRef.current.play();
              console.log(`✅ ${isLocal ? 'Local' : 'Remote'} video started playing on retry`);
              setVideoPlaybackBlocked(false);
              
              if (isLocal) {
                setStatus("connected");
              }
            }
          } catch (retryErr) {
            console.warn(`⚠️ Retry failed:`, retryErr);
            if (retryErr instanceof Error && retryErr.name === 'NotAllowedError') {
              setVideoPlaybackBlocked(true);
            }
          }
        }, 1000);
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
    } catch (error) {
      console.error('❌ Error in setupVideoElement:', error);
      return false;
    }
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
  const sendSignal = useCallback(async (payload: SigPayload) => {
    if (!conversationId) return;
    
    const ch = supabase.channel(threadChannel, { config: { broadcast: { ack: true } } });
    const response = await ch.send({
      type: "broadcast",
      event: "signal",
      payload,
    });
    
    if (response !== "ok") {
      throw new Error("Failed to send signal");
    }
  }, [conversationId, threadChannel]);

  // Start call - simplified for both caller and callee
  const startCall = useCallback(async () => {
    if (!me?.id || !peerUserId) return;

    try {
      console.log('🚀 Starting call...');
      setStatus("connecting");
      setConnectionError(null);

      // Get local media with error handling
      try {
        localStreamRef.current = await getMediaStream();
        setDebugInfo(prev => ({ ...prev, localStream: true }));
        console.log('✅ Local media acquired');
      } catch (mediaError) {
        console.error('❌ Failed to get media:', mediaError);
        setConnectionError(mediaError instanceof Error ? mediaError.message : "Failed to access camera/microphone");
        setStatus("ended");
        return;
      }
      
      // Setup video element with error handling
      try {
        const videoSetupSuccess = setupVideoElement(localVideoRef, localStreamRef.current, true);
        if (!videoSetupSuccess) {
          console.warn('⚠️ Video setup failed, but continuing...');
        }
      } catch (videoError) {
        console.error('❌ Video setup error:', videoError);
        // Continue anyway - audio might still work
      }
      
      // Setup peer connection
      try {
        const pc = ensurePC();
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
        console.log('✅ Peer connection setup complete');
      } catch (pcError) {
        console.error('❌ Peer connection error:', pcError);
        setConnectionError("Failed to setup connection");
        setStatus("ended");
        return;
      }

      // If caller, create and send offer
      if (role === "caller") {
        try {
          const pc = ensurePC();
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: mode === "video",
          });
          await pc.setLocalDescription(offer);
          await sendSignal({ kind: "webrtc-offer", from: me.id, sdp: offer });
          console.log('✅ Offer sent');
        } catch (offerError) {
          console.error('❌ Failed to create/send offer:', offerError);
          setConnectionError("Failed to initiate call");
          setStatus("ended");
          return;
        }
      }
      
      // Set to connected state
      setStatus("connected");
      console.log('✅ Call connected');
      
    } catch (error) {
      console.error("Failed to start call:", error);
      setConnectionError(error instanceof Error ? error.message : "Failed to start call");
      setStatus("ended");
    }
  }, [me?.id, peerUserId, getMediaStream, setupVideoElement, ensurePC, sendSignal, mode, role]);

  // User interaction handler for video playback
  useEffect(() => {
    const handleUserInteraction = () => {
      if (!userInteracted) {
        console.log('👆 User interaction detected - enabling video playback');
        setUserInteracted(true);
        setVideoPlaybackBlocked(false);
        
        // Try to play videos after user interaction
        setTimeout(() => {
          if (localVideoRef.current && localVideoRef.current.paused) {
            localVideoRef.current.play().catch(console.warn);
          }
          if (remoteVideoRef.current && remoteVideoRef.current.paused) {
            remoteVideoRef.current.play().catch(console.warn);
          }
        }, 100);
      }
    };

    // Add event listeners for user interaction
    document.addEventListener('click', handleUserInteraction, { once: true });
    document.addEventListener('keydown', handleUserInteraction, { once: true });
    document.addEventListener('touchstart', handleUserInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [userInteracted]);

  // Retry video playback when user interaction is detected
  useEffect(() => {
    if (userInteracted && videoPlaybackBlocked) {
      console.log('🔄 Retrying video playback after user interaction...');
      setVideoPlaybackBlocked(false);
      
      // Try to play videos
      setTimeout(() => {
        if (localVideoRef.current && localVideoRef.current.paused) {
          localVideoRef.current.play().catch(console.warn);
        }
        if (remoteVideoRef.current && remoteVideoRef.current.paused) {
          remoteVideoRef.current.play().catch(console.warn);
        }
      }, 200);
    }
  }, [userInteracted, videoPlaybackBlocked]);

  // Simple call start - works for both caller and callee
  useEffect(() => {
    if (me?.id && peerUserId && status === "idle") {
      console.log('🚀 Starting call immediately...');
      // Start call right away - no delays
      startCall();
    }
  }, [me?.id, peerUserId, status, startCall]);

  // Handle incoming signals
  useEffect(() => {
    if (!conversationId || !me?.id) return;

    console.log('🔗 Setting up signaling channel:', threadChannel);
    const ch = supabase.channel(threadChannel, { config: { broadcast: { ack: true } } });
    supabaseChannelRef.current = ch;

    ch.on("broadcast", { event: "signal" }, async (e) => {
      console.log('📡 Received signal:', e.payload);
      const msg = (e.payload || {}) as SigPayload;
      if (!msg || msg.from === me.id) {
        console.log('📡 Ignoring signal from self or invalid message');
        return;
      }

      console.log('📡 Processing signal from:', msg.from, 'kind:', msg.kind);
      const pc = ensurePC();

      try {
        if (msg.kind === "webrtc-offer") {
          console.log('📞 Received offer, answering...');
          
          // Get local media if not already available
          if (!localStreamRef.current) {
            localStreamRef.current = await getMediaStream();
            setDebugInfo(prev => ({ ...prev, localStream: true }));
            setupVideoElement(localVideoRef, localStreamRef.current, true);
            
            localStreamRef.current.getTracks().forEach((track) => {
              pc.addTrack(track, localStreamRef.current!);
            });
          }

          // Handle offer
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          const answer = await pc.createAnswer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: mode === "video",
          });
          await pc.setLocalDescription(answer);
          await sendSignal({ kind: "webrtc-answer", from: me.id, sdp: answer });
          console.log('✅ Answer sent');
        } else if (msg.kind === "webrtc-answer") {
          console.log('📞 Received answer from peer');
          // Check if we can set remote description
          if (pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            console.log('✅ Set remote description (answer)');
          } else {
            console.warn('⚠️ Cannot set remote description - wrong signaling state:', pc.signalingState);
          }
        } else if (msg.kind === "webrtc-ice") {
          console.log('🧊 Received ICE candidate from peer');
          try {
            await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
            console.log('✅ Added ICE candidate');
          } catch (iceError) {
            console.warn('⚠️ Failed to add ICE candidate:', iceError);
          }
        } else if (msg.kind === "bye") {
          console.log('📞 Received end call signal from peer');
          // Show notification that other participant ended the call
          alert("The other participant ended the call.");
          // End call for this participant too
          endCall();
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
  }, [conversationId, me?.id, ensurePC, getMediaStream, setupVideoElement, sendSignal, mode]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const newMutedState = !muted;
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !newMutedState; // enabled = !muted
      });
      setMuted(newMutedState);
      console.log(`🔊 Audio ${newMutedState ? 'muted' : 'unmuted'}`);
    }
  }, [muted]);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const newCamOffState = !camOff;
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !newCamOffState; // enabled = !camOff
      });
      setCamOff(newCamOffState);
      console.log(`📹 Camera ${newCamOffState ? 'turned off' : 'turned on'}`);
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

  // Refresh camera
  const refreshCamera = useCallback(async () => {
    console.log('🔄 Refreshing camera...');
    try {
      // Stop existing stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Get new stream
      localStreamRef.current = await getMediaStream();
      setDebugInfo(prev => ({ ...prev, localStream: true }));
      
      // Setup video element
      setupVideoElement(localVideoRef, localStreamRef.current, true);
      
      // Add tracks to peer connection if connected
      if (pcRef.current && localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pcRef.current!.addTrack(track, localStreamRef.current!);
        });
      }
      
      console.log('✅ Camera refreshed successfully');
    } catch (error) {
      console.error('❌ Failed to refresh camera:', error);
      setConnectionError('Failed to refresh camera. Please check permissions.');
    }
  }, [getMediaStream, setupVideoElement]);

  const endCall = useCallback(async () => {
    console.log('📞 Ending call...');
    
    // Clear timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    
    // Broadcast end call to both participants
    if (me?.id) {
      try {
        await sendSignal({ 
          kind: "bye", 
          from: me.id
        });
        console.log('📤 End call broadcast sent to both participants');
      } catch (error) {
        console.warn('⚠️ Failed to broadcast end call:', error);
      }
    }
    
    // Stop all media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log(`🛑 Stopped ${track.kind} track:`, track.label);
      });
    }
    
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log(`🛑 Stopped remote ${track.kind} track:`, track.label);
      });
    }
    
    // Close peer connection
    if (pcRef.current) {
      pcRef.current.close();
      console.log('🔌 Peer connection closed');
    }
    
    // Update status and clear state
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  // Show simple loading screen while call starts
  if (status === "idle") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-white text-lg mb-2">Opening video screen...</p>
          <p className="text-gray-400 text-sm">Connecting to {peerName}</p>
        </div>
      </div>
    );
  }

  // Show device fallback UI
  const DeviceFallback = ({ isLocal, name }: { isLocal: boolean; name: string }) => {
    const hasCamera = isLocal ? deviceStatus.camera : true; // Assume remote has camera for now
    const hasMic = isLocal ? deviceStatus.microphone : true; // Assume remote has mic for now
    
    if (hasCamera && hasMic) return null;
    
    return (
      <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-white">
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
          <p className="text-white text-lg mb-2">{name}</p>
          <p className="text-gray-400 text-sm">
            {!hasCamera && !hasMic && "No camera/microphone detected"}
            {!hasCamera && hasMic && "No camera detected"}
            {hasCamera && !hasMic && "No microphone detected"}
          </p>
          {isLocal && (
            <p className="text-yellow-400 text-xs mt-2">
              You are still connected. Enable devices to stream.
            </p>
          )}
        </div>
      </div>
    );
  };

  // Show video playback blocked UI
  const VideoPlaybackBlocked = ({ isLocal, name }: { isLocal: boolean; name: string }) => {
    if (!videoPlaybackBlocked || !isLocal) return null;
    
    return (
      <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">▶️</span>
          </div>
          <p className="text-white text-lg mb-2">{name}</p>
          <p className="text-gray-400 text-sm mb-4">
            Click anywhere to enable video playback
          </p>
          <div className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm">
            Browser requires user interaction to play video
          </div>
        </div>
      </div>
    );
  };

  if (status === "ended") {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
          <div className="mb-8">
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
    <div className="min-h-screen bg-gray-900 flex flex-col">
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
            <h1 className="text-xl font-bold text-white">
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
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={refreshCamera}
                    className="text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh Camera
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Device Status Banner */}
      {(!deviceStatus.camera || !deviceStatus.microphone) && (
        <div className="bg-yellow-600 text-white px-4 py-2 text-center text-sm">
          <div className="flex items-center justify-center gap-2">
            <span>⚠️</span>
            <span>
              {!deviceStatus.camera && !deviceStatus.microphone && "No camera/microphone detected — you are still connected (audio/video disabled)."}
              {!deviceStatus.camera && deviceStatus.microphone && "No camera detected — video disabled but audio enabled."}
              {deviceStatus.camera && !deviceStatus.microphone && "No microphone detected — audio disabled but video enabled."}
            </span>
          </div>
        </div>
      )}

      {/* Video Area */}
      <div 
        className="flex-1 relative cursor-pointer"
        onClick={() => {
          if (!userInteracted) {
            console.log('👆 Video area clicked - enabling video playback');
            setUserInteracted(true);
            setVideoPlaybackBlocked(false);
            
            // Try to play videos
            if (localVideoRef.current && localVideoRef.current.paused) {
              localVideoRef.current.play().catch(console.warn);
            }
            if (remoteVideoRef.current && remoteVideoRef.current.paused) {
              remoteVideoRef.current.play().catch(console.warn);
            }
          }
        }}
      >
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
              <DeviceFallback isLocal={true} name={me.name} />
              <VideoPlaybackBlocked isLocal={true} name={me.name} />
            </div>
          </div>
        ) : (
          /* Audio Call Interface */
          <div className="flex items-center justify-center h-[calc(100vh-200px)]">
            <div className="text-center">
              <div className="w-32 h-32 bg-gray-700 rounded-full flex items-center justify-center mb-8 mx-auto">
                <Avatar className="w-20 h-20">
                  <AvatarFallback className="text-2xl">{peerName[0]}</AvatarFallback>
                </Avatar>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{peerName}</h2>
              <p className="text-gray-400 mb-8">Audio Call</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 p-6 bg-gray-800 border-t border-gray-700">
        {status === "connecting" ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p className="text-white text-sm">Connecting...</p>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            {/* Mute/Unmute Button */}
            <Button
              onClick={toggleMute}
              variant={muted ? "destructive" : "outline"}
              className={`text-white px-4 py-3 rounded-full ${muted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'}`}
              title={muted ? "Unmute" : "Mute"}
            >
              {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              <span className="ml-2 text-sm font-medium">
                {muted ? "Unmute" : "Mute"}
              </span>
            </Button>
            
            {/* Camera On/Off Button (Video Mode Only) */}
            {mode === "video" && (
              <Button
                onClick={toggleCamera}
                variant={camOff ? "destructive" : "outline"}
                className={`text-white px-4 py-3 rounded-full ${camOff ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'}`}
                title={camOff ? "Turn Camera On" : "Turn Camera Off"}
              >
                {camOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                <span className="ml-2 text-sm font-medium">
                  {camOff ? "Camera On" : "Camera Off"}
                </span>
              </Button>
            )}
            
            {/* End Call Button */}
            <Button
              onClick={endCall}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full text-lg font-semibold"
              title="End Call"
            >
              <PhoneOff className="h-6 w-6 mr-2" />
              End Call
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}