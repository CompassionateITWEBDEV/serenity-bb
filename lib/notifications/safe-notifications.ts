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
      async () => await supabase
        .from('appointments')
        .select('id, appointment_type, appointment_date, appointment_time, status, is_virtual, location, notes')
        .eq('patient_id', patientId)
        .gte('appointment_date', new Date().toISOString().split('T')[0])
        .order('appointment_date', { ascending: true })
        .limit(10),
      [],
      'Appointments query error'
    );

    const notifications: SafeNotification[] = [];
    const now = new Date();

    appointments.forEach(apt => {
      const aptDate = new Date(`${apt.appointment_date}T${apt.appointment_time}`);
      const timeDiff = aptDate.getTime() - now.getTime();
      const hoursUntil = timeDiff / (1000 * 60 * 60);
      const isToday = aptDate.toDateString() === now.toDateString();
      const isUrgent = isToday && hoursUntil <= 2 && apt.status === 'scheduled';

      notifications.push({
        id: `apt-${apt.id}`,
        type: 'appointment',
        title: `${isToday ? 'Today' : 'Upcoming'} ${apt.is_virtual ? 'Virtual' : ''} Appointment`,
        message: `Staff: ${apt.appointment_time} (${apt.appointment_type})`,
        timestamp: apt.appointment_date,
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
      async () => await supabase
        .from('patients')
        .select('user_id')
        .eq('id', patientId)
        .single(),
      null,
      'Patient lookup error'
    );

    if (!patient) return [];

    const messages = await this.safeQuery(
      async () => await supabase
        .from('messages')
        .select('id, subject, content, is_read, message_type, created_at')
        .eq('recipient_id', (patient as any).user_id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20),
      [],
      'Messages query error'
    );

    return messages.map(msg => ({
      id: `msg-${msg.id}`,
      type: 'message' as const,
      title: msg.subject || 'New Message',
      message: `Staff: ${msg.content.substring(0, 100)}...`,
      timestamp: msg.created_at,
      read: msg.is_read,
      urgent: msg.message_type === 'urgent',
      data: msg,
      source_id: msg.id.toString()
    }));
  }

  // Get group messages for a patient (safe version)
  async getGroupMessageNotifications(patientId: string): Promise<SafeNotification[]> {
    const userGroups = await this.safeQuery(
      async () => await supabase
        .from('group_members')
        .select('group_id')
        .eq('patient_id', patientId),
      [],
      'Group members query error'
    );

    if (!userGroups.length) return [];

    const groupIds = userGroups.map(g => g.group_id);

    const messages = await this.safeQuery(
      async () => await supabase
        .from('group_messages')
        .select('id, content, message_type, is_announcement, created_at')
        .in('group_id', groupIds)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(20),
      [],
      'Group messages query error'
    );

    return messages.map(msg => ({
      id: `group-${msg.id}`,
      type: 'group_message' as const,
      title: 'Group Message',
      message: `Member: ${msg.content.substring(0, 100)}...`,
      timestamp: msg.created_at,
      read: false,
      urgent: msg.is_announcement,
      data: msg,
      source_id: msg.id.toString()
    }));
  }

  // Get video submission notifications (safe version)
  async getVideoSubmissionNotifications(patientId: string): Promise<SafeNotification[]> {
    const submissions = await this.safeQuery(
      async () => await supabase
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
  async getVideoRecordingNotifications(patientId: string): Promise<SafeNotification[]> {
    const recordings = await this.safeQuery(
      async () => await supabase
        .from('video_recordings')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(10),
      [],
      'Video recordings query error'
    );

    return recordings.map(rec => ({
      id: `rec-${rec.id}`,
      type: 'video_recording' as const,
      title: 'New Video Recording',
      message: `${rec.title} - ${rec.recording_type}`,
      timestamp: rec.created_at,
      read: false,
      urgent: false,
      data: rec,
      source_id: rec.id.toString()
    }));
  }

  // Get medication notifications (safe version)
  async getMedicationNotifications(patientId: string): Promise<SafeNotification[]> {
    const medications = await this.safeQuery(
      async () => await supabase
        .from('medication_logs')
        .select('*')
        .eq('patient_id', patientId)
        .gte('taken_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('taken_at', { ascending: false })
        .limit(10),
      [],
      'Medication logs query error'
    );

    return medications.map(med => ({
      id: `med-${med.id}`,
      type: 'medication' as const,
      title: 'Medication Logged',
      message: `${med.medication_name} - ${med.dosage} (${med.frequency})`,
      timestamp: med.taken_at,
      read: false,
      urgent: false,
      data: med,
      source_id: med.id.toString()
    }));
  }

  // Get activity notifications (safe version)
  async getActivityNotifications(patientId: string): Promise<SafeNotification[]> {
    const activities = await this.safeQuery(
      async () => await supabase
        .from('activity_logs')
        .select('*')
        .eq('patient_id', patientId)
        .gte('completed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('completed_at', { ascending: false })
        .limit(10),
      [],
      'Activity logs query error'
    );

    return activities.map(act => ({
      id: `act-${act.id}`,
      type: 'activity' as const,
      title: 'Activity Completed',
      message: `${act.activity_name} - ${act.duration_minutes} minutes`,
      timestamp: act.completed_at,
      read: false,
      urgent: false,
      data: act,
      source_id: act.id.toString()
    }));
  }

  // Get progress notifications (safe version)
  async getProgressNotifications(patientId: string): Promise<SafeNotification[]> {
    const progress = await this.safeQuery(
      async () => await supabase
        .from('progress_tracking')
        .select('*')
        .eq('patient_id', patientId)
        .gte('recorded_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('recorded_date', { ascending: false })
        .limit(10),
      [],
      'Progress tracking query error'
    );

    return progress.map(prog => ({
      id: `prog-${prog.id}`,
      type: 'progress' as const,
      title: 'Progress Update',
      message: `${prog.metric_name}: ${prog.metric_value} ${prog.metric_unit || ''}`,
      timestamp: prog.recorded_date,
      read: false,
      urgent: false,
      data: prog,
      source_id: prog.id.toString()
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
