"use client";

import { supabase } from "@/lib/supabase/client";

export interface DatabaseNotification {
  id: string;
  user_id: string;
  type: 'appointment' | 'chat' | 'submission' | 'group' | 'virtual_appointment' | 'google_calendar' | 'system';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  urgent: boolean;
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

export class DatabaseNotificationService {
  private static instance: DatabaseNotificationService;

  static getInstance(): DatabaseNotificationService {
    if (!DatabaseNotificationService.instance) {
      DatabaseNotificationService.instance = new DatabaseNotificationService();
    }
    return DatabaseNotificationService.instance;
  }

  // Create a new notification
  async createNotification(
    userId: string,
    type: DatabaseNotification['type'],
    title: string,
    message: string,
    data?: any,
    urgent: boolean = false,
    expiresAt?: Date
  ): Promise<string | null> {
    try {
      const { data: result, error } = await supabase
        .rpc('create_notification', {
          p_user_id: userId,
          p_type: type,
          p_title: title,
          p_message: message,
          p_data: data || null,
          p_urgent: urgent,
          p_expires_at: expiresAt?.toISOString() || null
        });

      if (error) {
        console.error('Error creating notification:', error);
        return null;
      }

      return result;
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  }

  // Get notifications for a user
  async getNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    unreadOnly: boolean = false
  ): Promise<DatabaseNotification[]> {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (unreadOnly) {
        query = query.eq('read', false);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  // Get unread notification count
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('get_unread_notification_count', {
          p_user_id: userId
        });

      if (error) {
        console.error('Error getting unread count:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('mark_notification_read', {
          p_notification_id: notificationId
        });

      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('mark_all_notifications_read', {
          p_user_id: userId
        });

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return 0;
    }
  }

  // Delete notification
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('Error deleting notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }

  // Clean up expired notifications
  async cleanupExpired(): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('cleanup_expired_notifications');

      if (error) {
        console.error('Error cleaning up expired notifications:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
      return 0;
    }
  }

  // Set up real-time subscription for notifications
  setupRealtimeSubscription(
    userId: string,
    onUpdate: (payload: any) => void
  ) {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        onUpdate
      )
      .subscribe();

    return channel;
  }

  // Create appointment notification
  async createAppointmentNotification(
    userId: string,
    appointment: any,
    isUrgent: boolean = false
  ): Promise<string | null> {
    const isToday = new Date(appointment.appointment_date).toDateString() === new Date().toDateString();
    const title = `${isToday ? 'Today' : 'Upcoming'} ${appointment.type === 'virtual' ? 'Virtual' : ''} Appointment`;
    const message = `${appointment.provider_name} - ${appointment.appointment_time} (${appointment.status})`;

    return this.createNotification(
      userId,
      appointment.type === 'virtual' ? 'virtual_appointment' : 'appointment',
      title,
      message,
      appointment,
      isUrgent
    );
  }

  // Create chat notification
  async createChatNotification(
    userId: string,
    message: any
  ): Promise<string | null> {
    return this.createNotification(
      userId,
      'chat',
      'New Message',
      `${message.sender_name}: ${message.content.substring(0, 100)}...`,
      message
    );
  }

  // Create submission notification
  async createSubmissionNotification(
    userId: string,
    submission: any
  ): Promise<string | null> {
    const isUrgent = submission.status === 'failed' || submission.status === 'processing';
    
    return this.createNotification(
      userId,
      'submission',
      `Video Submission ${submission.status}`,
      `${submission.title} - ${submission.type}`,
      submission,
      isUrgent
    );
  }

  // Create group notification
  async createGroupNotification(
    userId: string,
    message: any,
    groupName: string
  ): Promise<string | null> {
    return this.createNotification(
      userId,
      'group',
      `Group: ${groupName}`,
      `${message.sender_name}: ${message.content.substring(0, 100)}...`,
      { ...message, groupName }
    );
  }

  // Create Google Calendar notification
  async createGoogleCalendarNotification(
    userId: string,
    event: any
  ): Promise<string | null> {
    const startTime = new Date(event.start.dateTime || event.start.date || '');
    const isUrgent = (startTime.getTime() - new Date().getTime()) / (1000 * 60 * 60) <= 2;

    return this.createNotification(
      userId,
      'google_calendar',
      'Upcoming Google Calendar Event',
      `${event.summary} - ${startTime.toLocaleString()}`,
      event,
      isUrgent,
      new Date(startTime.getTime() + 24 * 60 * 60 * 1000) // Expire 24 hours after event
    );
  }

  // Create drug test notification
  async createDrugTestNotification(
    userId: string,
    drugTestId: string,
    message: string,
    scheduledFor?: string | null
  ): Promise<string | null> {
    const isUrgent = !scheduledFor; // Unscheduled tests are more urgent
    
    return this.createNotification(
      userId,
      'system', // Using 'system' type since 'drug_test' isn't in the type union
      'Random Drug Test Assigned',
      message,
      {
        drug_test_id: drugTestId,
        scheduled_for: scheduledFor,
        test_type: 'random'
      },
      isUrgent
    );
  }
}

export const databaseNotificationService = DatabaseNotificationService.getInstance();
