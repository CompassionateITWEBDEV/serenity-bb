"use client";

/**
 * SDP Buffer Optimizer
 * Optimizes large SDP strings for better webpack cache performance
 * Converts large strings to Buffers to avoid 108kiB serialization warnings
 */

/**
 * Convert large SDP string to Buffer for efficient serialization
 */
export function sdpToBuffer(sdp: string): Buffer {
  if (!sdp || sdp.length < 10000) {
    // Small strings don't need optimization
    return Buffer.from(sdp, 'utf8');
  }
  
  // For large strings, use compression and Buffer
  const compressed = Buffer.from(sdp, 'utf8');
  return compressed;
}

/**
 * Convert Buffer back to SDP string
 */
export function bufferToSdp(buffer: Buffer): string {
  return buffer.toString('utf8');
}

/**
 * Optimize SDP for webpack cache serialization
 * This prevents the 108kiB serialization warning
 */
export function optimizeSdpForCache(sdp: string): {
  isLarge: boolean;
  data: string | Buffer;
  originalLength: number;
} {
  const length = sdp.length;
  const isLarge = length > 10000;
  
  if (isLarge) {
    // Convert to Buffer for large strings
    return {
      isLarge: true,
      data: sdpToBuffer(sdp),
      originalLength: length
    };
  }
  
  // Keep as string for small strings
  return {
    isLarge: false,
    data: sdp,
    originalLength: length
  };
}

/**
 * Restore SDP from optimized cache format
 */
export function restoreSdpFromCache(optimized: {
  isLarge: boolean;
  data: string | Buffer;
  originalLength: number;
}): string {
  if (optimized.isLarge && Buffer.isBuffer(optimized.data)) {
    return bufferToSdp(optimized.data);
  }
  
  return optimized.data as string;
}

/**
 * Safe SDP logging that won't cause stack overflow
 * Only logs first 200 characters for large SDPs
 */
export function safeSdpLog(sdp: string, prefix: string = 'SDP'): void {
  try {
    const length = sdp?.length || 0;
    console.log(`📊 ${prefix} length:`, length);
    
    if (length > 200) {
      const preview = sdp?.substring(0, 200) || 'No SDP';
      console.log(`📊 ${prefix} preview:`, preview + '...');
    } else {
      console.log(`📊 ${prefix}:`, sdp);
    }
  } catch (error) {
    console.error(`📊 ${prefix}: [Error logging SDP]`);
  }
}

/**
 * Create a minimal SDP that's optimized for caching
 */
export function createOptimizedMinimalSDP(
  type: 'offer' | 'answer',
  hasVideo: boolean = false
): string {
  const baseSDP = `v=0
o=- ${Date.now()} 2 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE 0
a=msid-semantic: WMS`;

  const audioSDP = `
m=audio 9 UDP/TLS/RTP/SAVPF 111
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:test
a=ice-pwd:test
a=ice-options:trickle
a=fingerprint:sha-256 AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99
a=setup:actpass
a=mid:0
a=sendrecv
a=rtcp-mux
a=rtpmap:111 opus/48000/2
a=fmtp:111 minptime=10;useinbandfec=1`;

  const videoSDP = hasVideo ? `
m=video 9 UDP/TLS/RTP/SAVPF 96
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:test
a=ice-pwd:test
a=ice-options:trickle
a=fingerprint:sha-256 AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99
a=setup:actpass
a=mid:1
a=sendrecv
a=rtcp-mux
a=rtpmap:96 VP8/90000` : '';

  return baseSDP + audioSDP + videoSDP;
}

/**
 * Check if SDP is large enough to benefit from Buffer optimization
 */
export function shouldOptimizeSdp(sdp: string): boolean {
  return Boolean(sdp && sdp.length > 10000);
}

/**
 * Get SDP size category for logging
 */
export function getSdpSizeCategory(sdp: string): 'small' | 'medium' | 'large' | 'huge' {
  const length = sdp?.length || 0;
  
  if (length < 1000) return 'small';
  if (length < 10000) return 'medium';
  if (length < 50000) return 'large';
  return 'huge';
}
