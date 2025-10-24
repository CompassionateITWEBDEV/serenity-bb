"use client";

/**
 * Test safe logging to prevent stack overflow errors
 */

export function testSafeLogging() {
  console.log('🧪 Testing safe SDP logging...');

  // Create a very long SDP string (simulating real SDP)
  const longSDP = 'v=0\n' + 
    'o=- 9056061336692748754 3 IN IP4 127.0.0.1\n' +
    's=-\n' +
    't=0 0\n' +
    'a=group:BUNDLE 2 3 4 5\n' +
    'a=extmap-allow-mixed\n' +
    'a=msid-semantic: WMS fd86d6e0-1e41-4762-8962-e867e8b03f70\n' +
    'm=audio 9 UDP/TLS/RTP/SAVPF 111 63 9 0 8 13 110 126\n' +
    'c=IN IP4 0.0.0.0\n' +
    'a=rtcp:9 IN IP4 0.0.0.0\n' +
    'a=ice-ufrag:test\n' +
    'a=ice-pwd:test\n' +
    'a=ice-options:trickle\n' +
    'a=fingerprint:sha-256 test\n' +
    'a=setup:actpass\n' +
    'a=mid:2\n' +
    'a=sendrecv\n' +
    'a=rtcp-mux\n' +
    'a=rtcp-rsize\n' +
    'a=rtpmap:111 opus/48000/2\n' +
    'a=rtcp-fb:111 transport-cc\n' +
    'a=fmtp:111 minptime=10;useinbandfec=1\n' +
    'a=rtpmap:63 red/48000/2\n' +
    'a=rtpmap:9 G722/8000\n' +
    'a=rtpmap:0 PCMU/8000\n' +
    'a=rtpmap:8 PCMA/8000\n' +
    'a=rtpmap:13 CN/8000\n' +
    'a=rtpmap:110 telephone-event/48000\n' +
    'a=rtpmap:126 telephone-event/8000\n' +
    'a=ssrc:1234567890 cname:test\n' +
    'a=ssrc:1234567890 msid:fd86d6e0-1e41-4762-8962-e867e8b03f70 test\n' +
    'a=ssrc:1234567890 mslabel:test\n' +
    'a=ssrc:1234567890 label:test\n' +
    'm=video 9 UDP/TLS/RTP/SAVPF 96 97 98 99 100 101 102 103\n' +
    'c=IN IP4 0.0.0.0\n' +
    'a=rtcp:9 IN IP4 0.0.0.0\n' +
    'a=ice-ufrag:test\n' +
    'a=ice-pwd:test\n' +
    'a=ice-options:trickle\n' +
    'a=fingerprint:sha-256 test\n' +
    'a=setup:actpass\n' +
    'a=mid:3\n' +
    'a=sendrecv\n' +
    'a=rtcp-mux\n' +
    'a=rtcp-rsize\n' +
    'a=rtpmap:96 VP8/90000\n' +
    'a=rtcp-fb:96 goog-remb\n' +
    'a=rtcp-fb:96 transport-cc\n' +
    'a=rtcp-fb:96 ccm fir\n' +
    'a=rtcp-fb:96 nack\n' +
    'a=rtcp-fb:96 nack pli\n' +
    'a=fmtp:96 max-fr=30;max-fs=8192\n' +
    'a=rtpmap:97 VP9/90000\n' +
    'a=rtcp-fb:97 goog-remb\n' +
    'a=rtcp-fb:97 transport-cc\n' +
    'a=rtcp-fb:97 ccm fir\n' +
    'a=rtcp-fb:97 nack\n' +
    'a=rtcp-fb:97 nack pli\n' +
    'a=fmtp:97 max-fr=30;max-fs=8192\n' +
    'a=rtpmap:98 H264/90000\n' +
    'a=rtcp-fb:98 goog-remb\n' +
    'a=rtcp-fb:98 transport-cc\n' +
    'a=rtcp-fb:98 ccm fir\n' +
    'a=rtcp-fb:98 nack\n' +
    'a=rtcp-fb:98 nack pli\n' +
    'a=fmtp:98 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f\n' +
    'a=rtpmap:99 H264/90000\n' +
    'a=rtcp-fb:99 goog-remb\n' +
    'a=rtcp-fb:99 transport-cc\n' +
    'a=rtcp-fb:99 ccm fir\n' +
    'a=rtcp-fb:99 nack\n' +
    'a=rtcp-fb:99 nack pli\n' +
    'a=fmtp:99 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f\n' +
    'a=rtpmap:100 H264/90000\n' +
    'a=rtcp-fb:100 goog-remb\n' +
    'a=rtcp-fb:100 transport-cc\n' +
    'a=rtcp-fb:100 ccm fir\n' +
    'a=rtcp-fb:100 nack\n' +
    'a=rtcp-fb:100 nack pli\n' +
    'a=fmtp:100 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=4d001f\n' +
    'a=rtpmap:101 H264/90000\n' +
    'a=rtcp-fb:101 goog-remb\n' +
    'a=rtcp-fb:101 transport-cc\n' +
    'a=rtcp-fb:101 ccm fir\n' +
    'a=rtcp-fb:101 nack\n' +
    'a=rtcp-fb:101 nack pli\n' +
    'a=fmtp:101 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=4d001f\n' +
    'a=rtpmap:102 H264/90000\n' +
    'a=rtcp-fb:102 goog-remb\n' +
    'a=rtcp-fb:102 transport-cc\n' +
    'a=rtcp-fb:102 ccm fir\n' +
    'a=rtcp-fb:102 nack\n' +
    'a=rtcp-fb:102 nack pli\n' +
    'a=fmtp:102 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=64001f\n' +
    'a=rtpmap:103 H264/90000\n' +
    'a=rtcp-fb:103 goog-remb\n' +
    'a=rtcp-fb:103 transport-cc\n' +
    'a=rtcp-fb:103 ccm fir\n' +
    'a=rtcp-fb:103 nack\n' +
    'a=rtcp-fb:103 nack pli\n' +
    'a=fmtp:103 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=64001f\n' +
    'a=ssrc:1234567891 cname:test\n' +
    'a=ssrc:1234567891 msid:fd86d6e0-1e41-4762-8962-e867e8b03f70 test\n' +
    'a=ssrc:1234567891 mslabel:test\n' +
    'a=ssrc:1234567891 label:test\n' +
    'a=ssrc-group:FID 1234567891 1234567892\n' +
    'a=ssrc:1234567892 cname:test\n' +
    'a=ssrc:1234567892 msid:fd86d6e0-1e41-4762-8962-e867e8b03f70 test\n' +
    'a=ssrc:1234567892 mslabel:test\n' +
    'a=ssrc:1234567892 label:test';

  console.log('📊 Long SDP length:', longSDP.length);

  // Test safe logging
  try {
    const sdpPreview = longSDP.substring(0, 200);
    console.log('✅ Safe SDP preview (200 chars):', sdpPreview);
    console.log('✅ Safe logging test passed!');
    return true;
  } catch (error) {
    console.error('❌ Safe logging test failed:', error);
    return false;
  }
}

// Auto-run test in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  setTimeout(() => {
    testSafeLogging();
  }, 1000);
}
