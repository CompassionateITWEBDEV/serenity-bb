#!/usr/bin/env node

/**
 * Patient Verification System Migration Helper
 * This script helps verify that the migration was successful
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function verifyMigration() {
  console.log('🔍 Verifying Patient Verification System Migration...');
  
  // Check for required environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  
  if (!supabaseUrl) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not set');
    process.exit(1);
  }
  
  if (!supabaseServiceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set');
    process.exit(1);
  }
  
  // Create Supabase client with service role key
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const requiredTables = [
    'patient_verifications',
    'patient_verification_documents', 
    'patient_verification_logs',
    'patient_verification_summary'
  ];
  
  const results = {
    tables: {},
    allTablesExist: true
  };
  
  console.log('📊 Checking required tables...');
  
  for (const tableName of requiredTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(0);
      
      if (error) {
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          console.log(`❌ Table '${tableName}' does not exist`);
          results.tables[tableName] = false;
          results.allTablesExist = false;
        } else {
          console.log(`⚠️  Table '${tableName}' exists but has issues: ${error.message}`);
          results.tables[tableName] = true;
        }
      } else {
        console.log(`✅ Table '${tableName}' exists and is accessible`);
        results.tables[tableName] = true;
      }
    } catch (err) {
      console.log(`❌ Error checking table '${tableName}': ${err.message}`);
      results.tables[tableName] = false;
      results.allTablesExist = false;
    }
  }
  
  console.log('\n📋 Migration Status Summary:');
  console.log('─'.repeat(50));
  
  Object.entries(results.tables).forEach(([table, exists]) => {
    const status = exists ? '✅' : '❌';
    console.log(`${status} ${table}`);
  });
  
  console.log('─'.repeat(50));
  
  if (results.allTablesExist) {
    console.log('🎉 All required tables exist! Patient verification system is ready.');
    console.log('\n📝 Next steps:');
    console.log('1. Refresh your PatientVerificationManager component');
    console.log('2. Test creating patient verifications');
    console.log('3. Verify notifications work properly');
  } else {
    console.log('⚠️  Some tables are missing. Please run the migration script.');
    console.log('\n🔧 To fix this:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of scripts/create_patient_verification_system.sql');
    console.log('4. Execute the SQL');
    console.log('5. Run this verification script again');
  }
  
  return results;
}

// Run the verification
verifyMigration().catch(console.error);

