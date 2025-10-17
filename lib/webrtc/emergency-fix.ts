"use client";

import { validateAndFixSDP, createMinimalSDP } from './sdp-validator';

/**
 * Emergency Fix for InvalidModificationError and OperationError
 * This is a comprehensive fix that handles SDP parsing errors
 */

/**
 * Fixes SDP using advanced validation
 */
function fixSDP(sdp: string): string {
  if (!sdp) return sdp;

  console.log('🔧 Validating and fixing SDP...');
  const validation = validateAndFixSDP(sdp);
  
  if (validation.errors.length > 0) {
    console.warn('⚠️ SDP validation errors:', validation.errors);
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️ SDP validation warnings:', validation.warnings);
  }
  
  if (!validation.isValid) {
    console.error('❌ SDP validation failed, using minimal fallback');
    return createMinimalSDP('offer', sdp.includes('m=video'));
  }
  
  console.log('✅ SDP validation passed');
  return validation.fixedSDP;
}

/**
 * Safe setLocalDescription that fixes SDP
 */
export async function safeSetLocalDescription(
  pc: RTCPeerConnection,
  description: RTCSessionDescriptionInit
): Promise<void> {
  try {
    console.log('🔧 Setting local description with fixed SDP');
    console.log('📊 Original SDP length:', description.sdp?.length || 0);
    console.log('📊 Description type:', description.type);
    
    // Fix SDP before setting
    const fixedSdp = fixSDP(description.sdp || '');
    console.log('📊 Fixed SDP length:', fixedSdp.length);
    
    // Validate SDP structure
    if (!fixedSdp.includes('m=')) {
      throw new Error('SDP has no media lines after fixing');
    }
    
    const fixedDescription = {
      type: description.type,
      sdp: fixedSdp
    };

    // Check peer connection state
    console.log('📊 Peer connection state:', pc.signalingState);
    
    // Validate peer connection state
    if (pc.signalingState === 'closed') {
      throw new Error('PeerConnection is closed, cannot set local description');
    }
    
    if (pc.signalingState === 'have-local-offer' && description.type === 'offer') {
      console.warn('⚠️ Already have local offer, rolling back first');
      try {
        await pc.setLocalDescription({ type: 'rollback' });
        console.log('✅ Rolled back to stable state');
      } catch (rollbackError) {
        console.warn('⚠️ Rollback failed:', rollbackError);
      }
    }
    
    await pc.setLocalDescription(fixedDescription);
    console.log('✅ Successfully set local description');
  } catch (error) {
    console.error('❌ Error setting local description:', error);
    console.error('📊 Peer connection state:', pc.signalingState);
    console.error('📊 Description type:', description.type);
    console.error('📊 SDP length:', description.sdp?.length || 0);
    
    // Safe SDP logging - only log first 200 chars to prevent stack overflow
    try {
      const sdpPreview = description.sdp?.substring(0, 200) || 'No SDP';
      console.error('📊 SDP preview:', sdpPreview);
    } catch (logError) {
      console.error('📊 SDP preview: [Error logging SDP]');
    }
    
    try {
      const fixedSdpPreview = fixedSdp?.substring(0, 200) || 'No Fixed SDP';
      console.error('📊 Fixed SDP preview:', fixedSdpPreview);
    } catch (logError) {
      console.error('📊 Fixed SDP preview: [Error logging Fixed SDP]');
    }
    
    throw error;
  }
}

/**
 * Safe setRemoteDescription that fixes SDP
 */
export async function safeSetRemoteDescription(
  pc: RTCPeerConnection,
  description: RTCSessionDescriptionInit
): Promise<void> {
  try {
    // Fix SDP before setting
    const fixedSdp = fixSDP(description.sdp || '');
    const fixedDescription = {
      type: description.type,
      sdp: fixedSdp
    };

    console.log('🔧 Setting remote description with fixed SDP');
    await pc.setRemoteDescription(fixedDescription);
    console.log('✅ Successfully set remote description');
  } catch (error) {
    console.error('❌ Error setting remote description:', error);
    throw error;
  }
}

/**
 * Safe createOffer that fixes SDP
 */
export async function safeCreateOffer(
  pc: RTCPeerConnection,
  options: RTCOfferOptions
): Promise<RTCSessionDescriptionInit> {
  try {
    console.log('🔧 Creating offer with options:', options);
    const offer = await pc.createOffer(options);
    console.log('📊 Original offer SDP length:', offer.sdp?.length || 0);
    
    const fixedSdp = fixSDP(offer.sdp || '');
    console.log('📊 Fixed offer SDP length:', fixedSdp.length);
    
    // Validate the fixed SDP
    if (!fixedSdp.includes('m=')) {
      console.error('❌ Fixed SDP has no media lines, creating fallback');
      throw new Error('SDP has no media lines after fixing');
    }
    
    return {
      type: offer.type,
      sdp: fixedSdp
    };
  } catch (error) {
    console.error('❌ Error creating offer:', error);
    console.error('📊 Peer connection state:', pc.signalingState);
    console.error('📊 Options:', options);
    throw error;
  }
}

/**
 * Safe createAnswer that fixes SDP
 */
export async function safeCreateAnswer(
  pc: RTCPeerConnection,
  options?: RTCAnswerOptions
): Promise<RTCSessionDescriptionInit> {
  try {
    const answer = await pc.createAnswer(options);
    const fixedSdp = fixSDP(answer.sdp || '');
    
    return {
      type: answer.type,
      sdp: fixedSdp
    };
  } catch (error) {
    console.error('Error creating answer:', error);
    throw error;
  }
}
