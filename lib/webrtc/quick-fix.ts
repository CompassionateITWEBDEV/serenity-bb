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

  // Override createOffer - handle both overloads
  pc.createOffer = function(
    optionsOrSuccessCallback?: RTCOfferOptions | RTCSessionDescriptionCallback,
    failureCallback?: RTCPeerConnectionErrorCallback,
    options2?: RTCOfferOptions
  ): Promise<RTCSessionDescriptionInit> {
    // Support both Promise-based and legacy callback-based usage
    // Legacy: createOffer(successCallback, failureCallback, options)
    if (typeof optionsOrSuccessCallback === 'function') {
      // legacy callback style - return a promise that resolves to void
      const successCallback = optionsOrSuccessCallback as RTCSessionDescriptionCallback;
      const opts = options2 as RTCOfferOptions | undefined;
      return new Promise<RTCSessionDescriptionInit>((resolve, reject) => {
        (async () => {
          try {
            const offer = await createFixedOffer(pc, opts || {});
            successCallback(offer);
            resolve(offer);
          } catch (error) {
            if (failureCallback) failureCallback(error as DOMException);
            reject(error);
          }
        })();
      });
    } else {
      // promise style
      const opts = optionsOrSuccessCallback as RTCOfferOptions | undefined;
      return (async () => {
        try {
          return await createFixedOffer(pc, opts || {});
        } catch (error) {
          console.error('Fixed createOffer failed, trying original:', error);
          return await originalCreateOffer(opts);
        }
      })();
    }
  } as any;

  // Override createAnswer - handle both overloads
  pc.createAnswer = function(
    optionsOrSuccessCallback?: RTCAnswerOptions | RTCSessionDescriptionCallback,
    failureCallback?: RTCPeerConnectionErrorCallback
  ): Promise<RTCSessionDescriptionInit> {
    // Support both Promise-based and legacy callback-based usage
    if (typeof optionsOrSuccessCallback === 'function') {
      // legacy callback style
      const successCallback = optionsOrSuccessCallback as RTCSessionDescriptionCallback;
      return new Promise<RTCSessionDescriptionInit>((resolve, reject) => {
        (async () => {
          try {
            const answer = await createFixedAnswer(pc, undefined);
            successCallback(answer);
            resolve(answer);
          } catch (error) {
            if (failureCallback) failureCallback(error as DOMException);
            reject(error);
          }
        })();
      });
    } else {
      // promise style
      const opts = optionsOrSuccessCallback as RTCAnswerOptions | undefined;
      return (async () => {
        try {
          return await createFixedAnswer(pc, opts);
        } catch (error) {
          console.error('Fixed createAnswer failed, trying original:', error);
          return await originalCreateAnswer(opts);
        }
      })();
    }
  } as any;

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

