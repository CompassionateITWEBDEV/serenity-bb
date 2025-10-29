import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// GET /api/admin/verify-migration - Verify patient verification migration status
export async function GET(req: NextRequest) {
  try {
    const supabase = await supabaseAdmin();
    
    const requiredTables = [
      'patient_verifications',
      'patient_verification_documents', 
      'patient_verification_logs',
      'patient_verification_summary'
    ];
    
    const results = {
      tables: {},
      allTablesExist: true,
      migrationRequired: false
    };
    
    console.log('🔍 Verifying Patient Verification System Migration...');
    
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
            results.migrationRequired = true;
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
        results.migrationRequired = true;
      }
    }
    
    if (results.allTablesExist) {
      console.log('🎉 All required tables exist! Patient verification system is ready.');
    } else {
      console.log('⚠️  Some tables are missing. Migration required.');
    }
    
    return NextResponse.json({
      success: true,
      migrationRequired: results.migrationRequired,
      allTablesExist: results.allTablesExist,
      tables: results.tables,
      message: results.allTablesExist 
        ? 'Patient verification system is ready!' 
        : 'Migration required - some tables are missing',
      instructions: results.migrationRequired ? {
        title: 'Migration Required',
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
    console.error('Error verifying migration:', error);
    return NextResponse.json({ 
      error: 'Failed to verify migration status',
      message: error instanceof Error ? error.message : 'Unknown error',
      migrationRequired: true
    }, { status: 500 });
  }
}

