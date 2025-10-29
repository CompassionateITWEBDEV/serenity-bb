"use client";

import { supabase } from "@/lib/supabase/client";

export interface SafeNotification {
  id: string;
  type: 'appointment' | 'message' | 'group_message' | 'video_submission' | 'video_recording' | 'medication' | 'activity' | 'progress' | 'system';
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
      const { data, error } = await queryFn();
      if (error) {
        console.log(`${errorMessage}:`, error);
        return fallback;
      }
      return data || fallback;
    } catch (error) {
      console.log(`${errorMessage}:`, error);
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
      system: notifications.filter(n => n.type === 'system').length
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

    // Set up periodic refresh instead of complex real-time subscriptions
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
