import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/admin/check-migration - Check if patient verification tables exist
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    const requiredTables = [
      'patient_verifications',
      'patient_verification_documents', 
      'patient_verification_logs',
      'patient_verification_summary'
    ];
    
    const tables = {};
    let allTablesExist = true;
    
    console.log('🔍 Checking patient verification tables...');
    
    for (const tableName of requiredTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(0);
        
        if (error) {
          if (error.message.includes('relation') && error.message.includes('does not exist')) {
            console.log(`❌ Table '${tableName}' does not exist`);
            tables[tableName] = false;
            allTablesExist = false;
          } else {
            console.log(`⚠️  Table '${tableName}' exists but has issues: ${error.message}`);
            tables[tableName] = true;
          }
        } else {
          console.log(`✅ Table '${tableName}' exists and is accessible`);
          tables[tableName] = true;
        }
      } catch (err) {
        console.log(`❌ Error checking table '${tableName}': ${err.message}`);
        tables[tableName] = false;
        allTablesExist = false;
      }
    }
    
    if (allTablesExist) {
      console.log('🎉 All required tables exist! Patient verification system is ready.');
    } else {
      console.log('⚠️  Some tables are missing. Migration required.');
    }
    
    return NextResponse.json({
      migrationRequired: !allTablesExist,
      message: allTablesExist ? 'Patient verification system is ready' : 'Some tables are missing',
      tables,
      ready: allTablesExist,
      instructions: !allTablesExist ? {
        title: 'Manual Migration Required',
        steps: [
          '1. Go to your Supabase dashboard',
          '2. Navigate to SQL Editor',
          '3. Copy the contents of scripts/create_patient_verification_system.sql',
          '4. Paste and execute the SQL',
          '5. Verify tables are created successfully'
        ],
        sqlFile: 'scripts/create_patient_verification_system.sql'
      } : null
    });
    
  } catch (error) {
    console.error('Error checking migration status:', error);
    return NextResponse.json({ 
      error: 'Failed to check migration status',
      message: error.message,
      migrationRequired: true
    }, { status: 500 });
  }
}
