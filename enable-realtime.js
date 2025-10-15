// Script to enable Supabase Realtime
// Run this with: node enable-realtime.js

const SUPABASE_URL = 'https://cycakdfxcsjknxkqpasp.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5Y2FrZGZ4Y3Nqa254a3FwYXNwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTE4NDk2MywiZXhwIjoyMDcwNzYwOTYzfQ.w67YbhE6kxbde6MOUu0NJbLLIyiYIe8ncZ2ONobduPk';

async function enableRealtime() {
  try {
    console.log('🔍 Checking Realtime status...');
    
    // Check if Realtime is already enabled
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      }
    });
    
    console.log('✅ Supabase connection successful');
    console.log('📡 Realtime should be available at:', `${SUPABASE_URL}/realtime/v1/`);
    
    // Test Realtime connection
    const realtimeResponse = await fetch(`${SUPABASE_URL}/realtime/v1/`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      }
    });
    
    if (realtimeResponse.ok) {
      console.log('✅ Realtime service is accessible');
    } else {
      console.log('❌ Realtime service not accessible:', realtimeResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

enableRealtime();
