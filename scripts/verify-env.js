#!/usr/bin/env node

/**
 * Environment Variable Verification Script
 * Run this before deploying to Vercel to ensure all required variables are set
 */

const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const optionalVars = [
  'NEXT_PUBLIC_ICE_STUN',
  'NEXT_PUBLIC_ICE_TURN_URI',
  'NEXT_PUBLIC_ICE_TURN_USER',
  'NEXT_PUBLIC_ICE_TURN_PASS',
  'NEXT_PUBLIC_STREAM_API_KEY',
  'STREAM_API_SECRET',
  'ZOOM_CLIENT_ID',
  'ZOOM_CLIENT_SECRET',
  'ZOOM_REDIRECT_URI'
];

console.log('🔍 Verifying environment variables...\n');

let allGood = true;

// Check required variables
console.log('✅ Required Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`   ❌ ${varName}: MISSING`);
    allGood = false;
  } else {
    // Show first 20 chars for verification
    const preview = value.substring(0, 20) + '...';
    console.log(`   ✓ ${varName}: ${preview} (${value.length} chars)`);
  }
});

console.log('\n📋 Optional Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    const preview = value.length > 20 ? value.substring(0, 20) + '...' : value;
    console.log(`   ✓ ${varName}: ${preview}`);
  } else {
    console.log(`   - ${varName}: not set (optional)`);
  }
});

console.log('\n' + '='.repeat(60));

if (allGood) {
  console.log('✅ All required environment variables are set!');
  console.log('✅ You are ready to deploy to Vercel');
  console.log('\nNext steps:');
  console.log('1. Make sure these same variables are set in Vercel dashboard');
  console.log('2. Run: vercel --prod');
  process.exit(0);
} else {
  console.log('❌ Missing required environment variables!');
  console.log('\nPlease set the missing variables:');
  console.log('1. Copy .env.example to .env.local');
  console.log('2. Fill in the values from your Supabase dashboard');
  console.log('3. Run this script again: node scripts/verify-env.js');
  process.exit(1);
}
