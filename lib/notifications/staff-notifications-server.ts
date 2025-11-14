// Server-side staff notification system for API routes
import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';

export interface StaffNotification {
  id: string;
  type: 'submission' | 'message' | 'appointment' | 'emergency' | 'drug_test' | 'lead';
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
    drug_test_id?: string;
    lead_id?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  };
}

// Create notification for staff when patient sends submission (server-side)
export async function createSubmissionNotificationServer(
  patientId: string,
  submissionId: string,
  submissionType: string,
  patientName: string
): Promise<void> {
  const supabase = await createClient();
  
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
    const notifications = staffMembers?.map((staff: any) => ({
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
): Promise<void> {
  const supabase = await createClient();
  
  try {
    // Get all active staff members who should receive notifications and their preferences
    const { data: staffMembers, error: staffError } = await supabase
      .from('staff')
      .select('user_id, first_name, last_name, notification_preferences')
      .eq('active', true);

    if (staffError) {
      console.error('Error fetching staff members:', staffError);
      return;
    }

    // Filter staff by notification preferences - only create notifications for staff who have message_alerts enabled
    const eligibleStaff = staffMembers?.filter((staff: any) => {
      const prefs = staff.notification_preferences || {};
      return prefs.message_alerts !== false; // Default to true if not set
    }) || [];

    // Create notifications for each eligible staff member
    const notifications = eligibleStaff.map((staff: any) => ({
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
    console.error('Error in createMessageNotificationServer:', error);
  }
}
// Create notification for staff when drug test is created/updated (server-side)
export async function createDrugTestNotificationServer(
  patientId: string,
  drugTestId: string,
  patientName: string,
  message: string,
  testStatus?: 'completed' | 'missed' | 'submitted',
  testType?: string
): Promise<void> {
  const supabase = await createClient();
  
  try {
    // Get all active staff members who should receive notifications and their preferences
    const { data: staffMembers, error: staffError } = await supabase
      .from('staff')
      .select('user_id, first_name, last_name, notification_preferences')
      .eq('active', true);

    if (staffError) {
      console.error('Error fetching staff members:', staffError);
      return;
    }

    // Get the creator ID from the drug test (if available) to exclude them from notifications
    let creatorId: string | null = null;
    try {
      const { data: drugTest } = await supabase
        .from('drug_tests')
        .select('created_by')
        .eq('id', drugTestId)
        .maybeSingle();
      creatorId = drugTest?.created_by || null;
    } catch (e) {
      // Ignore error, just proceed without filtering
    }

    // Filter staff by notification preferences - only create notifications for staff who have drug_test_alerts enabled
    // Also exclude the creator of the drug test (they already know they created it)
    const eligibleStaff = staffMembers?.filter((staff: any) => {
      // Don't notify the creator
      if (creatorId && staff.user_id === creatorId) {
        return false;
      }
      const prefs = staff.notification_preferences || {};
      return prefs.drug_test_alerts !== false; // Default to true if not set
    }) || [];

    // Build notification title and message
    let title: string;
    let notificationMessage: string;
    
    if (message) {
      // Use provided message
      notificationMessage = message;
      title = message.includes('scheduled') ? `Drug Test Scheduled for ${patientName}` :
              message.includes('completed') ? `Drug Test Completed by ${patientName}` :
              message.includes('missed') ? `Drug Test Missed by ${patientName}` :
              `Drug Test Update for ${patientName}`;
    } else if (testStatus === 'completed') {
      title = `Drug Test Completed by ${patientName}`;
      notificationMessage = `${patientName} has completed their drug test. Results are ready for review.`;
    } else if (testStatus === 'submitted') {
      title = `Drug Test Submitted by ${patientName}`;
      notificationMessage = `${patientName} has submitted their drug test. Please review and process.`;
    } else if (testStatus === 'missed') {
      title = `Drug Test Missed by ${patientName}`;
      notificationMessage = `${patientName} has missed their scheduled drug test. Follow-up may be required.`;
    } else {
      title = `Drug Test for ${patientName}`;
      notificationMessage = message || `A drug test has been assigned to ${patientName}.`;
    }

    // Create notifications for each eligible staff member
    const notifications = eligibleStaff.map((staff: any) => ({
      type: 'drug_test' as const,
      title,
      message: notificationMessage,
      patient_id: patientId,
      patient_name: patientName,
      staff_id: staff.user_id,
      read: false,
      metadata: {
        drug_test_id: drugTestId,
        priority: (testStatus === 'missed' || notificationMessage.includes('missed')) ? 'high' : 'medium',
        test_status: testStatus,
        test_type: testType || 'random'
      }
    })) || [];

    if (notifications.length > 0) {
      const { error: insertError } = await (supabase as any)
        .from('staff_notifications')
        .insert(notifications);

      if (insertError) {
        console.error('Error creating drug test staff notifications:', insertError);
      } else {
        console.log(`Created ${notifications.length} staff notifications for drug test ${drugTestId}`);
      }
    }
  } catch (error) {
    console.error('Error in createDrugTestNotificationServer:', error);
  }
}

// Create notification for staff when patient creates appointment (server-side)
export async function createAppointmentNotificationServer(
  patientId: string,
  appointmentId: string,
  patientName: string,
  message: string,
  appointmentType?: string,
  provider?: string,
  isVirtual?: boolean
): Promise<void> {
  const supabase = await createClient();
  
  try {
    // Get all active staff members who should receive notifications and their preferences
    const { data: staffMembers, error: staffError } = await supabase
      .from('staff')
      .select('user_id, first_name, last_name, notification_preferences')
      .eq('active', true);

    if (staffError) {
      console.error('Error fetching staff members:', staffError);
      return;
    }

    // Filter staff by notification preferences - only create notifications for staff who have appointment_alerts enabled
    const eligibleStaff = staffMembers?.filter((staff: any) => {
      const prefs = staff.notification_preferences || {};
      return prefs.appointment_alerts !== false; // Default to true if not set
    }) || [];

    const title = isVirtual 
      ? `Virtual Appointment Request from ${patientName}`
      : `Appointment Request from ${patientName}`;

    // Create notifications for each eligible staff member
    const notifications = eligibleStaff.map((staff: any) => ({
      type: 'appointment' as const,
      title,
      message,
      patient_id: patientId,
      patient_name: patientName,
      staff_id: staff.user_id,
      read: false,
      metadata: {
        appointment_id: appointmentId,
        appointment_type: appointmentType,
        provider: provider,
        is_virtual: isVirtual || false,
        priority: 'medium'
      }
    })) || [];

    if (notifications.length > 0) {
      const { error: insertError } = await (supabase as any)
        .from('staff_notifications')
        .insert(notifications);

      if (insertError) {
        console.error('Error creating staff notifications for appointment:', insertError);
      } else {
        console.log(`Created ${notifications.length} staff notifications for appointment ${appointmentId}`);
      }
    }
  } catch (error) {
    console.error('Error in createAppointmentNotificationServer:', error);
  }
}

// Create notification for staff when new contact form/lead is submitted (server-side)
export async function createLeadNotificationServer(
  leadId: string,
  leadName: string,
  leadEmail: string,
  leadPhone: string | null,
  leadMessage: string,
  leadSubject: string | null,
  source: string
): Promise<void> {
  const supabase = await createClient();
  
  try {
    // Get all active staff members who should receive notifications and their preferences
    const { data: staffMembers, error: staffError } = await supabase
      .from('staff')
      .select('user_id, first_name, last_name, notification_preferences')
      .eq('active', true);

    if (staffError) {
      console.error('Error fetching staff members:', staffError);
      return;
    }

    // Filter staff by notification preferences - only create notifications for staff who have message_alerts enabled
    // For contact forms, we'll use message_alerts preference since it's similar
    const eligibleStaff = staffMembers?.filter((staff: any) => {
      const prefs = staff.notification_preferences || {};
      return prefs.message_alerts !== false; // Default to true if not set
    }) || [];

    // Format the message preview
    const messagePreview = leadMessage.length > 100 ? `${leadMessage.substring(0, 100)}...` : leadMessage;
    const contactInfo = leadPhone ? `Phone: ${leadPhone}` : `Email: ${leadEmail}`;
    const fullMessage = `${messagePreview}\n\nContact: ${contactInfo}${leadSubject ? `\nSubject: ${leadSubject}` : ''}\nSource: ${source}`;

    // Try to find if this email belongs to an existing patient
    let patientUserId: string | null = null;
    try {
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('user_id')
        .eq('email', leadEmail)
        .maybeSingle();
      
      patientUserId = existingPatient?.user_id || null;
    } catch (e) {
      // If we can't query, that's okay - we'll handle it below
      console.log('Could not query patients table for lead email:', leadEmail);
    }

    // Since patient_id has a foreign key constraint to auth.users, we need a valid user ID
    // If no existing patient found, we need a workaround. 
    // Best practice: Create a system user for leads, or make patient_id nullable in notifications
    // For now, we'll use a workaround: create notification with a valid UUID from staff
    // The metadata will clearly indicate this is a lead, not a patient message
    if (!patientUserId) {
      // Check if there's a system/placeholder user we can use
      // For now, we'll use the first eligible staff member's ID as a placeholder
      // This satisfies the foreign key constraint but the metadata clearly marks it as a lead
      if (eligibleStaff.length > 0) {
        // Note: This is a workaround. In production, consider:
        // 1. Creating a dedicated system user for leads
        // 2. Making patient_id nullable in staff_notifications
        // 3. Using a different notification mechanism for leads
        patientUserId = eligibleStaff[0].user_id;
        console.log(`Using staff user ${patientUserId} as placeholder for lead notification (lead: ${leadEmail})`);
      } else {
        console.warn('Cannot create notifications for lead - no staff members available');
        return;
      }
    }
    
    const notifications = eligibleStaff.map((staff: any) => ({
      type: 'message' as const, // Use 'message' type since 'lead' may not be in the constraint yet
      title: `New Contact Form Submission from ${leadName}`,
      message: fullMessage,
      patient_id: patientUserId!, // Use found user ID or fallback
      patient_name: leadName,
      staff_id: staff.user_id,
      read: false,
      metadata: {
        lead_id: leadId,
        lead_email: leadEmail,
        lead_phone: leadPhone,
        source: source,
        priority: 'medium',
        is_lead: true // Flag to indicate this is a lead, not a patient message
      }
    })) || [];

    if (notifications.length > 0) {
      const { error: insertError } = await (supabase as any)
        .from('staff_notifications')
        .insert(notifications);

      if (insertError) {
        console.error('Error creating staff notifications for lead:', insertError);
      } else {
        console.log(`Created ${notifications.length} staff notifications for lead ${leadId}`);
      }
    }
  } catch (error) {
    console.error('Error in createLeadNotificationServer:', error);
  }
}

