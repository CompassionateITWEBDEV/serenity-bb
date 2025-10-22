'use client';

/**
 * Test error handling functionality
 * This file can be used to test error boundaries and client error handling
 */

export function testErrorHandling() {
  console.log('🧪 Testing error handling...');

  // Test 1: Throw a synchronous error
  function testSyncError() {
    try {
      throw new Error('Test synchronous error');
    } catch (error) {
      console.log('✅ Sync error caught:', error);
    }
  }

  // Test 2: Test unhandled promise rejection
  function testPromiseRejection() {
    Promise.reject(new Error('Test promise rejection'))
      .catch(error => {
        console.log('✅ Promise rejection caught:', error);
      });
  }

  // Test 3: Test async error
  async function testAsyncError() {
    try {
      await Promise.reject(new Error('Test async error'));
    } catch (error) {
      console.log('✅ Async error caught:', error);
    }
  }

  // Test 4: Test error boundary trigger
  function testErrorBoundary() {
    // This would trigger an error boundary if called from a React component
    throw new Error('Test error boundary trigger');
  }

  // Run tests
  testSyncError();
  testPromiseRejection();
  testAsyncError();
  
  console.log('✅ Error handling tests completed');
  console.log('⚠️ Note: testErrorBoundary() should only be called from a React component');
}

// Auto-run in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Uncomment to test error handling
  // testErrorHandling();
}
