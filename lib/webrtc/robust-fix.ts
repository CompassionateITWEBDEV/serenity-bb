"use client";

/**
 * Robust WebRTC Fix
 * Handles specific SDP parsing errors and peer connection state issues
 */

import { validateAndFixSDP, createMinimalSDP } from './sdp-validator';

/**
 * Ultra-safe setLocalDescription with comprehensive error handling
 */
export async function ultraSafeSetLocalDescription(
  pc: RTCPeerConnection,
  description: RTCSessionDescriptionInit
): Promise<void> {
  try {
    console.log('🔧 Ultra-safe setLocalDescription starting...');
    console.log('📊 Peer connection state:', pc.signalingState);
    console.log('📊 Description type:', description.type);
    console.log('📊 SDP length:', description.sdp?.length || 0);

    // 1. Validate peer connection state
    if (pc.signalingState === 'closed') {
      throw new Error('PeerConnection is closed');
    }

    // 2. Handle rollback if needed
    if (pc.signalingState === 'have-local-offer' && description.type === 'offer') {
      console.warn('⚠️ Already have local offer, rolling back...');
      try {
        await pc.setLocalDescription({ type: 'rollback' });
        console.log('✅ Rolled back to stable state');
      } catch (rollbackError) {
        console.warn('⚠️ Rollback failed, continuing anyway:', rollbackError);
      }
    }

    // 3. Validate and fix SDP
    let fixedSDP = description.sdp || '';
    
    if (fixedSDP) {
      console.log('🔧 Validating SDP...');
      const validation = validateAndFixSDP(fixedSDP);
      
      if (validation.errors.length > 0) {
        console.warn('⚠️ SDP validation errors:', validation.errors);
      }
      
      if (validation.warnings.length > 0) {
        console.warn('⚠️ SDP validation warnings:', validation.warnings);
      }
      
      if (!validation.isValid) {
        console.error('❌ SDP validation failed, using minimal fallback');
        fixedSDP = createMinimalSDP(description.type as 'offer' | 'answer', fixedSDP.includes('m=video'));
      } else {
        fixedSDP = validation.fixedSDP;
        console.log('✅ SDP validation passed');
      }
    } else {
      console.error('❌ No SDP provided, using minimal fallback');
      fixedSDP = createMinimalSDP(description.type as 'offer' | 'answer', false);
    }

    // 4. Create fixed description
    const fixedDescription = {
      type: description.type,
      sdp: fixedSDP
    };

    console.log('📊 Fixed SDP length:', fixedSDP.length);
    console.log('📊 Fixed SDP preview:', fixedSDP.substring(0, 200));

    // 5. Set local description with retry logic
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        console.log(`🔧 Attempting setLocalDescription (attempt ${retryCount + 1}/${maxRetries})`);
        await pc.setLocalDescription(fixedDescription);
        console.log('✅ Successfully set local description');
        return; // Success!
      } catch (error) {
        retryCount++;
        console.error(`❌ Attempt ${retryCount} failed:`, error);
        
        if (retryCount >= maxRetries) {
          throw error; // Give up after max retries
        }

        // Try to recover
        if (pc.signalingState === 'have-local-offer') {
          console.log('🔧 Attempting rollback before retry...');
          try {
            await pc.setLocalDescription({ type: 'rollback' });
            console.log('✅ Rollback successful, retrying...');
          } catch (rollbackError) {
            console.warn('⚠️ Rollback failed:', rollbackError);
          }
        }

        // Wait a bit before retry
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  } catch (error) {
    console.error('❌ Ultra-safe setLocalDescription failed:', error);
    console.error('📊 Final peer connection state:', pc.signalingState);
    console.error('📊 Description type:', description.type);
    
    // Safe SDP length logging
    try {
      const sdpLength = description.sdp?.length || 0;
      console.error('📊 SDP length:', sdpLength);
    } catch (logError) {
      console.error('📊 SDP length: [Error logging SDP length]');
    }
    
    // Safe SDP logging - only log first 200 chars to prevent stack overflow
    try {
      const sdpPreview = description.sdp?.substring(0, 200) || 'No SDP';
      console.error('📊 SDP preview:', sdpPreview);
    } catch (logError) {
      console.error('📊 SDP preview: [Error logging SDP]');
    }
    
    throw error;
  }
}

/**
 * Ultra-safe setRemoteDescription with comprehensive error handling
 */
export async function ultraSafeSetRemoteDescription(
  pc: RTCPeerConnection,
  description: RTCSessionDescriptionInit
): Promise<void> {
  try {
    console.log('🔧 Ultra-safe setRemoteDescription starting...');
    console.log('📊 Peer connection state:', pc.signalingState);
    console.log('📊 Description type:', description.type);
    console.log('📊 SDP length:', description.sdp?.length || 0);

    // 1. Validate peer connection state
    if (pc.signalingState === 'closed') {
      throw new Error('PeerConnection is closed');
    }

    // 2. Validate and fix SDP
    let fixedSDP = description.sdp || '';
    
    if (fixedSDP) {
      console.log('🔧 Validating remote SDP...');
      const validation = validateAndFixSDP(fixedSDP);
      
      if (validation.errors.length > 0) {
        console.warn('⚠️ Remote SDP validation errors:', validation.errors);
      }
      
      if (validation.warnings.length > 0) {
        console.warn('⚠️ Remote SDP validation warnings:', validation.warnings);
      }
      
      if (!validation.isValid) {
        console.error('❌ Remote SDP validation failed, using minimal fallback');
        fixedSDP = createMinimalSDP(description.type as 'offer' | 'answer', fixedSDP.includes('m=video'));
      } else {
        fixedSDP = validation.fixedSDP;
        console.log('✅ Remote SDP validation passed');
      }
    } else {
      console.error('❌ No remote SDP provided, using minimal fallback');
      fixedSDP = createMinimalSDP(description.type as 'offer' | 'answer', false);
    }

    // 3. Create fixed description
    const fixedDescription = {
      type: description.type,
      sdp: fixedSDP
    };

    console.log('📊 Fixed remote SDP length:', fixedSDP.length);
    console.log('📊 Fixed remote SDP preview:', fixedSDP.substring(0, 200));

    // 4. Set remote description with retry logic
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        console.log(`🔧 Attempting setRemoteDescription (attempt ${retryCount + 1}/${maxRetries})`);
        await pc.setRemoteDescription(fixedDescription);
        console.log('✅ Successfully set remote description');
        return; // Success!
      } catch (error) {
        retryCount++;
        console.error(`❌ Attempt ${retryCount} failed:`, error);
        
        if (retryCount >= maxRetries) {
          throw error; // Give up after max retries
        }

        // Wait a bit before retry
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  } catch (error) {
    console.error('❌ Ultra-safe setRemoteDescription failed:', error);
    console.error('📊 Final peer connection state:', pc.signalingState);
    console.error('📊 Description type:', description.type);
    
    // Safe SDP length logging
    try {
      const sdpLength = description.sdp?.length || 0;
      console.error('📊 SDP length:', sdpLength);
    } catch (logError) {
      console.error('📊 SDP length: [Error logging SDP length]');
    }
    
    // Safe SDP logging - only log first 200 chars to prevent stack overflow
    try {
      const sdpPreview = description.sdp?.substring(0, 200) || 'No SDP';
      console.error('📊 SDP preview:', sdpPreview);
    } catch (logError) {
      console.error('📊 SDP preview: [Error logging SDP]');
    }
    
    throw error;
  }
}

/**
 * Ultra-safe createOffer with comprehensive error handling
 */
export async function ultraSafeCreateOffer(
  pc: RTCPeerConnection,
  options: RTCOfferOptions
): Promise<RTCSessionDescriptionInit> {
  try {
    console.log('🔧 Ultra-safe createOffer starting...');
    console.log('📊 Peer connection state:', pc.signalingState);
    console.log('📊 Options:', options);

    // 1. Validate peer connection state
    if (pc.signalingState === 'closed') {
      throw new Error('PeerConnection is closed');
    }

    if (pc.signalingState !== 'stable') {
      console.warn('⚠️ Peer connection not in stable state:', pc.signalingState);
      // Try to rollback to stable state
      try {
        await pc.setLocalDescription({ type: 'rollback' });
        console.log('✅ Rolled back to stable state');
      } catch (rollbackError) {
        console.warn('⚠️ Rollback failed:', rollbackError);
      }
    }

    // 2. Create offer
    const offer = await pc.createOffer(options);
    console.log('📊 Original offer SDP length:', offer.sdp?.length || 0);

    // 3. Validate and fix SDP
    let fixedSDP = offer.sdp || '';
    
    if (fixedSDP) {
      console.log('🔧 Validating offer SDP...');
      const validation = validateAndFixSDP(fixedSDP);
      
      if (validation.errors.length > 0) {
        console.warn('⚠️ Offer SDP validation errors:', validation.errors);
      }
      
      if (validation.warnings.length > 0) {
        console.warn('⚠️ Offer SDP validation warnings:', validation.warnings);
      }
      
      if (!validation.isValid) {
        console.error('❌ Offer SDP validation failed, using minimal fallback');
        fixedSDP = createMinimalSDP('offer', options.offerToReceiveVideo || false);
      } else {
        fixedSDP = validation.fixedSDP;
        console.log('✅ Offer SDP validation passed');
      }
    } else {
      console.error('❌ No offer SDP generated, using minimal fallback');
      fixedSDP = createMinimalSDP('offer', options.offerToReceiveVideo || false);
    }

    console.log('📊 Fixed offer SDP length:', fixedSDP.length);
    console.log('📊 Fixed offer SDP preview:', fixedSDP.substring(0, 200));

    return {
      type: offer.type,
      sdp: fixedSDP
    };
  } catch (error) {
    console.error('❌ Ultra-safe createOffer failed:', error);
    console.error('📊 Final peer connection state:', pc.signalingState);
    console.error('📊 Options:', options);
    
    // Safe SDP length logging
    try {
      const sdpLength = fixedSDP?.length || 0;
      console.error('📊 SDP length:', sdpLength);
    } catch (logError) {
      console.error('📊 SDP length: [Error logging SDP length]');
    }
    
    // Safe SDP logging - only log first 200 chars to prevent stack overflow
    try {
      const sdpPreview = fixedSDP?.substring(0, 200) || 'No SDP';
      console.error('📊 SDP preview:', sdpPreview);
    } catch (logError) {
      console.error('📊 SDP preview: [Error logging SDP]');
    }
    
    throw error;
  }
}

/**
 * Ultra-safe createAnswer with comprehensive error handling
 */
export async function ultraSafeCreateAnswer(
  pc: RTCPeerConnection,
  options?: RTCAnswerOptions
): Promise<RTCSessionDescriptionInit> {
  try {
    console.log('🔧 Ultra-safe createAnswer starting...');
    console.log('📊 Peer connection state:', pc.signalingState);
    console.log('📊 Options:', options);

    // 1. Validate peer connection state
    if (pc.signalingState === 'closed') {
      throw new Error('PeerConnection is closed');
    }

    if (pc.signalingState !== 'have-remote-offer') {
      console.warn('⚠️ Peer connection not in have-remote-offer state:', pc.signalingState);
    }

    // 2. Create answer
    const answer = await pc.createAnswer(options);
    console.log('📊 Original answer SDP length:', answer.sdp?.length || 0);

    // 3. Validate and fix SDP
    let fixedSDP = answer.sdp || '';
    
    if (fixedSDP) {
      console.log('🔧 Validating answer SDP...');
      const validation = validateAndFixSDP(fixedSDP);
      
      if (validation.errors.length > 0) {
        console.warn('⚠️ Answer SDP validation errors:', validation.errors);
      }
      
      if (validation.warnings.length > 0) {
        console.warn('⚠️ Answer SDP validation warnings:', validation.warnings);
      }
      
      if (!validation.isValid) {
        console.error('❌ Answer SDP validation failed, using minimal fallback');
        fixedSDP = createMinimalSDP('answer', false);
      } else {
        fixedSDP = validation.fixedSDP;
        console.log('✅ Answer SDP validation passed');
      }
    } else {
      console.error('❌ No answer SDP generated, using minimal fallback');
      fixedSDP = createMinimalSDP('answer', false);
    }

    console.log('📊 Fixed answer SDP length:', fixedSDP.length);
    console.log('📊 Fixed answer SDP preview:', fixedSDP.substring(0, 200));

    return {
      type: answer.type,
      sdp: fixedSDP
    };
  } catch (error) {
    console.error('❌ Ultra-safe createAnswer failed:', error);
    console.error('📊 Final peer connection state:', pc.signalingState);
    console.error('📊 Options:', options);
    
    // Safe SDP length logging
    try {
      const sdpLength = fixedSDP?.length || 0;
      console.error('📊 SDP length:', sdpLength);
    } catch (logError) {
      console.error('📊 SDP length: [Error logging SDP length]');
    }
    
    // Safe SDP logging - only log first 200 chars to prevent stack overflow
    try {
      const sdpPreview = fixedSDP?.substring(0, 200) || 'No SDP';
      console.error('📊 SDP preview:', sdpPreview);
    } catch (logError) {
      console.error('📊 SDP preview: [Error logging SDP]');
    }
    
    throw error;
  }
}
