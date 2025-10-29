"use client";

import { supabase } from "@/lib/supabase/client";
import { databaseNotificationService, DatabaseNotification } from "./database-notifications";

export interface NotificationData {
  id: string;
  type: 'appointment' | 'chat' | 'submission' | 'group' | 'virtual_appointment' | 'google_calendar' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  urgent: boolean;
  data?: any;
  userId: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  description?: string;
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus: string;
  }>;
}

class RealTimeNotificationService {
  private static instance: RealTimeNotificationService;
  private channels: Map<string, any> = new Map();
  private refreshInterval: NodeJS.Timeout | null = null;

  static getInstance(): RealTimeNotificationService {
    if (!RealTimeNotificationService.instance) {
      RealTimeNotificationService.instance = new RealTimeNotificationService();
    }
    return RealTimeNotificationService.instance;
  }

  // Google Calendar Integration
  async getGoogleCalendarEvents(userId: string): Promise<GoogleCalendarEvent[]> {
    try {
      // This would integrate with Google Calendar API
      // For now, we'll return mock data
      const mockEvents: GoogleCalendarEvent[] = [
        {
          id: 'google-1',
          summary: 'Therapy Session',
          start: {
            dateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
          },
          end: {
            dateTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
          },
          description: 'Weekly therapy session with Dr. Smith',
          location: 'Virtual Meeting Room',
          attendees: [
            {
              email: 'patient@example.com',
              displayName: 'Patient',
              responseStatus: 'accepted'
            }
          ]
        }
      ];

      return mockEvents;
    } catch (error) {
      console.error('Error fetching Google Calendar events:', error);
      return [];
    }
  }

  // Convert Google Calendar events to notifications
  async processGoogleCalendarEvents(userId: string): Promise<NotificationData[]> {
    const events = await this.getGoogleCalendarEvents(userId);
    const notifications: NotificationData[] = [];

    events.forEach(event => {
      const startTime = new Date(event.start.dateTime || event.start.date || '');
      const now = new Date();
      const timeDiff = startTime.getTime() - now.getTime();
      const hoursUntil = timeDiff / (1000 * 60 * 60);

      // Create notifications for upcoming events
      if (hoursUntil > 0 && hoursUntil <= 24) {
        const isUrgent = hoursUntil <= 2; // Urgent if within 2 hours
        
        notifications.push({
          id: `google-${event.id}`,
          type: 'google_calendar',
          title: 'Upcoming Google Calendar Event',
          message: `${event.summary} - ${startTime.toLocaleString()}`,
          timestamp: startTime.toISOString(),
          read: false,
          urgent: isUrgent,
          data: event,
          userId
        });
      }
    });

    return notifications;
  }

  // Get appointment notifications
  async getAppointmentNotifications(userId: string): Promise<NotificationData[]> {
    try {
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', userId)
        .gte('appointment_date', new Date().toISOString().split('T')[0])
        .order('appointment_date', { ascending: true });

      if (error) throw error;

      const notifications: NotificationData[] = [];
      const now = new Date();

      appointments?.forEach(apt => {
        const aptDate = new Date(`${apt.appointment_date}T${apt.appointment_time}`);
        const timeDiff = aptDate.getTime() - now.getTime();
        const hoursUntil = timeDiff / (1000 * 60 * 60);
        const isToday = aptDate.toDateString() === now.toDateString();
        const isUrgent = isToday && hoursUntil <= 2;

        notifications.push({
          id: `apt-${apt.id}`,
          type: apt.type === 'virtual' ? 'virtual_appointment' : 'appointment',
          title: `${isToday ? 'Today' : 'Upcoming'} ${apt.type === 'virtual' ? 'Virtual' : ''} Appointment`,
          message: `${apt.provider_name} - ${apt.appointment_time} (${apt.status})`,
          timestamp: apt.appointment_date,
          read: false,
          urgent: isUrgent,
          data: apt,
          userId
        });
      });

      return notifications;
    } catch (error) {
      console.error('Error fetching appointment notifications:', error);
      return [];
    }
  }

  // Get chat notifications
  async getChatNotifications(userId: string): Promise<NotificationData[]> {
    try {
      // Get conversations for this user
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('patient_id', userId);

      if (!conversations?.length) return [];

      const conversationIds = conversations.map(c => c.id);

      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', conversationIds)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const notifications: NotificationData[] = messages?.map(msg => ({
        id: `chat-${msg.id}`,
        type: 'chat',
        title: 'New Message',
        message: `${msg.sender_name}: ${msg.content.substring(0, 50)}...`,
        timestamp: msg.created_at,
        read: msg.read,
        urgent: false,
        data: msg,
        userId
      })) || [];

      return notifications;
    } catch (error) {
      console.error('Error fetching chat notifications:', error);
      return [];
    }
  }

  // Get submission notifications
  async getSubmissionNotifications(userId: string): Promise<NotificationData[]> {
    try {
      const { data: submissions, error } = await supabase
        .from('video_submissions')
        .select('*')
        .eq('patient_id', userId)
        .order('submitted_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const notifications: NotificationData[] = submissions?.map(sub => {
        const isUrgent = sub.status === 'failed' || sub.status === 'processing';
        
        return {
          id: `sub-${sub.id}`,
          type: 'submission',
          title: `Video Submission ${sub.status}`,
          message: `${sub.title} - ${sub.type}`,
          timestamp: sub.submitted_at,
          read: false,
          urgent: isUrgent,
          data: sub,
          userId
        };
      }) || [];

      return notifications;
    } catch (error) {
      console.error('Error fetching submission notifications:', error);
      return [];
    }
  }

  // Get group notifications
  async getGroupNotifications(userId: string): Promise<NotificationData[]> {
    try {
      // Get groups this user is a member of
      const { data: userGroups } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);

      if (!userGroups?.length) return [];

      const groupIds = userGroups.map(g => g.group_id);

      const { data: messages, error } = await supabase
        .from('group_messages')
        .select('*, group:groups(name)')
        .in('group_id', groupIds)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const notifications: NotificationData[] = messages?.map(msg => ({
        id: `group-${msg.id}`,
        type: 'group',
        title: `Group: ${msg.group?.name || 'Unknown'}`,
        message: `${msg.sender_name}: ${msg.content.substring(0, 50)}...`,
        timestamp: msg.created_at,
        read: false,
        urgent: false,
        data: msg,
        userId
      })) || [];

      return notifications;
    } catch (error) {
      console.error('Error fetching group notifications:', error);
      return [];
    }
  }

  // Get all notifications for a user
  async getAllNotifications(userId: string): Promise<NotificationData[]> {
    try {
      // First, try to get from database
      const dbNotifications = await databaseNotificationService.getNotifications(userId, 100);
      
      if (dbNotifications.length > 0) {
        // Convert database notifications to our format
        return dbNotifications.map(notif => ({
          id: notif.id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          timestamp: notif.created_at,
          read: notif.read,
          urgent: notif.urgent,
          data: notif.data,
          userId: notif.user_id
        }));
      }

      // Fallback to real-time generation if no database notifications
      const [
        appointments,
        chats,
        submissions,
        groups,
        googleCalendar
      ] = await Promise.all([
        this.getAppointmentNotifications(userId),
        this.getChatNotifications(userId),
        this.getSubmissionNotifications(userId),
        this.getGroupNotifications(userId),
        this.processGoogleCalendarEvents(userId)
      ]);

      const allNotifications = [
        ...appointments,
        ...chats,
        ...submissions,
        ...groups,
        ...googleCalendar
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

  // Set up real-time subscriptions
  setupRealTimeSubscriptions(userId: string, onUpdate: () => void) {
    // Clear existing subscriptions
    this.clearSubscriptions();

    // Set up database notification subscription
    const dbChannel = databaseNotificationService.setupRealtimeSubscription(userId, onUpdate);
    this.channels.set(`notifications:${userId}`, dbChannel);

    // Set up source table subscriptions for creating notifications
    const channels = [
      // Appointments
      supabase
        .channel(`notifications-appointments:${userId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `patient_id=eq.${userId}`
        }, async (payload) => {
          // Create notification for appointment changes
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const appointment = payload.new;
            const isToday = new Date(appointment.appointment_date).toDateString() === new Date().toDateString();
            const isUrgent = isToday && appointment.status === 'confirmed';
            
            await databaseNotificationService.createAppointmentNotification(
              userId,
              appointment,
              isUrgent
            );
          }
          onUpdate();
        }),
      
      // Messages
      supabase
        .channel(`notifications-messages:${userId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        }, async (payload) => {
          // Create notification for new messages
          const message = payload.new;
          await databaseNotificationService.createChatNotification(userId, message);
          onUpdate();
        }),
      
      // Video submissions
      supabase
        .channel(`notifications-submissions:${userId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'video_submissions',
          filter: `patient_id=eq.${userId}`
        }, async (payload) => {
          // Create notification for submission changes
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const submission = payload.new;
            await databaseNotificationService.createSubmissionNotification(userId, submission);
          }
          onUpdate();
        }),
      
      // Drug tests
      supabase
        .channel(`notifications-drug-tests:${userId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'random_drug_tests',
          filter: `patient_id=eq.${userId}`
        }, async (payload) => {
          // Create notification for new drug test
          const drugTest = payload.new;
          const scheduledDate = drugTest.scheduled_for 
            ? new Date(drugTest.scheduled_for).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long', 
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            : "as soon as possible";

          const message = drugTest.scheduled_for
            ? `A random drug test has been scheduled for you on ${scheduledDate}. Please be prepared to take the test at the scheduled time.`
            : `A random drug test has been assigned to you. Please contact the facility to schedule your test.`;

          await databaseNotificationService.createDrugTestNotification(
            userId,
            drugTest.id,
            message,
            drugTest.scheduled_for
          );
          onUpdate();
        }),
      
      // Group messages
      supabase
        .channel(`notifications-groups:${userId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages'
        }, async (payload) => {
          // Create notification for new group messages
          const message = payload.new;
          // Get group name
          const { data: group } = await supabase
            .from('groups')
            .select('name')
            .eq('id', message.group_id)
            .single();
          
          await databaseNotificationService.createGroupNotification(
            userId,
            message,
            group?.name || 'Unknown Group'
          );
          onUpdate();
        })
    ];

    // Subscribe to all channels
    channels.forEach(channel => {
      channel.subscribe();
      this.channels.set(channel.topic, channel);
    });

    // Set up periodic refresh for external sources (Google Calendar, etc.)
    this.refreshInterval = setInterval(async () => {
      // Process Google Calendar events
      const googleEvents = await this.processGoogleCalendarEvents(userId);
      for (const event of googleEvents) {
        await databaseNotificationService.createGoogleCalendarNotification(userId, event.data);
      }
      onUpdate();
    }, 60000); // Refresh every minute
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

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string) {
    try {
      await databaseNotificationService.markAsRead(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId: string) {
    try {
      await databaseNotificationService.markAllAsRead(userId);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }
}

export const notificationService = RealTimeNotificationService.getInstance();
