import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schemas
const VerificationStatusSchema = z.enum(['pending', 'approved', 'rejected', 'requires_update']);
const VerificationTypeSchema = z.enum(['identity', 'insurance', 'medical_history', 'emergency_contact']);

const CreateVerificationSchema = z.object({
  patient_id: z.string().uuid(),
  verification_type: VerificationTypeSchema,
  required_documents: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const UpdateVerificationSchema = z.object({
  status: VerificationStatusSchema,
  verified_by: z.string().uuid().optional(),
  rejection_reason: z.string().optional(),
  notes: z.string().optional(),
});

const DocumentUploadSchema = z.object({
  verification_id: z.string().uuid(),
  document_type: z.string(),
  document_name: z.string(),
  file_url: z.string().url(),
  file_size: z.number().optional(),
  mime_type: z.string().optional(),
});

// GET /api/patient-verifications - Get all verifications (staff) or own verifications (patient)
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patient_id');
    const status = searchParams.get('status');
    const verificationType = searchParams.get('verification_type');

    // Check if user is staff or patient
    const isStaff = user.user_metadata?.role === 'staff' || user.user_metadata?.role === 'admin';
    
    let query = supabase
      .from('patient_verifications')
      .select(`
        *,
        verified_by_user:auth.users!verified_by(
          id,
          email,
          raw_user_meta_data
        ),
        documents:patient_verification_documents(*),
        logs:patient_verification_logs(
          *,
          performed_by_user:auth.users!performed_by(
            id,
            email,
            raw_user_meta_data
          )
        )
      `);

    if (!isStaff) {
      // Patients can only see their own verifications
      query = query.eq('patient_id', user.id);
    } else if (patientId) {
      // Staff can filter by specific patient
      query = query.eq('patient_id', patientId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (verificationType) {
      query = query.eq('verification_type', verificationType);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching verifications:', error);
      return NextResponse.json({ error: 'Failed to fetch verifications' }, { status: 500 });
    }

    return NextResponse.json({ verifications: data });
  } catch (error) {
    console.error('Error in GET /api/patient-verifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/patient-verifications - Create new verification (staff only)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is staff
    const isStaff = user.user_metadata?.role === 'staff' || user.user_metadata?.role === 'admin';
    if (!isStaff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = CreateVerificationSchema.parse(body);

    const { data, error } = await supabase
      .from('patient_verifications')
      .insert({
        ...validatedData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating verification:', error);
      return NextResponse.json({ error: 'Failed to create verification' }, { status: 500 });
    }

    return NextResponse.json({ verification: data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    console.error('Error in POST /api/patient-verifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/patient-verifications/[id] - Update verification status (staff only)
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is staff
    const isStaff = user.user_metadata?.role === 'staff' || user.user_metadata?.role === 'admin';
    if (!isStaff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const verificationId = searchParams.get('id');
    
    if (!verificationId) {
      return NextResponse.json({ error: 'Verification ID is required' }, { status: 400 });
    }

    const body = await req.json();
    const validatedData = UpdateVerificationSchema.parse(body);

    const updateData: any = {
      ...validatedData,
      updated_at: new Date().toISOString(),
    };

    // If status is approved or rejected, set verification date and verified_by
    if (validatedData.status === 'approved' || validatedData.status === 'rejected') {
      updateData.verification_date = new Date().toISOString();
      updateData.verified_by = user.id;
    }

    const { data, error } = await supabase
      .from('patient_verifications')
      .update(updateData)
      .eq('id', verificationId)
      .select()
      .single();

    if (error) {
      console.error('Error updating verification:', error);
      return NextResponse.json({ error: 'Failed to update verification' }, { status: 500 });
    }

    return NextResponse.json({ verification: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    console.error('Error in PUT /api/patient-verifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

