import { supabase } from "@/lib/supabase/client";

/* ============================================================================
 * WebRTC Signaling via Supabase Realtime
 * ============================================================================
 * Per-user broadcast channels for peer-to-peer call signaling.
 * Each user subscribes to their own channel: `webrtc_user_{userId}`
 * 
 * Events:
 *   - ring        → Notify incoming call
 *   - hangup      → End/decline call
 *   - webrtc-offer   → WebRTC SDP offer
 *   - webrtc-answer  → WebRTC SDP answer
 *   - webrtc-ice     → ICE candidate exchange
 * ========================================================================== */

/* ----------------------------- Types ------------------------------------- */

export type CallMode = "audio" | "video";

export type RingPayload = {
  conversationId: string;
  fromId: string;
  fromName?: string;
  mode: CallMode;
};

export type HangupPayload = {
  conversationId?: string;
};

export type SDPPayload = {
  conversationId: string;
  fromId: string;
  sdp: RTCSessionDescriptionInit;
};

export type ICEPayload = {
  conversationId: string;
  fromId: string;
  candidate: RTCIceCandidateInit;
};

/* ----------------------------- Channel Factory --------------------------- */

/**
 * Create or reference a user's signaling channel.
 * Subscribe to this channel to listen for incoming calls and WebRTC signals.
 * 
 * @param userId - The user ID to create a channel for
 * @returns Supabase RealtimeChannel instance
 */
export function userRingChannel(userId: string) {
  return supabase.channel(`webrtc_user_${userId}`, {
    config: { 
      broadcast: { ack: true } 
    },
  });
}

/* ----------------------------- Call Control ------------------------------ */

/**
 * Send a ring notification to initiate a call.
 * The recipient will receive this on their `webrtc_user_{toUserId}` channel.
 * 
 * @param toUserId - User ID to ring
 * @param payload - Call details (conversation, caller info, mode)
 */
export async function sendRing(toUserId: string, payload: RingPayload) {
  const channel = supabase.channel(`webrtc_user_${toUserId}`);
  
  return channel.send({
    type: "broadcast",
    event: "ring",
    payload,
  });
}

/**
 * Send hangup signal to end or decline a call.
 * 
 * @param toUserId - User ID to notify
 * @param conversationId - Optional conversation ID for context
 */
export async function sendHangupToUser(
  toUserId: string, 
  conversationId?: string
) {
  const channel = supabase.channel(`webrtc_user_${toUserId}`);
  
  return channel.send({
    type: "broadcast",
    event: "hangup",
    payload: { conversationId } as HangupPayload,
  });
}

/* ----------------------------- WebRTC Signaling -------------------------- */

/**
 * Send WebRTC offer (SDP) to peer.
 * This is the first step in establishing a peer connection.
 * 
 * @param toUserId - Peer user ID
 * @param payload - Offer details (conversation, caller, SDP)
 */
export async function sendOfferToUser(toUserId: string, payload: SDPPayload) {
  const channel = supabase.channel(`webrtc_user_${toUserId}`);
  
  return channel.send({
    type: "broadcast",
    event: "webrtc-offer",
    payload,
  });
}

/**
 * Send WebRTC answer (SDP) to peer.
 * This is the response to an offer, completing the SDP exchange.
 * 
 * @param toUserId - Peer user ID
 * @param payload - Answer details (conversation, answerer, SDP)
 */
export async function sendAnswerToUser(toUserId: string, payload: SDPPayload) {
  const channel = supabase.channel(`webrtc_user_${toUserId}`);
  
  return channel.send({
    type: "broadcast",
    event: "webrtc-answer",
    payload,
  });
}

/**
 * Send ICE candidate to peer.
 * ICE candidates are exchanged continuously during connection setup.
 * 
 * @param toUserId - Peer user ID
 * @param payload - ICE candidate details
 */
export async function sendIceToUser(toUserId: string, payload: ICEPayload) {
  const channel = supabase.channel(`webrtc_user_${toUserId}`);
  
  return channel.send({
    type: "broadcast",
    event: "webrtc-ice",
    payload,
  });
}

/* ----------------------------- Utility Helpers --------------------------- */

/**
 * Broadcast to multiple users at once (e.g., group calls).
 * 
 * @param userIds - Array of user IDs
 * @param event - Event name
 * @param payload - Event payload
 */
export async function broadcastToUsers(
  userIds: string[],
  event: string,
  payload: any
) {
  return Promise.all(
    userIds.map((userId) =>
      supabase.channel(`webrtc_user_${userId}`).send({
        type: "broadcast",
        event,
        payload,
      })
    )
  );
}

/**
 * Check if a user's channel is currently subscribed/active.
 * Useful for presence detection.
 * 
 * @param userId - User ID to check
 * @returns Promise<boolean> - true if channel exists and is subscribed
 */
export async function isUserChannelActive(userId: string): Promise<boolean> {
  try {
    const channel = supabase.channel(`webrtc_user_${userId}`);
    const state = channel.state;
    return state === "joined" || state === "joining";
  } catch {
    return false;
  }
}

/**
 * Cleanup/unsubscribe from a user channel.
 * Call this when leaving a page or ending a call.
 * 
 * @param userId - User ID whose channel to clean up
 */
export async function cleanupUserChannel(userId: string) {
  try {
    const channel = supabase.channel(`webrtc_user_${userId}`);
    await supabase.removeChannel(channel);
  } catch (err) {
    console.warn(`Failed to cleanup channel for user ${userId}:`, err);
  }
}
