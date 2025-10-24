"use client";

/**
 * SDP Fix for InvalidModificationError
 * This utility fixes the specific SDP modification error you're experiencing
 */

/**
 * Fixes SDP to prevent InvalidModificationError
 * The error occurs when SDP is modified in ways that violate WebRTC standards
 */
export function fixSDPForWebRTC(sdp: string): string {
  if (!sdp) return sdp;

  let fixedSdp = sdp;

  // 1. Ensure proper line endings
  fixedSdp = fixedSdp.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 2. Remove any null bytes or invalid characters
  fixedSdp = fixedSdp.replace(/\0/g, '');

  // 3. Ensure SDP starts with proper version
  if (!fixedSdp.startsWith('v=0')) {
    fixedSdp = 'v=0\n' + fixedSdp;
  }

  // 4. Fix m-line ordering (audio before video)
  const lines = fixedSdp.split('\n');
  const sessionLines: string[] = [];
  const audioLines: string[] = [];
  const videoLines: string[] = [];
  const otherLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('m=audio')) {
      audioLines.push(line);
    } else if (line.startsWith('m=video')) {
      videoLines.push(line);
    } else if (line.startsWith('v=') || line.startsWith('o=') || 
               line.startsWith('s=') || line.startsWith('t=') || 
               line.startsWith('c=') || line.startsWith('a=group:')) {
      sessionLines.push(line);
    } else {
      otherLines.push(line);
    }
  }

  // 5. Reconstruct SDP with proper ordering
  const orderedLines = [
    ...sessionLines,
    ...audioLines,
    ...videoLines,
    ...otherLines
  ];

  fixedSdp = orderedLines.join('\n');

  // 6. Ensure proper SDP structure
  const sdpLines = fixedSdp.split('\n');
  const hasVersion = sdpLines.some(line => line.startsWith('v='));
  const hasOrigin = sdpLines.some(line => line.startsWith('o='));
  const hasSession = sdpLines.some(line => line.startsWith('s='));
  const hasTime = sdpLines.some(line => line.startsWith('t='));

  if (!hasVersion) {
    sdpLines.unshift('v=0');
  }
  if (!hasOrigin) {
    sdpLines.splice(1, 0, 'o=- 0 0 IN IP4 127.0.0.1');
  }
  if (!hasSession) {
    sdpLines.splice(2, 0, 's=-');
  }
  if (!hasTime) {
    sdpLines.splice(3, 0, 't=0 0');
  }

  // 7. Remove duplicate m-lines (keep first occurrence)
  const seenMLines = new Set<string>();
  const filteredLines = sdpLines.filter(line => {
    if (line.startsWith('m=')) {
      const mediaType = line.split(' ')[0];
      if (seenMLines.has(mediaType)) {
        return false; // Skip duplicate
      }
      seenMLines.add(mediaType);
    }
    return true;
  });

  // 8. Ensure proper SDP ending
  if (!filteredLines[filteredLines.length - 1]) {
    filteredLines.push('');
  }

  return filteredLines.join('\n');
}

/**
 * Safely sets local description with SDP fixing
 */
export async function setLocalDescriptionFixed(
  pc: RTCPeerConnection,
  description: RTCSessionDescriptionInit
): Promise<void> {
  try {
    // Check if we're in the right state
    if (pc.signalingState === 'closed') {
      throw new Error('PeerConnection is closed');
    }

    // Fix SDP before setting
    const fixedSdp = fixSDPForWebRTC(description.sdp || '');
    const fixedDescription = {
      type: description.type,
      sdp: fixedSdp
    };

    console.log('Setting local description with fixed SDP:', description.type);
    await pc.setLocalDescription(fixedDescription);
    console.log('✅ Successfully set local description');
  } catch (error) {
    console.error('❌ Error setting local description:', error);
    throw error;
  }
}

/**
 * Safely sets remote description with SDP fixing
 */
export async function setRemoteDescriptionFixed(
  pc: RTCPeerConnection,
  description: RTCSessionDescriptionInit
): Promise<void> {
  try {
    // Check if we're in the right state
    if (pc.signalingState === 'closed') {
      throw new Error('PeerConnection is closed');
    }

    // Fix SDP before setting
    const fixedSdp = fixSDPForWebRTC(description.sdp || '');
    const fixedDescription = {
      type: description.type,
      sdp: fixedSdp
    };

    console.log('Setting remote description with fixed SDP:', description.type);
    await pc.setRemoteDescription(fixedDescription);
    console.log('✅ Successfully set remote description');
  } catch (error) {
    console.error('❌ Error setting remote description:', error);
    throw error;
  }
}

/**
 * Creates a fixed offer with proper SDP
 */
export async function createFixedOffer(
  pc: RTCPeerConnection,
  options: RTCOfferOptions
): Promise<RTCSessionDescriptionInit> {
  try {
    if (pc.signalingState !== 'stable') {
      throw new Error(`Cannot create offer in ${pc.signalingState} state`);
    }

    const offer = await pc.createOffer(options);
    const fixedSdp = fixSDPForWebRTC(offer.sdp || '');
    
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
 * Creates a fixed answer with proper SDP
 */
export async function createFixedAnswer(
  pc: RTCPeerConnection,
  options?: RTCAnswerOptions
): Promise<RTCSessionDescriptionInit> {
  try {
    if (pc.signalingState !== 'have-remote-offer') {
      throw new Error(`Cannot create answer in ${pc.signalingState} state`);
    }

    const answer = await pc.createAnswer(options);
    const fixedSdp = fixSDPForWebRTC(answer.sdp || '');
    
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
 * Resets peer connection to stable state if needed
 */
export function resetToStableState(pc: RTCPeerConnection): void {
  try {
    if (pc.signalingState === 'have-local-offer') {
      console.log('Rolling back to stable state...');
      pc.setLocalDescription({ type: 'rollback' });
    } else if (pc.signalingState === 'have-remote-offer') {
      console.log('Rolling back to stable state...');
      pc.setRemoteDescription({ type: 'rollback' });
    }
  } catch (error) {
    console.error('Error resetting to stable state:', error);
  }
}

/**
 * Comprehensive WebRTC call with SDP fixes
 */
export class WebRTCCallWithSDPFix {
  private pc: RTCPeerConnection;

  constructor(pc: RTCPeerConnection) {
    this.pc = pc;
  }

  async createOffer(options: RTCOfferOptions): Promise<RTCSessionDescriptionInit> {
    return createFixedOffer(this.pc, options);
  }

  async createAnswer(options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit> {
    return createFixedAnswer(this.pc, options);
  }

  async setLocalDescription(description: RTCSessionDescriptionInit): Promise<void> {
    return setLocalDescriptionFixed(this.pc, description);
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    return setRemoteDescriptionFixed(this.pc, description);
  }

  resetToStable(): void {
    resetToStableState(this.pc);
  }
}
