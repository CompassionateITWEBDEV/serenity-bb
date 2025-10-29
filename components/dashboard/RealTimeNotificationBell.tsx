"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, Loader2, Calendar, MessageSquare, Users, FileText, Clock, AlertTriangle, CheckCircle, XCircle, Video, Phone, TestTube2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger,
  DropdownMenuHeader,
  DropdownMenuSeparator,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";

interface Notification {
  id: string;
  type: 'appointment' | 'chat' | 'submission' | 'group' | 'virtual_appointment' | 'google_calendar' | 'system' | 'drug_test';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  urgent: boolean;
  data?: any;
}

interface NotificationStats {
  total: number;
  unread: number;
  urgent: number;
  byType: {
    appointments: number;
    chats: number;
    submissions: number;
    groups: number;
    virtual_appointments: number;
    google_calendar: number;
  };
}

export default function RealTimeNotificationBell() {
  const router = useRouter();
  const { patient, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    urgent: 0,
    byType: {
      appointments: 0,
      chats: 0,
      submissions: 0,
      groups: 0,
      virtual_appointments: 0,
      google_calendar: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load notifications and stats
  const loadNotifications = useCallback(async () => {
    if (!patient?.id) return;

    try {
      setLoading(true);
      
      // Load notifications from multiple sources
      const [
        appointmentNotifications,
        chatNotifications,
        submissionNotifications,
        groupNotifications,
        virtualAppointmentNotifications,
        googleCalendarNotifications
      ] = await Promise.all([
        // Appointment notifications
        supabase
          .from('appointments')
          .select('id, patient_id, appointment_date, appointment_time, status, type, provider_name')
          .eq('patient_id', patient.id)
          .gte('appointment_date', new Date().toISOString().split('T')[0])
          .order('appointment_date', { ascending: true })
          .limit(10),
        
        // Chat notifications (unread messages)
        supabase
          .from('messages')
          .select('id, conversation_id, sender_name, content, created_at, read')
          .eq('conversation_id', supabase
            .from('conversations')
            .select('id')
            .eq('patient_id', patient.id)
          )
          .eq('read', false)
          .order('created_at', { ascending: false })
          .limit(10),
        
        // Submission notifications
        supabase
          .from('video_submissions')
          .select('id, title, status, submitted_at, type')
          .eq('patient_id', patient.id)
          .order('submitted_at', { ascending: false })
          .limit(10),
        
        // Group notifications
        supabase
          .from('group_messages')
          .select('id, group_id, sender_name, content, created_at, group:groups(name)')
          .eq('group_id', supabase
            .from('group_members')
            .select('group_id')
            .eq('user_id', patient.id)
          )
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(10),
        
        // Virtual appointment notifications
        supabase
          .from('appointments')
          .select('id, patient_id, appointment_date, appointment_time, type, provider_name, status')
          .eq('patient_id', patient.id)
          .eq('type', 'virtual')
          .gte('appointment_date', new Date().toISOString().split('T')[0])
          .order('appointment_date', { ascending: true })
          .limit(10),
        
        // Google Calendar integration (mock for now)
        Promise.resolve({ data: [], error: null })
      ]);

      // Process notifications
      const allNotifications: Notification[] = [];

      // Process appointment notifications
      if (appointmentNotifications.data) {
        appointmentNotifications.data.forEach(apt => {
          const isToday = new Date(apt.appointment_date).toDateString() === new Date().toDateString();
          const isUrgent = isToday && apt.status === 'confirmed';
          
          allNotifications.push({
            id: `apt-${apt.id}`,
            type: 'appointment',
            title: `Appointment ${isToday ? 'Today' : 'Upcoming'}`,
            message: `${apt.provider_name} - ${apt.appointment_time} (${apt.type})`,
            timestamp: apt.appointment_date,
            read: false,
            urgent: isUrgent,
            data: apt
          });
        });
      }

      // Process chat notifications
      if (chatNotifications.data) {
        chatNotifications.data.forEach(msg => {
          allNotifications.push({
            id: `chat-${msg.id}`,
            type: 'chat',
            title: 'New Message',
            message: `${msg.sender_name}: ${msg.content.substring(0, 50)}...`,
            timestamp: msg.created_at,
            read: msg.read,
            urgent: false,
            data: msg
          });
        });
      }

      // Process submission notifications
      if (submissionNotifications.data) {
        submissionNotifications.data.forEach(sub => {
          const isUrgent = sub.status === 'failed' || sub.status === 'processing';
          allNotifications.push({
            id: `sub-${sub.id}`,
            type: 'submission',
            title: `Video Submission ${sub.status}`,
            message: `${sub.title} - ${sub.type}`,
            timestamp: sub.submitted_at,
            read: false,
            urgent: isUrgent,
            data: sub
          });
        });
      }

      // Process group notifications
      if (groupNotifications.data) {
        groupNotifications.data.forEach(msg => {
          allNotifications.push({
            id: `group-${msg.id}`,
            type: 'group',
            title: `Group: ${msg.group?.name || 'Unknown'}`,
            message: `${msg.sender_name}: ${msg.content.substring(0, 50)}...`,
            timestamp: msg.created_at,
            read: false,
            urgent: false,
            data: msg
          });
        });
      }

      // Process virtual appointment notifications
      if (virtualAppointmentNotifications.data) {
        virtualAppointmentNotifications.data.forEach(apt => {
          const isToday = new Date(apt.appointment_date).toDateString() === new Date().toDateString();
          const isUrgent = isToday && apt.status === 'confirmed';
          
          allNotifications.push({
            id: `virtual-${apt.id}`,
            type: 'virtual_appointment',
            title: `Virtual Appointment ${isToday ? 'Today' : 'Upcoming'}`,
            message: `${apt.provider_name} - ${apt.appointment_time}`,
            timestamp: apt.appointment_date,
            read: false,
            urgent: isUrgent,
            data: apt
          });
        });
      }

      // Sort by timestamp (most recent first)
      allNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setNotifications(allNotifications);

      // Calculate stats
      const unreadCount = allNotifications.filter(n => !n.read).length;
      const urgentCount = allNotifications.filter(n => n.urgent).length;
      
      const byType = {
        appointments: allNotifications.filter(n => n.type === 'appointment').length,
        chats: allNotifications.filter(n => n.type === 'chat').length,
        submissions: allNotifications.filter(n => n.type === 'submission').length,
        groups: allNotifications.filter(n => n.type === 'group').length,
        virtual_appointments: allNotifications.filter(n => n.type === 'virtual_appointment').length,
        google_calendar: allNotifications.filter(n => n.type === 'google_calendar').length
      };

      setStats({
        total: allNotifications.length,
        unread: unreadCount,
        urgent: urgentCount,
        byType
      });

      setConnectionStatus('connected');
    } catch (error) {
      console.error('Error loading notifications:', error);
      setConnectionStatus('disconnected');
    } finally {
      setLoading(false);
    }
  }, [patient?.id]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!patient?.id || !isAuthenticated) return;

    // Load initial notifications
    loadNotifications();

    // Set up real-time subscriptions
    const channels = [
      // Appointments
      supabase
        .channel(`appointments:${patient.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `patient_id=eq.${patient.id}`
        }, () => loadNotifications()),
      
      // Messages
      supabase
        .channel(`messages:${patient.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'messages'
        }, () => loadNotifications()),
      
      // Video submissions
      supabase
        .channel(`submissions:${patient.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'video_submissions',
          filter: `patient_id=eq.${patient.id}`
        }, () => loadNotifications()),
      
      // Drug tests
      supabase
        .channel(`drug_tests:${patient.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'random_drug_tests',
          filter: `patient_id=eq.${patient.id}`
        }, () => loadNotifications()),
      
      // Group messages
      supabase
        .channel(`group_messages:${patient.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'group_messages'
        }, () => loadNotifications())
    ];

    // Subscribe to all channels
    channels.forEach(channel => channel.subscribe());

    // Set up periodic refresh for Google Calendar and other external sources
    refreshIntervalRef.current = setInterval(() => {
      loadNotifications();
    }, 60000); // Refresh every minute

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [patient?.id, isAuthenticated, loadNotifications]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment': return <Calendar className="h-4 w-4" />;
      case 'chat': return <MessageSquare className="h-4 w-4" />;
      case 'submission': return <FileText className="h-4 w-4" />;
      case 'group': return <Users className="h-4 w-4" />;
      case 'virtual_appointment': return <Video className="h-4 w-4" />;
      case 'google_calendar': return <Calendar className="h-4 w-4" />;
      case 'drug_test': return <TestTube2 className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string, urgent: boolean) => {
    if (urgent) return 'text-red-600 bg-red-50 border-red-200';
    
    switch (type) {
      case 'appointment': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'chat': return 'text-green-600 bg-green-50 border-green-200';
      case 'submission': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'group': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'virtual_appointment': return 'text-indigo-600 bg-indigo-50 border-indigo-200';
      case 'google_calendar': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'drug_test': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const markAsRead = async (notificationId: string) => {
    // Update local state
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    
    // Update stats
    setStats(prev => ({
      ...prev,
      unread: Math.max(0, prev.unread - 1)
    }));
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setStats(prev => ({ ...prev, unread: 0 }));
  };

  if (!isAuthenticated) return null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-10 w-10 rounded-full"
        >
          <Bell className="h-5 w-5" />
          {stats.unread > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white animate-pulse"
            >
              {stats.unread > 99 ? '99+' : stats.unread}
            </Badge>
          )}
          {stats.urgent > 0 && (
            <div className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-ping" />
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-96 max-h-[500px] overflow-y-auto"
        sideOffset={5}
      >
        <DropdownMenuHeader className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-lg">Notifications</h4>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
                {connectionStatus === 'connected' ? 'Live' : 'Offline'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {stats.unread > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {stats.unread} unread
                </Badge>
              )}
              {stats.urgent > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {stats.urgent} urgent
                </Badge>
              )}
            </div>
          </div>
        </DropdownMenuHeader>
        
        <DropdownMenuSeparator />
        
        {/* Stats Overview */}
        <div className="px-4 py-2 bg-gray-50">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-blue-500" />
              <span>{stats.byType.appointments} appointments</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3 text-green-500" />
              <span>{stats.byType.chats} messages</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3 text-purple-500" />
              <span>{stats.byType.submissions} submissions</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-orange-500" />
              <span>{stats.byType.groups} groups</span>
            </div>
          </div>
        </div>
        
        <DropdownMenuSeparator />
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2 text-sm text-gray-500">Loading notifications...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No notifications</p>
            <p className="text-sm text-gray-400">You're all caught up!</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => {
              const handleClick = () => {
                markAsRead(notification.id);
                if (notification.type === 'drug_test') {
                  router.push('/dashboard/drug-tests');
                } else if (notification.type === 'appointment') {
                  router.push('/dashboard/appointments');
                } else if (notification.type === 'message') {
                  router.push('/dashboard/messages');
                }
              };
              
              return (
              <div
                key={notification.id}
                className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
                onClick={handleClick}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${getNotificationColor(notification.type, notification.urgent)}`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-medium text-sm truncate">{notification.title}</h5>
                      {notification.urgent && (
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                      )}
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatTime(notification.timestamp)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={markAllAsRead}
                disabled={stats.unread === 0}
              >
                Mark all as read
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
