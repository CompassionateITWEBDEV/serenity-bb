"use client";

/**
 * WebRTC SDP Fix Utilities
 * Fixes common SDP negotiation issues that cause InvalidAccessError and InvalidModificationError
 */

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  iceCandidatePoolSize?: number;
  bundlePolicy?: RTCBundlePolicy;
  rtcpMuxPolicy?: RTCRtcpMuxPolicy;
}

export interface SDPConstraints {
  offerToReceiveAudio: boolean;
  offerToReceiveVideo: boolean;
  voiceActivityDetection?: boolean;
}

/**
 * Creates a properly configured RTCPeerConnection with SDP fixes
 */
export function createFixedPeerConnection(config: WebRTCConfig): RTCPeerConnection {
  const pcConfig: RTCConfiguration = {
    iceServers: config.iceServers,
    iceCandidatePoolSize: config.iceCandidatePoolSize || 10,
    bundlePolicy: config.bundlePolicy || 'max-bundle',
    rtcpMuxPolicy: config.rtcpMuxPolicy || 'require',
    sdpSemantics: 'unified-plan' // Use unified plan for better compatibility
  };

  const pc = new RTCPeerConnection(pcConfig);
  
  // Add error handling for connection state changes
  pc.addEventListener('connectionstatechange', () => {
    console.log('WebRTC connection state:', pc.connectionState);
  });

  pc.addEventListener('iceconnectionstatechange', () => {
    console.log('WebRTC ICE connection state:', pc.iceConnectionState);
  });

  return pc;
}

/**
 * Creates a proper offer with SDP constraints
 */
export async function createFixedOffer(
  pc: RTCPeerConnection, 
  constraints: SDPConstraints
): Promise<RTCSessionDescriptionInit> {
  try {
    // Ensure we're in a stable state before creating offer
    if (pc.signalingState !== 'stable') {
      console.warn('PeerConnection not in stable state:', pc.signalingState);
      throw new Error(`Cannot create offer in ${pc.signalingState} state`);
    }

    const offer = await pc.createOffer({
      offerToReceiveAudio: constraints.offerToReceiveAudio,
      offerToReceiveVideo: constraints.offerToReceiveVideo,
      voiceActivityDetection: constraints.voiceActivityDetection ?? true
    });

    // Fix SDP to ensure proper m-line ordering
    const fixedSdp = fixSDPOrder(offer.sdp || '');
    
    return {
      type: offer.type,
      sdp: fixedSdp
    };
  } catch (error) {
    console.error('Error creating offer:', error);
    throw error;
  }
}

/**
 * Creates a proper answer with SDP constraints
 */
export async function createFixedAnswer(
  pc: RTCPeerConnection,
  constraints: SDPConstraints
): Promise<RTCSessionDescriptionInit> {
  try {
    // Ensure we're in have-remote-offer state
    if (pc.signalingState !== 'have-remote-offer') {
      console.warn('PeerConnection not in have-remote-offer state:', pc.signalingState);
      throw new Error(`Cannot create answer in ${pc.signalingState} state`);
    }

    const answer = await pc.createAnswer({
      offerToReceiveAudio: constraints.offerToReceiveAudio,
      offerToReceiveVideo: constraints.offerToReceiveVideo,
      voiceActivityDetection: constraints.voiceActivityDetection ?? true
    });

    // Fix SDP to ensure proper m-line ordering
    const fixedSdp = fixSDPOrder(answer.sdp || '');
    
    return {
      type: answer.type,
      sdp: fixedSdp
    };
  } catch (error) {
    console.error('Error creating answer:', error);
    throw error;
  }
}

/**
 * Safely sets local description with error handling
 */
export async function setLocalDescriptionSafely(
  pc: RTCPeerConnection,
  description: RTCSessionDescriptionInit
): Promise<void> {
  try {
    // Check if we're in the right state
    if (pc.signalingState === 'closed') {
      throw new Error('PeerConnection is closed');
    }

    // Validate SDP before setting
    const validatedSdp = validateAndFixSDP(description.sdp || '');
    const validatedDescription = {
      type: description.type,
      sdp: validatedSdp
    };

    await pc.setLocalDescription(validatedDescription);
    console.log('Successfully set local description:', description.type);
  } catch (error) {
    console.error('Error setting local description:', error);
    throw error;
  }
}

/**
 * Safely sets remote description with error handling
 */
export async function setRemoteDescriptionSafely(
  pc: RTCPeerConnection,
  description: RTCSessionDescriptionInit
): Promise<void> {
  try {
    // Check if we're in the right state
    if (pc.signalingState === 'closed') {
      throw new Error('PeerConnection is closed');
    }

    // Validate SDP before setting
    const validatedSdp = validateAndFixSDP(description.sdp || '');
    const validatedDescription = {
      type: description.type,
      sdp: validatedSdp
    };

    await pc.setRemoteDescription(validatedDescription);
    console.log('Successfully set remote description:', description.type);
  } catch (error) {
    console.error('Error setting remote description:', error);
    throw error;
  }
}

/**
 * Fixes SDP m-line ordering to prevent InvalidAccessError
 */
function fixSDPOrder(sdp: string): string {
  if (!sdp) return sdp;

  const lines = sdp.split('\n');
  const sessionLines: string[] = [];
  const mediaLines: string[] = [];
  const otherLines: string[] = [];

  // Separate different types of lines
  for (const line of lines) {
    if (line.startsWith('m=')) {
      mediaLines.push(line);
    } else if (line.startsWith('v=') || line.startsWith('o=') || 
               line.startsWith('s=') || line.startsWith('t=') || 
               line.startsWith('c=') || line.startsWith('a=group:')) {
      sessionLines.push(line);
    } else {
      otherLines.push(line);
    }
  }

  // Ensure audio comes before video in m-lines
  const audioLines = mediaLines.filter(line => line.startsWith('m=audio'));
  const videoLines = mediaLines.filter(line => line.startsWith('m=video'));
  const otherMediaLines = mediaLines.filter(line => 
    !line.startsWith('m=audio') && !line.startsWith('m=video')
  );

  // Reconstruct SDP with proper ordering
  const orderedMediaLines = [...audioLines, ...videoLines, ...otherMediaLines];
  
  return [...sessionLines, ...orderedMediaLines, ...otherLines].join('\n');
}

/**
 * Validates and fixes SDP to prevent InvalidModificationError
 */
function validateAndFixSDP(sdp: string): string {
  if (!sdp) return sdp;

  let fixedSdp = sdp;

  // Fix common SDP issues
  fixedSdp = fixSDPOrder(fixedSdp);
  
  // Ensure proper line endings
  fixedSdp = fixedSdp.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Remove duplicate m-lines (keep first occurrence)
  const lines = fixedSdp.split('\n');
  const seenMLines = new Set<string>();
  const filteredLines = lines.filter(line => {
    if (line.startsWith('m=')) {
      const mediaType = line.split(' ')[0];
      if (seenMLines.has(mediaType)) {
        return false; // Skip duplicate
      }
      seenMLines.add(mediaType);
    }
    return true;
  });

  return filteredLines.join('\n');
}

/**
 * Handles ICE candidates safely
 */
export async function addIceCandidateSafely(
  pc: RTCPeerConnection,
  candidate: RTCIceCandidateInit
): Promise<void> {
  try {
    if (pc.remoteDescription && pc.signalingState !== 'closed') {
      await pc.addIceCandidate(candidate);
      console.log('Successfully added ICE candidate');
    } else {
      console.warn('Cannot add ICE candidate - no remote description or connection closed');
    }
  } catch (error) {
    console.error('Error adding ICE candidate:', error);
    // Don't throw - ICE candidate errors are often non-fatal
  }
}

/**
 * Resets peer connection to stable state
 */
export function resetPeerConnection(pc: RTCPeerConnection): void {
  try {
    if (pc.signalingState === 'have-local-offer') {
      // Rollback to stable state
      pc.setLocalDescription({ type: 'rollback' });
    } else if (pc.signalingState === 'have-remote-offer') {
      // Rollback to stable state
      pc.setRemoteDescription({ type: 'rollback' });
    }
  } catch (error) {
    console.error('Error resetting peer connection:', error);
  }
}

/**
 * Creates a new peer connection with proper cleanup
 */
export function createNewPeerConnection(config: WebRTCConfig): RTCPeerConnection {
  // Close existing connection if any
  if (typeof window !== 'undefined' && (window as any).currentPC) {
    (window as any).currentPC.close();
  }

  const pc = createFixedPeerConnection(config);
  
  // Store reference for cleanup
  if (typeof window !== 'undefined') {
    (window as any).currentPC = pc;
  }

  return pc;
}

/**
 * Comprehensive WebRTC call handler with SDP fixes
 */
export class FixedWebRTCHandler {
  private pc: RTCPeerConnection | null = null;
  private config: WebRTCConfig;

  constructor(config: WebRTCConfig) {
    this.config = config;
  }

  async createOffer(constraints: SDPConstraints): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) {
      this.pc = createFixedPeerConnection(this.config);
    }

    return createFixedOffer(this.pc, constraints);
  }

  async createAnswer(constraints: SDPConstraints): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) {
      throw new Error('No peer connection available');
    }

    return createFixedAnswer(this.pc, constraints);
  }

  async setLocalDescription(description: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) {
      throw new Error('No peer connection available');
    }

    return setLocalDescriptionSafely(this.pc, description);
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) {
      throw new Error('No peer connection available');
    }

    return setRemoteDescriptionSafely(this.pc, description);
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc) {
      throw new Error('No peer connection available');
    }

    return addIceCandidateSafely(this.pc, candidate);
  }

  getPeerConnection(): RTCPeerConnection | null {
    return this.pc;
  }

  close(): void {
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
  }
}
