"use client";

/**
 * Test Buffer Optimization
 * Verifies that large SDP strings are properly optimized for webpack cache
 */

import { 
  optimizeSdpForCache, 
  restoreSdpFromCache, 
  shouldOptimizeSdp, 
  getSdpSizeCategory,
  createOptimizedMinimalSDP 
} from './sdp-buffer-optimizer';

export function testBufferOptimization() {
  console.log('🧪 Testing SDP Buffer Optimization...');

  // Test 1: Small SDP (should not be optimized)
  const smallSDP = 'v=0\no=- 123 2 IN IP4 127.0.0.1\ns=-\nt=0 0';
  console.log('📊 Small SDP test:');
  console.log('  - Length:', smallSDP.length);
  console.log('  - Should optimize:', shouldOptimizeSdp(smallSDP));
  console.log('  - Size category:', getSdpSizeCategory(smallSDP));

  // Test 2: Large SDP (should be optimized)
  const largeSDP = createOptimizedMinimalSDP('offer', true) + 
    '\n' + 'a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level'.repeat(100);
  
  console.log('📊 Large SDP test:');
  console.log('  - Length:', largeSDP.length);
  console.log('  - Should optimize:', shouldOptimizeSdp(largeSDP));
  console.log('  - Size category:', getSdpSizeCategory(largeSDP));

  // Test 3: Cache optimization
  const optimized = optimizeSdpForCache(largeSDP);
  console.log('📊 Cache optimization test:');
  console.log('  - Is large:', optimized.isLarge);
  console.log('  - Data type:', typeof optimized.data);
  console.log('  - Is Buffer:', Buffer.isBuffer(optimized.data));
  console.log('  - Original length:', optimized.originalLength);

  // Test 4: Cache restoration
  const restored = restoreSdpFromCache(optimized);
  console.log('📊 Cache restoration test:');
  console.log('  - Restored length:', restored.length);
  console.log('  - Matches original:', restored === largeSDP);
  console.log('  - Content matches:', restored.substring(0, 100) === largeSDP.substring(0, 100));

  // Test 5: Performance comparison
  console.log('📊 Performance test:');
  const iterations = 1000;
  
  // String serialization
  const startString = performance.now();
  for (let i = 0; i < iterations; i++) {
    JSON.stringify({ sdp: largeSDP });
  }
  const endString = performance.now();
  const stringTime = endString - startString;

  // Buffer serialization
  const startBuffer = performance.now();
  for (let i = 0; i < iterations; i++) {
    const opt = optimizeSdpForCache(largeSDP);
    JSON.stringify({ sdp: opt });
  }
  const endBuffer = performance.now();
  const bufferTime = endBuffer - startBuffer;

  console.log('  - String serialization time:', stringTime.toFixed(2), 'ms');
  console.log('  - Buffer serialization time:', bufferTime.toFixed(2), 'ms');
  console.log('  - Performance improvement:', ((stringTime - bufferTime) / stringTime * 100).toFixed(1), '%');

  console.log('✅ Buffer optimization test completed!');
}

// Auto-run test in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  testBufferOptimization();
}
