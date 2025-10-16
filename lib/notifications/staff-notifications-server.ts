// Server-side staff notification system for API routes
import { createClient } from '@/lib/supabase/server';

export interface StaffNotification {
  id: string;
  type: 'submission' | 'message' | 'appointment' | 'emergency';
  title: string;
  message: string;
  patient_id: string;
  patient_name: string;
  staff_id: string;
  read: boolean;
  created_at: string;
  metadata?: {
    submission_id?: string;
    message_id?: string;
    conversation_id?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  };
}

// Create notification for staff when patient sends submission (server-side)
export async function createSubmissionNotificationServer(
  patientId: string,
  submissionId: string,
  submissionType: string,
  patientName: string
) {
  const supabase = createClient();
  
  try {
    // Get all staff members who should receive notifications
    const { data: staffMembers, error: staffError } = await supabase
      .from('staff_members')
      .select('user_id, first_name, last_name, notification_preferences')
      .eq('active', true);

    if (staffError) {
      console.error('Error fetching staff members:', staffError);
      return;
    }

    // Create notifications for each staff member
    const notifications = staffMembers?.map(staff => ({
      type: 'submission',
      title: `New ${submissionType} Submission`,
      message: `${patientName} has submitted a new ${submissionType} entry. Review and respond as needed.`,
      patient_id: patientId,
      patient_name: patientName,
      staff_id: staff.user_id,
      read: false,
      metadata: {
        submission_id: submissionId,
        priority: submissionType === 'emergency' ? 'urgent' : 'medium'
      }
    })) || [];

    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from('staff_notifications')
        .insert(notifications);

      if (insertError) {
        console.error('Error creating staff notifications:', insertError);
      } else {
        console.log(`Created ${notifications.length} staff notifications for submission ${submissionId}`);
      }
    }
  } catch (error) {
    console.error('Error in createSubmissionNotificationServer:', error);
  }
}

// Create notification for staff when patient sends message (server-side)
export async function createMessageNotificationServer(
  patientId: string,
  messageId: string,
  conversationId: string,
  patientName: string,
  messagePreview: string
) {
  const supabase = createClient();
  
  try {
    // Get all staff members who should receive notifications
    const { data: staffMembers, error: staffError } = await supabase
      .from('staff_members')
      .select('user_id, first_name, last_name, notification_preferences')
      .eq('active', true);

    if (staffError) {
      console.error('Error fetching staff members:', staffError);
      return;
    }

    // Create notifications for each staff member
    const notifications = staffMembers?.map(staff => ({
      type: 'message',
      title: `New Message from ${patientName}`,
      message: messagePreview.length > 100 ? `${messagePreview.substring(0, 100)}...` : messagePreview,
      patient_id: patientId,
      patient_name: patientName,
      staff_id: staff.user_id,
      read: false,
      metadata: {
        message_id: messageId,
        conversation_id: conversationId,
        priority: 'medium'
      }
    })) || [];

    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from('staff_notifications')
        .insert(notifications);

      if (insertError) {
        console.error('Error creating staff notifications:', insertError);
      } else {
        console.log(`Created ${notifications.length} staff notifications for message ${messageId}`);
      }
    }
  } catch (error) {
    console.error('Error in createMessageNotificationServer:', error);
  }
}
