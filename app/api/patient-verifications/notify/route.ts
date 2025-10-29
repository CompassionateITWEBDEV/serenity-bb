import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/patient-verifications/notify - Send verification notifications
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
    const { verification_id, notification_type, message } = body;

    if (!verification_id || !notification_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get verification details
    const { data: verification, error: verificationError } = await supabase
      .from('patient_verifications')
      .select('patient_id, verification_type, status')
      .eq('id', verification_id)
      .single();

    if (verificationError || !verification) {
      return NextResponse.json({ error: 'Verification not found' }, { status: 404 });
    }

    // Create notification
    const notificationData = {
      patient_id: verification.patient_id,
      type: 'verification_update',
      title: `Verification ${notification_type}`,
      message: message || `Your ${verification.verification_type} verification has been ${notification_type}`,
      metadata: {
        verification_id,
        verification_type: verification.verification_type,
        status: verification.status,
        notification_type,
      },
      created_at: new Date().toISOString(),
    };

    const { data: notification, error: notificationError } = await supabase
      .from('staff_notifications')
      .insert(notificationData)
      .select()
      .single();

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
    }

    // Send real-time notification
    const { error: channelError } = await supabase.channel('patient-notifications')
      .send({
        type: 'broadcast',
        event: 'verification_update',
        payload: {
          patient_id: verification.patient_id,
          verification_id,
          notification_type,
          message: notificationData.message,
        },
      });

    if (channelError) {
      console.error('Error sending real-time notification:', channelError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/patient-verifications/notify:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
