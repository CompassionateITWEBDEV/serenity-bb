"use client";

import { supabase } from "@/lib/supabase/client";

export interface RealNotification {
  id: string;
  type: 'appointment' | 'message' | 'group_message' | 'video_submission' | 'video_recording' | 'medication' | 'activity' | 'progress' | 'drug_test';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  urgent: boolean;
  data?: any;
  source_id: string; // ID from the source table
}

export interface NotificationStats {
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
    drug_tests?: number;
  };
}

class RealDataNotificationService {
  private static instance: RealDataNotificationService;
  private channels: Map<string, any> = new Map();
  private refreshInterval: NodeJS.Timeout | null = null;

  static getInstance(): RealDataNotificationService {
    if (!RealDataNotificationService.instance) {
      RealDataNotificationService.instance = new RealDataNotificationService();
    }
    return RealDataNotificationService.instance;
  }

  // Get appointments for a patient
  async getAppointmentNotifications(patientId: string): Promise<RealNotification[]> {
    try {
      // First, get the patient's user_id
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('user_id')
        .eq('id', patientId)
        .single();

      if (patientError || !patient) {
        console.log('Patient not found or error:', patientError);
        return [];
      }

      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_type,
          appointment_date,
          appointment_time,
          status,
          is_virtual,
          location,
          notes
        `)
        .eq('patient_id', patientId)
        .gte('appointment_date', new Date().toISOString().split('T')[0])
        .order('appointment_date', { ascending: true });

      if (error) {
        console.log('Appointments query error:', error);
        return [];
      }

      const notifications: RealNotification[] = [];
      const now = new Date();

      appointments?.forEach(apt => {
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
    } catch (error) {
      console.error('Error fetching appointment notifications:', error);
      return [];
    }
  }

  // Get messages for a patient
  async getMessageNotifications(patientId: string): Promise<RealNotification[]> {
    try {
      // Get patient's user_id first
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('user_id')
        .eq('id', patientId)
        .single();

      if (patientError || !patient) {
        console.log('Patient not found for messages:', patientError);
        return [];
      }

      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id,
          subject,
          content,
          is_read,
          message_type,
          created_at
        `)
        .eq('recipient_id', patient.user_id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.log('Messages query error:', error);
        return [];
      }

      const notifications: RealNotification[] = messages?.map(msg => ({
        id: `msg-${msg.id}`,
        type: 'message',
        title: msg.subject || 'New Message',
        message: `Staff: ${msg.content.substring(0, 100)}...`,
        timestamp: msg.created_at,
        read: msg.is_read,
        urgent: msg.message_type === 'urgent',
        data: msg,
        source_id: msg.id.toString()
      })) || [];

      return notifications;
    } catch (error) {
      console.error('Error fetching message notifications:', error);
      return [];
    }
  }

  // Get group messages for a patient
  async getGroupMessageNotifications(patientId: string): Promise<RealNotification[]> {
    try {
      // Get groups this patient is a member of
      const { data: userGroups, error: groupError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('patient_id', patientId);

      if (groupError || !userGroups?.length) {
        console.log('No groups found for patient:', groupError);
        return [];
      }

      const groupIds = userGroups.map(g => g.group_id);

      const { data: messages, error } = await supabase
        .from('group_messages')
        .select(`
          id,
          content,
          message_type,
          is_announcement,
          created_at
        `)
        .in('group_id', groupIds)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.log('Group messages query error:', error);
        return [];
      }

      const notifications: RealNotification[] = messages?.map(msg => ({
        id: `group-${msg.id}`,
        type: 'group_message',
        title: `Group Message`,
        message: `Member: ${msg.content.substring(0, 100)}...`,
        timestamp: msg.created_at,
        read: false,
        urgent: msg.is_announcement,
        data: msg,
        source_id: msg.id.toString()
      })) || [];

      return notifications;
    } catch (error) {
      console.error('Error fetching group message notifications:', error);
      return [];
    }
  }

  // Get video submission notifications
  async getVideoSubmissionNotifications(patientId: string): Promise<RealNotification[]> {
    try {
      const { data: submissions, error } = await supabase
        .from('video_submissions')
        .select('*')
        .eq('patient_id', patientId)
        .order('submitted_at', { ascending: false })
        .limit(10);

      if (error) {
        console.log('Video submissions query error:', error);
        return [];
      }

      const notifications: RealNotification[] = submissions?.map(sub => {
        const isUrgent = sub.status === 'failed' || sub.status === 'processing';
        
        return {
          id: `sub-${sub.id}`,
          type: 'video_submission',
          title: `Video Submission ${sub.status}`,
          message: `${sub.title} - ${sub.type}`,
          timestamp: sub.submitted_at,
          read: false,
          urgent: isUrgent,
          data: sub,
          source_id: sub.id
        };
      }) || [];

      return notifications;
    } catch (error) {
      console.error('Error fetching video submission notifications:', error);
      return [];
    }
  }

  // Get video recording notifications
  async getVideoRecordingNotifications(patientId: string): Promise<RealNotification[]> {
    try {
      const { data: recordings, error } = await supabase
        .from('video_recordings')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.log('Video recordings query error:', error);
        return [];
      }

      const notifications: RealNotification[] = recordings?.map(rec => ({
        id: `rec-${rec.id}`,
        type: 'video_recording',
        title: 'New Video Recording',
        message: `${rec.title} - ${rec.recording_type}`,
        timestamp: rec.created_at,
        read: false,
        urgent: false,
        data: rec,
        source_id: rec.id.toString()
      })) || [];

      return notifications;
    } catch (error) {
      console.error('Error fetching video recording notifications:', error);
      return [];
    }
  }

  // Get medication notifications
  async getMedicationNotifications(patientId: string): Promise<RealNotification[]> {
    try {
      const { data: medications, error } = await supabase
        .from('medication_logs')
        .select('*')
        .eq('patient_id', patientId)
        .gte('taken_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('taken_at', { ascending: false })
        .limit(10);

      if (error) {
        console.log('Medication logs query error:', error);
        return [];
      }

      const notifications: RealNotification[] = medications?.map(med => ({
        id: `med-${med.id}`,
        type: 'medication',
        title: 'Medication Logged',
        message: `${med.medication_name} - ${med.dosage} (${med.frequency})`,
        timestamp: med.taken_at,
        read: false,
        urgent: false,
        data: med,
        source_id: med.id.toString()
      })) || [];

      return notifications;
    } catch (error) {
      console.error('Error fetching medication notifications:', error);
      return [];
    }
  }

  // Get activity notifications
  async getActivityNotifications(patientId: string): Promise<RealNotification[]> {
    try {
      const { data: activities, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('patient_id', patientId)
        .gte('completed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('completed_at', { ascending: false })
        .limit(10);

      if (error) {
        console.log('Activity logs query error:', error);
        return [];
      }

      const notifications: RealNotification[] = activities?.map(act => ({
        id: `act-${act.id}`,
        type: 'activity',
        title: 'Activity Completed',
        message: `${act.activity_name} - ${act.duration_minutes} minutes`,
        timestamp: act.completed_at,
        read: false,
        urgent: false,
        data: act,
        source_id: act.id.toString()
      })) || [];

      return notifications;
    } catch (error) {
      console.error('Error fetching activity notifications:', error);
      return [];
    }
  }

  // Get progress notifications
  async getProgressNotifications(patientId: string): Promise<RealNotification[]> {
    try {
      const { data: progress, error } = await supabase
        .from('progress_tracking')
        .select('*')
        .eq('patient_id', patientId)
        .gte('recorded_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('recorded_date', { ascending: false })
        .limit(10);

      if (error) {
        console.log('Progress tracking query error:', error);
        return [];
      }

      const notifications: RealNotification[] = progress?.map(prog => ({
        id: `prog-${prog.id}`,
        type: 'progress',
        title: 'Progress Update',
        message: `${prog.metric_name}: ${prog.metric_value} ${prog.metric_unit || ''}`,
        timestamp: prog.recorded_date,
        read: false,
        urgent: false,
        data: prog,
        source_id: prog.id.toString()
      })) || [];

      return notifications;
    } catch (error) {
      console.error('Error fetching progress notifications:', error);
      return [];
    }
  }

  // Get drug test notifications
  async getDrugTestNotifications(patientId: string): Promise<RealNotification[]> {
    try {
      const { data: tests, error } = await supabase
        .from('random_drug_tests')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.log('Drug tests query error:', error);
        return [];
      }

      const notifications: RealNotification[] = tests?.map(test => ({
        id: `drug-${test.id}`,
        type: 'drug_test',
        title: test.status === 'completed' ? 'Drug Test Completed' : 'Drug Test Assigned',
        message: test.scheduled_for
          ? `Scheduled for ${new Date(test.scheduled_for).toLocaleString()}`
          : 'Please schedule your drug test.',
        timestamp: test.created_at,
        read: false,
        urgent: test.status === 'pending',
        data: test,
        source_id: test.id.toString()
      })) || [];

      return notifications;
    } catch (error) {
      console.error('Error fetching drug test notifications:', error);
      return [];
    }
  }

  // Get all notifications for a patient
  async getAllNotifications(patientId: string): Promise<RealNotification[]> {
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
        drugTests
      ] = await Promise.all([
        this.getAppointmentNotifications(patientId),
        this.getMessageNotifications(patientId),
        this.getGroupMessageNotifications(patientId),
        this.getVideoSubmissionNotifications(patientId),
        this.getVideoRecordingNotifications(patientId),
        this.getMedicationNotifications(patientId),
        this.getActivityNotifications(patientId),
        this.getProgressNotifications(patientId),
        this.getDrugTestNotifications(patientId)
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
        ...drugTests
      ];

      // Sort by timestamp (most recent first)
      return allNotifications.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('Error fetching all notifications:', error);
      return [];
    }
  }

  // Calculate notification stats
  calculateStats(notifications: RealNotification[]): NotificationStats {
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
      drug_tests: notifications.filter(n => n.type === 'drug_test').length
    };

    return {
      total: notifications.length,
      unread: unreadCount,
      urgent: urgentCount,
      byType
    };
  }

  // Set up real-time subscriptions
  setupRealTimeSubscriptions(patientId: string, onUpdate: () => void) {
    // Clear existing subscriptions
    this.clearSubscriptions();

    const channels = [
      // Appointments
      supabase
        .channel(`real-appointments:${patientId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `patient_id=eq.${patientId}`
        }, () => onUpdate()),
      
      // Messages
      supabase
        .channel(`real-messages:${patientId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'messages'
        }, () => onUpdate()),
      
      // Group messages
      supabase
        .channel(`real-group-messages:${patientId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'group_messages'
        }, () => onUpdate()),
      
      // Video submissions
      supabase
        .channel(`real-video-submissions:${patientId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'video_submissions',
          filter: `patient_id=eq.${patientId}`
        }, () => onUpdate()),
      
      // Video recordings
      supabase
        .channel(`real-video-recordings:${patientId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'video_recordings',
          filter: `patient_id=eq.${patientId}`
        }, () => onUpdate()),
      
      // Medication logs
      supabase
        .channel(`real-medications:${patientId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'medication_logs',
          filter: `patient_id=eq.${patientId}`
        }, () => onUpdate()),
      
      // Activity logs
      supabase
        .channel(`real-activities:${patientId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'activity_logs',
          filter: `patient_id=eq.${patientId}`
        }, () => onUpdate()),
      
      // Progress tracking
      supabase
        .channel(`real-progress:${patientId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'progress_tracking',
          filter: `patient_id=eq.${patientId}`
        }, () => onUpdate()),

      // Drug tests
      supabase
        .channel(`real-drug-tests:${patientId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'random_drug_tests',
          filter: `patient_id=eq.${patientId}`
        }, () => onUpdate())
    ];

    // Subscribe to all channels
    channels.forEach(channel => {
      channel.subscribe();
      this.channels.set(channel.topic, channel);
    });

    // Set up periodic refresh
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

export const realDataNotificationService = RealDataNotificationService.getInstance();
