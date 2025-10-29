// Staff notification system for real-time alerts
import { createClient } from '@/lib/supabase/client';
import { createClient as createClientBrowser } from '@/lib/supabase/client';

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

export interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  submission_alerts: boolean;
  message_alerts: boolean;
  appointment_alerts: boolean;
  emergency_alerts: boolean;
}

// Create notification for staff when patient sends submission
export async function createSubmissionNotification(
  patientId: string,
  submissionId: string,
  submissionType: string,
  patientName: string
) {
  const supabase = createClient();
  
  try {
    // Get all active staff members who should receive notifications
    const { data: staffMembers, error: staffError } = await supabase
      .from('staff')
      .select('user_id, first_name, last_name')
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
      staff_id: (staff as any).user_id,
      read: false,
      metadata: {
        submission_id: submissionId,
        priority: submissionType === 'emergency' ? 'urgent' : 'medium'
      }
    })) || [];

    if (notifications.length > 0) {
      const { error: insertError } = await (supabase as any)
        .from('staff_notifications')
        .insert(notifications);

      if (insertError) {
        console.error('Error creating staff notifications:', insertError);
      } else {
        console.log(`Created ${notifications.length} staff notifications for submission ${submissionId}`);
      }
    }
  } catch (error) {
    console.error('Error in createSubmissionNotification:', error);
  }
}

// Create notification for staff when patient sends message
export async function createMessageNotification(
  patientId: string,
  messageId: string,
  conversationId: string,
  patientName: string,
  messagePreview: string
) {
  const supabase = createClient();
  
  try {
    // Get all active staff members who should receive notifications
    const { data: staffMembers, error: staffError } = await supabase
      .from('staff')
      .select('user_id, first_name, last_name')
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
      staff_id: (staff as any).user_id,
      read: false,
      metadata: {
        message_id: messageId,
        conversation_id: conversationId,
        priority: 'medium'
      }
    })) || [];

    if (notifications.length > 0) {
      const { error: insertError } = await (supabase as any)
        .from('staff_notifications')
        .insert(notifications);

      if (insertError) {
        console.error('Error creating staff notifications:', insertError);
      } else {
        console.log(`Created ${notifications.length} staff notifications for message ${messageId}`);
      }
    }
  } catch (error) {
    console.error('Error in createMessageNotification:', error);
  }
}

// Get notifications for a specific staff member
export async function getStaffNotifications(staffId: string, limit: number = 50) {
  const supabase = createClient();
  
  try {
    // Check if staffId is provided
    if (!staffId) {
      console.warn('getStaffNotifications: No staffId provided');
      return [];
    }

    const { data, error } = await supabase
      .from('staff_notifications')
      .select('*')
      .eq('staff_id', staffId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Log everything about the error - it might be an object with unexpected structure
      console.error('Error fetching staff notifications - full error object:', JSON.stringify(error, null, 2));
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);
      console.error('Error keys:', error ? Object.keys(error) : 'error is null/undefined');
      
      // Try to extract error information in multiple ways
      const errorMessage = 
        error?.message || 
        error?.error?.message ||
        (typeof error === 'string' ? error : null) ||
        JSON.stringify(error);
      
      const errorCode = 
        error?.code || 
        error?.error?.code ||
        error?.statusCode ||
        null;
      
      const errorDetails = error?.details || error?.error?.details || null;
      const errorHint = error?.hint || error?.error?.hint || null;
      
      console.error('Extracted error info:', {
        message: errorMessage,
        code: errorCode,
        details: errorDetails,
        hint: errorHint,
        fullError: error
      });
      
      // Check for common error scenarios
      // PGRST205 = table not found in schema cache
      // PGRST116 = relation does not exist
      if (errorCode === 'PGRST205' || 
          errorCode === 'PGRST116' || 
          errorMessage?.includes('relation "staff_notifications" does not exist') || 
          errorMessage?.includes('Could not find the table') ||
          errorMessage?.includes('does not exist') ||
          (errorMessage?.includes('relation') && errorMessage?.includes('not found'))) {
        console.warn('⚠️ staff_notifications table does not exist in the database.');
        console.warn('   Please run the migration script: scripts/create_staff_notifications_table.sql');
        console.warn('   Or use the existing notifications table if that is your preferred setup.');
        return [];
      }
      
      // If RLS policy issue
      if (errorCode === '42501' || 
          errorMessage?.includes('permission denied') || 
          errorMessage?.includes('RLS') ||
          errorMessage?.includes('row-level security')) {
        console.warn('⚠️ Permission denied accessing staff_notifications. Check RLS policies.');
        return [];
      }
      
      // If authentication issue
      if (errorCode === '401' || errorMessage?.includes('JWT') || errorMessage?.includes('unauthorized')) {
        console.warn('⚠️ Authentication error. User may not be logged in.');
        return [];
      }
      
      // For any other error, log it but return empty array to prevent breaking the UI
      console.warn('⚠️ Unknown error fetching staff notifications, returning empty array:', errorMessage || 'Unknown error');
      return [];
    }

    // Success - return the data
    return (data || []) as StaffNotification[];
  } catch (error) {
    // Catch any unexpected errors
    console.error('❌ Unexpected error in getStaffNotifications:', error);
    console.error('Error type:', typeof error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string, staffId: string) {
  const supabase = createClient();
  
  try {
    const { error } = await (supabase as any)
      .from('staff_notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('staff_id', staffId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markNotificationAsRead:', error);
    return false;
  }
}

// Mark all notifications as read for a staff member
export async function markAllNotificationsAsRead(staffId: string) {
  const supabase = createClient();
  
  try {
    const { error } = await (supabase as any)
      .from('staff_notifications')
      .update({ read: true })
      .eq('staff_id', staffId)
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markAllNotificationsAsRead:', error);
    return false;
  }
}

// Get unread notification count for staff member
export async function getUnreadNotificationCount(staffId: string) {
  const supabase = createClient();
  
  try {
    const { count, error } = await supabase
      .from('staff_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('staff_id', staffId)
      .eq('read', false);

    if (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getUnreadNotificationCount:', error);
    return 0;
  }
}

// Real-time notification hook for staff
export function useStaffNotifications(staffId: string) {
  const supabase = createClientBrowser();
  
  return {
    // Subscribe to real-time notifications
    subscribe: (callback: (notification: StaffNotification) => void) => {
      const channel = supabase
        .channel(`staff-notifications:${staffId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'staff_notifications',
            filter: `staff_id=eq.${staffId}`,
          },
          (payload: any) => {
            callback(payload.new as StaffNotification);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  };
}
