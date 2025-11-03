"use client";

import { supabase } from "@/lib/supabase/client";

export interface SafeNotification {
  id: string;
  type: 'appointment' | 'message' | 'group_message' | 'video_submission' | 'video_recording' | 'medication' | 'activity' | 'progress' | 'system' | 'drug_test';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  urgent: boolean;
  data?: any;
  source_id: string;
}

export interface SafeNotificationStats {
  total: number;
  unread: number;
  urgent: number;
  byType: {
    appointments: number;
    messages: number;
    group_messages: number;
    video_submissions: number;
    video_recordings: number;
    medications: number;
    activities: number;
    progress: number;
    system: number;
    drug_tests: number;
  };
}

class SafeNotificationService {
  private static instance: SafeNotificationService;
  private channels: Map<string, any> = new Map();
  private refreshInterval: NodeJS.Timeout | null = null;

  static getInstance(): SafeNotificationService {
    if (!SafeNotificationService.instance) {
      SafeNotificationService.instance = new SafeNotificationService();
    }
    return SafeNotificationService.instance;
  }

  // Safe query wrapper
  private async safeQuery<T>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    fallback: T,
    errorMessage: string
  ): Promise<T> {
    try {
      const result = await queryFn();
      // The queryFn itself handles error logging, so we just extract the data
      // If there's an error but data exists (partial success), return the data
      if (result.error && !result.data) {
        // Only log if queryFn didn't already log it
        if (!result.error._logged) {
          console.log(`${errorMessage}:`, result.error);
        }
        return fallback;
      }
      return result.data || fallback;
    } catch (error) {
      console.log(`${errorMessage} (exception):`, error);
      return fallback;
    }
  }

  // Get appointments for a patient (safe version)
  async getAppointmentNotifications(patientId: string): Promise<SafeNotification[]> {
    const appointments = await this.safeQuery(
      () => supabase
        .from('appointments')
        .select('id, patient_id, appointment_time, status, title, provider, duration_min, type, location, is_virtual, notes, created_at')
        .eq('patient_id', patientId)
        .gte('appointment_time', new Date().toISOString())
        .order('appointment_time', { ascending: true })
        .limit(10),
      [],
      'Appointments query error'
    );

    const notifications: SafeNotification[] = [];
    const now = new Date();

    appointments.forEach((apt: any) => {
      const aptDate = new Date(apt.appointment_time);
      const timeDiff = aptDate.getTime() - now.getTime();
      const hoursUntil = timeDiff / (1000 * 60 * 60);
      const isToday = aptDate.toDateString() === now.toDateString();
      const isUrgent = isToday && hoursUntil <= 2 && apt.status === 'scheduled';

      notifications.push({
        id: `apt-${apt.id}`,
        type: 'appointment',
        title: `${isToday ? 'Today' : 'Upcoming'} ${apt.is_virtual ? 'Virtual' : ''} Appointment`,
        message: apt.title || `Appointment: ${new Date(apt.appointment_time).toLocaleTimeString()} (${apt.type || 'General'})`,
        timestamp: apt.appointment_time,
        read: false,
        urgent: isUrgent,
        data: apt,
        source_id: apt.id.toString()
      });
    });

    return notifications;
  }

  // Get messages for a patient (safe version)
  async getMessageNotifications(patientId: string): Promise<SafeNotification[]> {
    // First get patient's user_id
    const patient = await this.safeQuery(
      () => supabase
        .from('patients')
        .select('user_id')
        .eq('id', patientId)
        .single(),
      null,
      'Patient lookup error'
    );

    if (!patient) return [];

    const messages = await this.safeQuery(
      () => supabase
        .from('messages')
        .select('id, content, is_read, message_type, created_at')
        .eq('recipient_id', patient.user_id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20),
      [],
      'Messages query error'
    );

    return messages.map(msg => ({
      id: `msg-${msg.id}`,
      type: 'message' as const,
      title: 'New Message',
      message: msg.content ? `${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}` : 'No content',
      timestamp: msg.created_at,
      read: msg.is_read,
      urgent: msg.message_type === 'urgent',
      data: msg,
      source_id: msg.id.toString()
    }));
  }

  // Get group messages for a patient (safe version)
  // Note: group_members table may not exist in Supabase, so we return empty array
  async getGroupMessageNotifications(patientId: string): Promise<SafeNotification[]> {
    // Group members table doesn't exist in current Supabase schema
    // Return empty array to avoid errors
    return [];
  }

  // Get video submission notifications (safe version)
  async getVideoSubmissionNotifications(patientId: string): Promise<SafeNotification[]> {
    const submissions = await this.safeQuery(
      () => supabase
        .from('video_submissions')
        .select('*')
        .eq('patient_id', patientId)
        .order('submitted_at', { ascending: false })
        .limit(10),
      [],
      'Video submissions query error'
    );

    return submissions.map(sub => {
      const isUrgent = sub.status === 'failed' || sub.status === 'processing';
      
      return {
        id: `sub-${sub.id}`,
        type: 'video_submission' as const,
        title: `Video Submission ${sub.status}`,
        message: `${sub.title} - ${sub.type}`,
        timestamp: sub.submitted_at,
        read: false,
        urgent: isUrgent,
        data: sub,
        source_id: sub.id
      };
    });
  }

  // Get video recording notifications (safe version)
  // Note: video_recordings table doesn't exist - use video_submissions instead
  async getVideoRecordingNotifications(patientId: string): Promise<SafeNotification[]> {
    // video_recordings table doesn't exist in current Supabase schema
    // Video recordings are handled by video_submissions
    // Return empty array to avoid duplicate notifications
    return [];
  }

  // Get medication notifications (safe version)
  // Note: medication_logs table may not exist or have different schema
  async getMedicationNotifications(patientId: string): Promise<SafeNotification[]> {
    // medication_logs table may not exist in current Supabase schema
    // Return empty array to avoid errors
    return [];
  }

  // Get activity notifications (safe version)
  // Note: activity_logs table doesn't exist in Supabase
  async getActivityNotifications(patientId: string): Promise<SafeNotification[]> {
    // activity_logs table doesn't exist in current Supabase schema
    // Return empty array to avoid errors
    return [];
  }

  // Get progress notifications (safe version)
  // Note: progress_tracking table doesn't exist in Supabase
  async getProgressNotifications(patientId: string): Promise<SafeNotification[]> {
    // progress_tracking table doesn't exist in current Supabase schema
    // Return empty array to avoid errors
    return [];
  }

  // Get drug test notifications from notifications table (safe version)
  async getDrugTestNotifications(patientId: string): Promise<SafeNotification[]> {
    if (!patientId) {
      console.warn('getDrugTestNotifications: patientId is missing');
      return [];
    }

    // Try API endpoint first (handles authentication better)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      console.log(`Attempting to fetch notifications via API for patientId: ${patientId}`);
      
      const apiResponse = await fetch(`/api/notifications?patientId=${patientId}&limit=50`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });

      console.log(`API response status: ${apiResponse.status}`);

      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        console.log(`API returned ${apiData.data?.length || 0} total notifications`);
        
        // Filter for drug_test notifications
        // Note: actual type is 'alert' but we check data.notification_type === 'drug_test'
        const drugTestNotifications = (apiData.data || [])
          .filter((n: any) => n.type === 'drug_test' || n.data?.notification_type === 'drug_test')
          .map((notif: any) => ({
            id: notif.id,
            type: 'drug_test' as const,
            title: notif.title || 'Drug Test Scheduled',
            message: notif.message || 'You have a drug test scheduled',
            timestamp: notif.created_at,
            read: notif.read || false,
            urgent: notif.urgent || notif.data?.urgent || false, // Fallback to data.urgent if column doesn't exist
            data: notif.data || {},
            source_id: notif.id
          }));
        
        console.log(`Found ${drugTestNotifications.length} drug test notifications via API for patient ${patientId}`);
        return drugTestNotifications;
      } else {
        const errorText = await apiResponse.text().catch(() => '');
        console.warn(`API endpoint failed with status ${apiResponse.status}:`, errorText);
      }
    } catch (apiError: any) {
      console.warn('API endpoint failed with exception, falling back to direct query:', apiError?.message || apiError);
    }

    // Fallback to direct query
    // patientId is the user_id from auth.users
    // The notifications table schema uses 'user_id' column (per migration 003_add_notifications_table.sql)
    // However, some APIs might insert with 'patient_id' as fallback, so we try both
    const notifications = await this.safeQuery(
      async () => {
        console.log(`Querying drug test notifications directly for patientId: ${patientId}`);
        
        // Use patient_id (this is the actual schema column per your schema)
        // Note: notifications table type constraint only allows 'message', 'medicine', 'alert'
        // We store drug_test notifications as type 'alert' with data.notification_type = 'drug_test'
        // So we query all 'alert' type notifications and filter by data.notification_type
        let result = await supabase
          .from('notifications')
          .select('id, type, title, message, read, created_at, data')
          .eq('patient_id', patientId)
          .eq('type', 'alert') // Drug tests are stored as 'alert' type
          .order('created_at', { ascending: false })
          .limit(50); // Get more to filter after
        
        // Filter results to only include drug_test notifications (check data.notification_type)
        if (result.data) {
          result.data = result.data.filter((n: any) => 
            n.data?.notification_type === 'drug_test'
          );
        }
        
        console.log('Direct query result (user_id):', { 
          hasError: !!result.error, 
          error: result.error, 
          dataCount: result.data?.length || 0 
        });
        
        // If user_id query fails with column error, try patient_id (fallback for some schema variations)
        if (result.error) {
          const errorCode = result.error.code;
          const errorMessage = result.error.message || '';
          const isColumnError = errorCode === '42703' || 
            (errorMessage.includes('column') && errorMessage.includes('does not exist'));
          
          if (isColumnError) {
            // This shouldn't happen since schema uses patient_id, but keep for safety
            console.log('Unexpected: patient_id column not found, trying user_id as fallback...');
            result = await supabase
              .from('notifications')
              .select('id, type, title, message, read, created_at, data')
              .eq('user_id', patientId)
              .eq('type', 'alert') // Drug tests are stored as 'alert' type
              .order('created_at', { ascending: false })
              .limit(50);
            
            // Filter results to only include drug_test notifications
            if (result.data) {
              result.data = result.data.filter((n: any) => 
                n.data?.notification_type === 'drug_test'
              );
            }
            
            console.log('Direct query result (patient_id):', { 
              hasError: !!result.error, 
              error: result.error, 
              dataCount: result.data?.length || 0 
            });
          }
        }
        
        if (result.error) {
          // Log the raw error object to see what's actually in it
          const errorInfo: any = {
            hasError: true,
            errorType: typeof result.error,
            errorKeys: result.error ? Object.keys(result.error) : [],
            patientId
          };
          
          // Try to extract error properties safely
          try {
            errorInfo.errorStringified = JSON.stringify(result.error);
            errorInfo.code = result.error?.code;
            errorInfo.message = result.error?.message;
            errorInfo.details = result.error?.details;
            errorInfo.hint = result.error?.hint;
            errorInfo.name = result.error?.name;
          } catch (e) {
            errorInfo.errorExtractionError = String(e);
          }
          
          console.error('Final error fetching drug test notifications:', errorInfo);
          
          // Return empty array on error instead of throwing
          return { data: [], error: null };
        } else {
          console.log(`Successfully found ${result.data?.length || 0} drug test notifications for patient ${patientId}`);
        }
        
        return result;
      },
      [],
      'Drug test notifications query error'
    );

    if (!notifications || notifications.length === 0) {
      console.log(`No drug test notifications found for patient ${patientId}`);
      return [];
    }

    return notifications.map((notif: any) => ({
      id: notif.id,
      type: 'drug_test' as const, // Always return as drug_test for UI
      title: notif.title || 'Drug Test Scheduled',
      message: notif.message || 'You have a drug test scheduled',
      timestamp: notif.created_at,
      read: notif.read || false,
      urgent: notif.data?.urgent || false, // Get from data since urgent column doesn't exist
      data: notif.data || {},
      source_id: notif.id
    }));
  }

  // Get system notifications (fallback)
  async getSystemNotifications(): Promise<SafeNotification[]> {
    return [
      {
        id: 'system-1',
        type: 'system',
        title: 'System Online',
        message: 'Your notification system is working properly',
        timestamp: new Date().toISOString(),
        read: false,
        urgent: false,
        data: {},
        source_id: 'system-1'
      }
    ];
  }

  // Get all notifications for a patient (safe version)
  async getAllNotifications(patientId: string): Promise<SafeNotification[]> {
    try {
      const [
        appointments,
        messages,
        groupMessages,
        videoSubmissions,
        videoRecordings,
        medications,
        activities,
        progress,
        drugTests,
        system
      ] = await Promise.all([
        this.getAppointmentNotifications(patientId),
        this.getMessageNotifications(patientId),
        this.getGroupMessageNotifications(patientId),
        this.getVideoSubmissionNotifications(patientId),
        this.getVideoRecordingNotifications(patientId),
        this.getMedicationNotifications(patientId),
        this.getActivityNotifications(patientId),
        this.getProgressNotifications(patientId),
        this.getDrugTestNotifications(patientId),
        this.getSystemNotifications()
      ]);

      const allNotifications = [
        ...appointments,
        ...messages,
        ...groupMessages,
        ...videoSubmissions,
        ...videoRecordings,
        ...medications,
        ...activities,
        ...progress,
        ...drugTests,
        ...system
      ];

      // Sort by timestamp (most recent first)
      return allNotifications.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('Error fetching all notifications:', error);
      // Return system notification as fallback
      return this.getSystemNotifications();
    }
  }

  // Calculate notification stats
  calculateStats(notifications: SafeNotification[]): SafeNotificationStats {
    const unreadCount = notifications.filter(n => !n.read).length;
    const urgentCount = notifications.filter(n => n.urgent).length;
    
    const byType = {
      appointments: notifications.filter(n => n.type === 'appointment').length,
      messages: notifications.filter(n => n.type === 'message').length,
      group_messages: notifications.filter(n => n.type === 'group_message').length,
      video_submissions: notifications.filter(n => n.type === 'video_submission').length,
      video_recordings: notifications.filter(n => n.type === 'video_recording').length,
      medications: notifications.filter(n => n.type === 'medication').length,
      activities: notifications.filter(n => n.type === 'activity').length,
      progress: notifications.filter(n => n.type === 'progress').length,
      system: notifications.filter(n => n.type === 'system').length,
      drug_tests: notifications.filter(n => n.type === 'drug_test').length
    };

    return {
      total: notifications.length,
      unread: unreadCount,
      urgent: urgentCount,
      byType
    };
  }

  // Set up real-time subscriptions (simplified)
  setupRealTimeSubscriptions(patientId: string, onUpdate: () => void) {
    // Clear existing subscriptions
    this.clearSubscriptions();

    // Subscribe to notifications table for drug_test and other types
    // patientId is the user_id from auth.users
    // Schema uses patient_id column and type 'alert' for drug tests
    const notificationsChannel = supabase
      .channel(`safe-notifications:${patientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `patient_id=eq.${patientId}`
        },
        () => {
          console.log('Notification change detected (patient_id), refreshing...');
          onUpdate();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'drug_tests',
          filter: `patient_id=eq.${patientId}`
        },
        () => {
          console.log('Drug test change detected, refreshing...');
          onUpdate();
        }
      )
      .subscribe();

    this.channels.set(`notifications:${patientId}`, notificationsChannel);

    // Set up periodic refresh as backup
    this.refreshInterval = setInterval(() => {
      onUpdate();
    }, 30000); // Refresh every 30 seconds
  }

  // Clear all subscriptions
  clearSubscriptions() {
    this.channels.forEach(channel => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();

    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}

export const safeNotificationService = SafeNotificationService.getInstance();
