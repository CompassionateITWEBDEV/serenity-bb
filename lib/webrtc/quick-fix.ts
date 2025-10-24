"use client";

/**
 * Quick Fix for InvalidModificationError
 * Drop-in replacement for setLocalDescription and createOffer
 */

import { fixSDPForWebRTC, setLocalDescriptionFixed, createFixedOffer, createFixedAnswer, setRemoteDescriptionFixed } from './sdp-fix';

/**
 * Patches RTCPeerConnection to use fixed SDP handling
 */
export function patchRTCPeerConnection(pc: RTCPeerConnection): RTCPeerConnection {
  // Store original methods
  const originalSetLocalDescription = pc.setLocalDescription.bind(pc);
  const originalSetRemoteDescription = pc.setRemoteDescription.bind(pc);
  const originalCreateOffer = pc.createOffer.bind(pc);
  const originalCreateAnswer = pc.createAnswer.bind(pc);

  // Override setLocalDescription
  pc.setLocalDescription = async function(description: RTCSessionDescriptionInit) {
    try {
      return await setLocalDescriptionFixed(pc, description);
    } catch (error) {
      console.error('Fixed setLocalDescription failed, trying original:', error);
      return await originalSetLocalDescription(description);
    }
  };

  // Override setRemoteDescription
  pc.setRemoteDescription = async function(description: RTCSessionDescriptionInit) {
    try {
      return await setRemoteDescriptionFixed(pc, description);
    } catch (error) {
      console.error('Fixed setRemoteDescription failed, trying original:', error);
      return await originalSetRemoteDescription(description);
    }
  };

  // Override createOffer
  pc.createOffer = async function(options?: RTCOfferOptions) {
    try {
      return await createFixedOffer(pc, options || {});
    } catch (error) {
      console.error('Fixed createOffer failed, trying original:', error);
      return await originalCreateOffer(options);
    }
  };

  // Override createAnswer
  pc.createAnswer = async function(options?: RTCAnswerOptions) {
    try {
      return await createFixedAnswer(pc, options);
    } catch (error) {
      console.error('Fixed createAnswer failed, trying original:', error);
      return await originalCreateAnswer(options);
    }
  };

  return pc;
}

/**
 * Quick fix for existing code - just call this after creating RTCPeerConnection
 */
export function applyWebRTCFix(pc: RTCPeerConnection): RTCPeerConnection {
  console.log('🔧 Applying WebRTC SDP fix...');
  return patchRTCPeerConnection(pc);
}

/**
 * Global fix - patches all new RTCPeerConnection instances
 */
export function enableGlobalWebRTCFix(): void {
  if (typeof window === 'undefined') return;

  const originalRTCPeerConnection = window.RTCPeerConnection;
  
  window.RTCPeerConnection = function(config?: RTCConfiguration) {
    const pc = new originalRTCPeerConnection(config);
    return patchRTCPeerConnection(pc);
  } as any;

  // Copy static properties
  Object.setPrototypeOf(window.RTCPeerConnection, originalRTCPeerConnection);
  Object.getOwnPropertyNames(originalRTCPeerConnection).forEach(name => {
    if (name !== 'length' && name !== 'name' && name !== 'prototype') {
      (window.RTCPeerConnection as any)[name] = (originalRTCPeerConnection as any)[name];
    }
  });

  console.log('🔧 Global WebRTC SDP fix enabled');
}
