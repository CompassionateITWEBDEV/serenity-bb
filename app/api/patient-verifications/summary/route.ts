import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSbClient } from '@supabase/supabase-js';

// GET /api/patient-verifications/summary - Get verification summary for all patients (staff) or own summary (patient)
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    let { data: { user }, error: authError } = await supabase.auth.getUser();

    // Bearer token fallback if cookie-based auth fails
    if ((!user || authError) && req.headers) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
      const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : null;
      if (url && anon && bearer) {
        const bearerClient = createSbClient(url, anon, {
          global: { headers: { Authorization: `Bearer ${bearer}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: bearerUser } = await bearerClient.auth.getUser();
        user = bearerUser?.user;
      }
    }

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patient_id');

    // Check if user is staff or patient
    const isStaff = user.user_metadata?.role === 'staff' || user.user_metadata?.role === 'admin';

    // Choose DB client: prefer service role for staff to avoid RLS issues
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
    const dbClient = (isStaff && url && serviceKey)
      ? createSbClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
      : supabase;
    
    // First try the full summary view if it exists
    try {
      let query = dbClient
        .from('patient_verification_summary')
        .select('*');

      if (!isStaff) {
        query = query.eq('patient_id', user.id);
      } else if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query.order('last_updated', { ascending: false });

      if (!error) {
        return NextResponse.json({ summaries: data || [] });
      }

      // If the view is missing, fall through to lightweight fallback below
      if (!(error.message?.includes('does not exist') || error.code === 'PGRST116')) {
        console.error('Error fetching verification summary:', error);
      }
    } catch {}

    // Fallback: build summaries directly from public.patients so staff can still see a list
    // Counts default to 0; overall_status derived as 'not_started'
    let patientsQuery = dbClient
      .from('patients')
      .select('user_id, email, first_name, last_name, phone_number, date_of_birth, avatar, updated_at');

    if (!isStaff) {
      patientsQuery = patientsQuery.eq('user_id', user.id);
    } else if (patientId) {
      patientsQuery = patientsQuery.eq('user_id', patientId);
    }

    const { data: patientsData, error: patientsError } = await patientsQuery.order('updated_at', { ascending: false });

    if (patientsError) {
      console.error('Error fetching patients fallback:', patientsError);
      return NextResponse.json({ error: 'Failed to fetch patients' }, { status: 500 });
    }

    const summaries = (patientsData || []).map((p: any) => ({
      patient_id: p.user_id,
      id: p.user_id,
      email: p.email,
      first_name: p.first_name,
      last_name: p.last_name,
      phone_number: p.phone_number,
      date_of_birth: p.date_of_birth,
      avatar: p.avatar,
      overall_status: 'not_started',
      total_verifications: 0,
      approved_count: 0,
      pending_count: 0,
      rejected_count: 0,
      last_updated: p.updated_at,
    }));

    return NextResponse.json({ summaries });
  } catch (error) {
    console.error('Error in GET /api/patient-verifications/summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
