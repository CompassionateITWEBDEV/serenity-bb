"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Loader2, Calendar, MessageSquare, Users, FileText, AlertTriangle } from "lucide-react";
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
import { useAuth } from "@/hooks/use-auth";

interface Notification {
  id: string;
  type: 'appointment' | 'chat' | 'submission' | 'group' | 'virtual_appointment' | 'google_calendar' | 'system';
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

export default function SimpleNotificationBell() {
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

  // Load notifications and stats
  const loadNotifications = useCallback(async () => {
    if (!patient?.id) return;

    try {
      setLoading(true);
      
      // Create some mock notifications for testing
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'appointment',
          title: 'Upcoming Appointment',
          message: 'Dr. Smith - 10:00 AM (In-person)',
          timestamp: new Date().toISOString(),
          read: false,
          urgent: true,
          data: {}
        },
        {
          id: '2',
          type: 'chat',
          title: 'New Message',
          message: 'Dr. Johnson: How are you feeling today?',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          read: false,
          urgent: false,
          data: {}
        },
        {
          id: '3',
          type: 'submission',
          title: 'Video Submission Processing',
          message: 'Daily Check-in Video - Processing',
          timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          read: true,
          urgent: false,
          data: {}
        }
      ];

      setNotifications(mockNotifications);

      // Calculate stats
      const unreadCount = mockNotifications.filter(n => !n.read).length;
      const urgentCount = mockNotifications.filter(n => n.urgent).length;
      
      const byType = {
        appointments: mockNotifications.filter(n => n.type === 'appointment').length,
        chats: mockNotifications.filter(n => n.type === 'chat').length,
        submissions: mockNotifications.filter(n => n.type === 'submission').length,
        groups: mockNotifications.filter(n => n.type === 'group').length,
        virtual_appointments: mockNotifications.filter(n => n.type === 'virtual_appointment').length,
        google_calendar: mockNotifications.filter(n => n.type === 'google_calendar').length
      };

      setStats({
        total: mockNotifications.length,
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

  // Load notifications on mount
  useEffect(() => {
    if (patient?.id && isAuthenticated) {
      loadNotifications();
    }
  }, [patient?.id, isAuthenticated, loadNotifications]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment': return <Calendar className="h-4 w-4" />;
      case 'chat': return <MessageSquare className="h-4 w-4" />;
      case 'submission': return <FileText className="h-4 w-4" />;
      case 'group': return <Users className="h-4 w-4" />;
      case 'virtual_appointment': return <Calendar className="h-4 w-4" />;
      case 'google_calendar': return <Calendar className="h-4 w-4" />;
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
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    
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
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
                onClick={() => markAsRead(notification.id)}
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
