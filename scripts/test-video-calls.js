#!/usr/bin/env node

/**
 * Video Call Test Script
 * This script helps test the video calling functionality
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Test results
const results = {
  server: false,
  videoTestPage: false,
  callTestPage: false,
  callPage: false,
  total: 0,
  passed: 0
};

// Helper function to make HTTP requests
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    }).on('error', reject);
  });
}

// Test functions
async function testServer() {
  console.log('🔍 Testing server availability...');
  try {
    const response = await makeRequest(BASE_URL);
    if (response.statusCode === 200) {
      console.log('✅ Server is running');
      results.server = true;
      results.passed++;
    } else {
      console.log('❌ Server returned status:', response.statusCode);
    }
  } catch (error) {
    console.log('❌ Server is not accessible:', error.message);
  }
  results.total++;
}

async function testVideoTestPage() {
  console.log('🔍 Testing video test page...');
  try {
    const response = await makeRequest(`${BASE_URL}/video-test.html`);
    if (response.statusCode === 200 && response.body.includes('Video Test')) {
      console.log('✅ Video test page is accessible');
      results.videoTestPage = true;
      results.passed++;
    } else {
      console.log('❌ Video test page not found or invalid');
    }
  } catch (error) {
    console.log('❌ Video test page error:', error.message);
  }
  results.total++;
}

async function testCallTestPage() {
  console.log('🔍 Testing call test page...');
  try {
    const response = await makeRequest(`${BASE_URL}/call-test.html`);
    if (response.statusCode === 200 && response.body.includes('Video Call Test')) {
      console.log('✅ Call test page is accessible');
      results.callTestPage = true;
      results.passed++;
    } else {
      console.log('❌ Call test page not found or invalid');
    }
  } catch (error) {
    console.log('❌ Call test page error:', error.message);
  }
  results.total++;
}

async function testCallPage() {
  console.log('🔍 Testing call page structure...');
  try {
    // Test a sample call page URL
    const testUrl = `${BASE_URL}/call/test-conversation?mode=video&role=caller&peer=test-peer&peerName=TestUser`;
    const response = await makeRequest(testUrl);
    
    if (response.statusCode === 200 && (response.body.includes('Video Call') || response.body.includes('CallPage') || response.body.includes('video'))) {
      console.log('✅ Call page structure is correct');
      results.callPage = true;
      results.passed++;
    } else {
      console.log('❌ Call page structure issue');
    }
  } catch (error) {
    console.log('❌ Call page error:', error.message);
  }
  results.total++;
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Video Call Tests...\n');
  
  await testServer();
  await testVideoTestPage();
  await testCallTestPage();
  await testCallPage();
  
  // Print results
  console.log('\n📊 Test Results:');
  console.log('================');
  console.log(`Server Running: ${results.server ? '✅' : '❌'}`);
  console.log(`Video Test Page: ${results.videoTestPage ? '✅' : '❌'}`);
  console.log(`Call Test Page: ${results.callTestPage ? '✅' : '❌'}`);
  console.log(`Call Page: ${results.callPage ? '✅' : '❌'}`);
  console.log(`\nTotal: ${results.passed}/${results.total} tests passed`);
  
  if (results.passed === results.total) {
    console.log('\n🎉 All tests passed! Video calling system is ready for testing.');
    console.log('\nNext steps:');
    console.log('1. Open http://localhost:3000/video-test.html to test camera access');
    console.log('2. Open http://localhost:3000/call-test.html for comprehensive testing');
    console.log('3. Test actual video calls between staff and patient users');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the issues above.');
    console.log('\nTroubleshooting:');
    console.log('1. Ensure the development server is running (npm run dev)');
    console.log('2. Check if all required files are present');
    console.log('3. Verify the application is accessible in browser');
  }
  
  process.exit(results.passed === results.total ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
});
