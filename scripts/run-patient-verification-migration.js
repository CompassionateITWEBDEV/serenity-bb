#!/usr/bin/env node

/**
 * Script to run the patient verification system migration
 * This script connects to Supabase and executes the SQL migration
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function runMigration() {
  console.log('🚀 Starting Patient Verification System Migration...');
  
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
  
  // Create Supabase client with service role key (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, 'create_patient_verification_system.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`);
      process.exit(1);
    }
    
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Migration file loaded successfully');
    
    // Split SQL into individual statements (basic approach)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📊 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.trim()) {
        try {
          console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
          
          const { data, error } = await supabase.rpc('exec_sql', { 
            sql_query: statement + ';' 
          });
          
          if (error) {
            // If exec_sql doesn't exist, try direct query execution
            const { error: directError } = await supabase
              .from('_migrations')
              .select('*')
              .limit(0);
            
            if (directError && directError.message.includes('relation "_migrations" does not exist')) {
              // Try using the SQL editor approach
              console.log('⚠️  exec_sql function not available, trying alternative approach...');
              
              // For now, we'll create a simple API endpoint to handle this
              console.log('📝 Please run the following SQL in your Supabase SQL Editor:');
              console.log('─'.repeat(50));
              console.log(sqlContent);
              console.log('─'.repeat(50));
              console.log('');
              console.log('Or use the Supabase CLI:');
              console.log(`supabase db reset --db-url "${supabaseUrl}" --schema public`);
              console.log('');
              console.log('Then run:');
              console.log(`psql "${supabaseUrl.replace('https://', 'postgresql://').replace('.supabase.co', '.supabase.co:5432')}" -f "${migrationPath}"`);
              
              process.exit(0);
            }
            
            throw error;
          }
          
          console.log(`✅ Statement ${i + 1} executed successfully`);
        } catch (stmtError) {
          console.error(`❌ Error executing statement ${i + 1}:`, stmtError.message);
          console.log('Statement:', statement.substring(0, 100) + '...');
          throw stmtError;
        }
      }
    }
    
    console.log('🎉 Migration completed successfully!');
    console.log('');
    console.log('✅ Patient verification system is now ready');
    console.log('📋 Created tables:');
    console.log('   - patient_verifications');
    console.log('   - patient_verification_documents');
    console.log('   - patient_verification_logs');
    console.log('   - patient_verification_summary (view)');
    console.log('');
    console.log('🔐 RLS policies have been applied');
    console.log('📊 Indexes have been created for performance');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('');
    console.error('💡 Manual migration steps:');
    console.error('1. Go to your Supabase dashboard');
    console.error('2. Navigate to SQL Editor');
    console.error('3. Copy and paste the contents of scripts/create_patient_verification_system.sql');
    console.error('4. Execute the SQL');
    console.error('');
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(console.error);

