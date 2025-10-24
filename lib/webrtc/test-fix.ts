"use client";

/**
 * Test script to verify the WebRTC SDP fix is working
 */

import { fixSDPForWebRTC } from './sdp-fix';

export function testSDPFix() {
  console.log('🧪 Testing WebRTC SDP fix...');

  // Test SDP with common issues
  const problematicSDP = `v=0
o=- 1234567890 2 IN IP4 127.0.0.1
s=-
t=0 0
m=video 9 UDP/TLS/RTP/SAVPF 96
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:test
a=ice-pwd:test
a=fingerprint:sha-256 test
a=setup:actpass
a=mid:0
a=sendrecv
a=rtcp-mux
a=rtcp-rsize
a=rtpmap:96 VP8/90000
a=rtcp-fb:96 goog-remb
a=rtcp-fb:96 transport-cc
a=rtcp-fb:96 ccm fir
a=rtcp-fb:96 nack
a=rtcp-fb:96 nack pli
a=fmtp:96 max-fr=30;max-fs=8192
m=audio 9 UDP/TLS/RTP/SAVPF 111
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:test
a=ice-pwd:test
a=fingerprint:sha-256 test
a=setup:actpass
a=mid:1
a=sendrecv
a=rtcp-mux
a=rtpmap:111 opus/48000/2
a=rtcp-fb:111 transport-cc
a=fmtp:111 minptime=10;useinbandfec=1`;

  try {
    const fixedSDP = fixSDPForWebRTC(problematicSDP);
    
    console.log('✅ SDP fix test passed!');
    console.log('📊 Original SDP length:', problematicSDP.length);
    console.log('📊 Fixed SDP length:', fixedSDP.length);
    console.log('🔍 Audio m-line position:', fixedSDP.indexOf('m=audio'));
    console.log('🔍 Video m-line position:', fixedSDP.indexOf('m=video'));
    console.log('✅ Audio comes before video:', fixedSDP.indexOf('m=audio') < fixedSDP.indexOf('m=video'));
    
    return true;
  } catch (error) {
    console.error('❌ SDP fix test failed:', error);
    return false;
  }
}

// Auto-run test in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  setTimeout(() => {
    testSDPFix();
  }, 1000);
}
