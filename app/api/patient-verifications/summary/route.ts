import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/patient-verifications/summary - Get verification summary for all patients (staff) or own summary (patient)
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patient_id');

    // Check if user is staff or patient
    const isStaff = user.user_metadata?.role === 'staff' || user.user_metadata?.role === 'admin';
    
    let query = supabase
      .from('patient_verification_summary')
      .select('*');

    if (!isStaff) {
      // Patients can only see their own summary
      query = query.eq('patient_id', user.id);
    } else if (patientId) {
      // Staff can filter by specific patient
      query = query.eq('patient_id', patientId);
    }

    const { data, error } = await query.order('last_updated', { ascending: false });

    if (error) {
      console.error('Error fetching verification summary:', error);
      
      // Check if the error is due to missing tables/views
      if (error.message?.includes('relation "patient_verification_summary" does not exist') ||
          error.message?.includes('relation "patient_verifications" does not exist')) {
        return NextResponse.json({ 
          error: 'Patient verification system not initialized',
          message: 'Please run the patient verification migration script first',
          migration_required: true,
          sql_file: 'scripts/create_patient_verification_system.sql'
        }, { status: 503 });
      }
      
      return NextResponse.json({ error: 'Failed to fetch verification summary' }, { status: 500 });
    }

    return NextResponse.json({ summaries: data || [] });
  } catch (error) {
    console.error('Error in GET /api/patient-verifications/summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
