import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schema for document upload
const DocumentUploadSchema = z.object({
  verification_id: z.string().uuid(),
  document_type: z.string(),
  document_name: z.string(),
  file_url: z.string().url(),
  file_size: z.number().optional(),
  mime_type: z.string().optional(),
});

// POST /api/patient-verifications/documents - Upload document
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = DocumentUploadSchema.parse(body);

    // Verify that the verification belongs to the patient (if not staff)
    const isStaff = user.user_metadata?.role === 'staff' || user.user_metadata?.role === 'admin';
    
    if (!isStaff) {
      const { data: verification, error: verificationError } = await supabase
        .from('patient_verifications')
        .select('patient_id')
        .eq('id', validatedData.verification_id)
        .single();

      if (verificationError || !verification) {
        return NextResponse.json({ error: 'Verification not found' }, { status: 404 });
      }

      if (verification.patient_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { data, error } = await supabase
      .from('patient_verification_documents')
      .insert({
        ...validatedData,
        uploaded_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error uploading document:', error);
      return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
    }

    // Update the verification's submitted_documents array
    const { error: updateError } = await supabase
      .from('patient_verifications')
      .update({
        submitted_documents: supabase.rpc('array_append', {
          array: supabase.from('patient_verifications')
            .select('submitted_documents')
            .eq('id', validatedData.verification_id)
            .single(),
          value: validatedData.document_name
        })
      })
      .eq('id', validatedData.verification_id);

    if (updateError) {
      console.error('Error updating submitted documents:', updateError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({ document: data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    console.error('Error in POST /api/patient-verifications/documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/patient-verifications/documents - Get documents for a verification
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const verificationId = searchParams.get('verification_id');
    
    if (!verificationId) {
      return NextResponse.json({ error: 'Verification ID is required' }, { status: 400 });
    }

    // Check permissions
    const isStaff = user.user_metadata?.role === 'staff' || user.user_metadata?.role === 'admin';
    
    if (!isStaff) {
      // Verify that the verification belongs to the patient
      const { data: verification, error: verificationError } = await supabase
        .from('patient_verifications')
        .select('patient_id')
        .eq('id', verificationId)
        .single();

      if (verificationError || !verification) {
        return NextResponse.json({ error: 'Verification not found' }, { status: 404 });
      }

      if (verification.patient_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { data, error } = await supabase
      .from('patient_verification_documents')
      .select('*')
      .eq('verification_id', verificationId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    return NextResponse.json({ documents: data });
  } catch (error) {
    console.error('Error in GET /api/patient-verifications/documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

