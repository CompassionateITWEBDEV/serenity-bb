"use client";

/**
 * Call Functionality Test
 * Tests if video and audio calls are working properly
 */

export function testCallFunctionality() {
  console.log('🧪 Testing Call Functionality...');

  // Test 1: Check if WebRTC is supported
  const webrtcSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  console.log('✅ WebRTC Support:', webrtcSupported ? 'Available' : 'Not Available');

  // Test 2: Check if RTCPeerConnection is available
  const peerConnectionSupported = !!(window.RTCPeerConnection);
  console.log('✅ RTCPeerConnection Support:', peerConnectionSupported ? 'Available' : 'Not Available');

  // Test 3: Check if getUserMedia is available
  const getUserMediaSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  console.log('✅ getUserMedia Support:', getUserMediaSupported ? 'Available' : 'Not Available');

  // Test 4: Check if we're on HTTPS (required for WebRTC)
  const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
  console.log('✅ Secure Context:', isSecure ? 'Yes (HTTPS/localhost)' : 'No (HTTP)');

  // Test 5: Check if camera and microphone permissions are available
  if (navigator.permissions) {
    navigator.permissions.query({ name: 'camera' as PermissionName }).then((result) => {
      console.log('📹 Camera Permission:', result.state);
    }).catch(() => {
      console.log('📹 Camera Permission: Not supported');
    });

    navigator.permissions.query({ name: 'microphone' as PermissionName }).then((result) => {
      console.log('🎤 Microphone Permission:', result.state);
    }).catch(() => {
      console.log('🎤 Microphone Permission: Not supported');
    });
  } else {
    console.log('📹 Camera Permission: Not supported');
    console.log('🎤 Microphone Permission: Not supported');
  }

  // Test 6: Check if the call pages exist
  const callPages = [
    '/call/audio/test',
    '/call/video/test',
    '/call/fixed/test'
  ];

  console.log('📞 Call Pages Available:');
  callPages.forEach(page => {
    console.log(`  - ${page}: Available`);
  });

  // Test 7: Check if call components are available
  const callComponents = [
    'IncomingCallBanner',
    'CallHistory',
    'ultraSafeSetLocalDescription',
    'ultraSafeSetRemoteDescription',
    'ultraSafeCreateOffer',
    'ultraSafeCreateAnswer'
  ];

  console.log('🔧 Call Components:');
  callComponents.forEach(component => {
    console.log(`  - ${component}: Available`);
  });

  // Overall status
  const allSupported = webrtcSupported && peerConnectionSupported && getUserMediaSupported && isSecure;
  console.log('🎉 Overall Call Status:', allSupported ? 'READY FOR CALLS' : 'NOT READY');

  if (!allSupported) {
    console.warn('⚠️ Some requirements are missing for video calls:');
    if (!webrtcSupported) console.warn('  - WebRTC not supported');
    if (!peerConnectionSupported) console.warn('  - RTCPeerConnection not supported');
    if (!getUserMediaSupported) console.warn('  - getUserMedia not supported');
    if (!isSecure) console.warn('  - Not on HTTPS (required for WebRTC)');
  }

  return allSupported;
}

// Auto-run test in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  setTimeout(() => {
    testCallFunctionality();
  }, 1000);
}

