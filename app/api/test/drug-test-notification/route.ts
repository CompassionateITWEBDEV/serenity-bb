import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// POST /api/test/drug-test-notification - Test drug test notification system
export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseAdmin();
    
    // Get a test patient ID (first patient in the system)
    const { data: patients, error: patientError } = await supabase
      .from('patients')
      .select('user_id, full_name, first_name, last_name, email')
      .limit(1);
    
    if (patientError || !patients || patients.length === 0) {
      return NextResponse.json({ 
        error: 'No patients found for testing',
        suggestion: 'Please ensure there are patients in the system'
      }, { status: 404 });
    }
    
    const testPatient = patients[0];
    const patientId = testPatient.user_id;
    const patientName = testPatient.full_name || 
      [testPatient.first_name, testPatient.last_name].filter(Boolean).join(" ").trim() || 
      "Test Patient";
    
    // Create a test drug test record
    const { data: drugTest, error: drugTestError } = await supabase
      .from('drug_tests')
      .insert({
        patient_id: patientId,
        scheduled_for: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        created_by: '00000000-0000-0000-0000-000000000000' // Test user ID
      })
      .select()
      .single();
    
    if (drugTestError) {
      console.error('Error creating test drug test:', drugTestError);
      return NextResponse.json({ 
        error: 'Failed to create test drug test',
        details: drugTestError.message
      }, { status: 500 });
    }
    
    // Create notification for the patient
    const scheduledDate = new Date(drugTest.scheduled_for).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const notificationMessage = `A random drug test has been scheduled for you on ${scheduledDate}. Please be prepared to take the test at the scheduled time.`;
    
    // Insert notification into the notifications table
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        patient_id: patientId,
        type: 'drug_test',
        title: 'Random Drug Test Assigned',
        message: notificationMessage,
        priority: 'high',
        read: false,
        metadata: {
          drug_test_id: drugTest.id,
          scheduled_for: drugTest.scheduled_for,
          created_by: 'test-system',
          test_type: 'random'
        }
      })
      .select()
      .single();
    
    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      return NextResponse.json({ 
        error: 'Failed to create notification',
        details: notificationError.message,
        drugTest: drugTest
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Drug test notification test completed successfully',
      testData: {
        patient: {
          id: patientId,
          name: patientName,
          email: testPatient.email
        },
        drugTest: {
          id: drugTest.id,
          scheduled_for: drugTest.scheduled_for
        },
        notification: {
          id: notification.id,
          title: notification.title,
          message: notification.message,
          type: notification.type
        }
      },
      instructions: {
        step1: 'Check the patient dashboard notifications',
        step2: 'Verify the notification appears in the notification bell',
        step3: 'Check that the notification has the correct drug test styling'
      }
    });
    
  } catch (error) {
    console.error('Error in drug test notification test:', error);
    return NextResponse.json({ 
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

