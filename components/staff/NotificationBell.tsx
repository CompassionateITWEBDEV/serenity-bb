"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase/client";
import { getUnreadNotificationCount, getStaffNotifications } from "@/lib/notifications/staff-notifications";
import { StaffNotification } from "@/lib/notifications/staff-notifications";

interface NotificationBellProps {
  staffId: string;
}

export default function NotificationBell({ staffId }: NotificationBellProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<StaffNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Load notification count and recent notifications
  const loadNotifications = async () => {
    try {
      const [count, notifications] = await Promise.all([
        getUnreadNotificationCount(staffId),
        getStaffNotifications(staffId, 5) // Get 5 most recent
      ]);
      
      setUnreadCount(count);
      setRecentNotifications(notifications);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load notifications on mount
  useEffect(() => {
    if (staffId) {
      loadNotifications();
    }
  }, [staffId]);

  // Real-time subscriptions for notifications and source events
  useEffect(() => {
    if (!staffId) return;

    // Subscribe to staff_notifications table changes (direct notifications)
    const notificationsChannel = supabase
      .channel(`staff-notifications:${staffId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staff_notifications',
          filter: `staff_id=eq.${staffId}`,
        },
        (payload) => {
          console.log('Real-time notification update:', payload);
          loadNotifications(); // Reload notifications immediately
        }
      )
      .subscribe();

    // Subscribe to messages table to detect new patient messages
    const messagesChannel = supabase
      .channel(`staff-messages:${staffId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: 'sender_role=eq.patient',
        },
        (payload) => {
          console.log('New patient message detected:', payload);
          // Trigger notification reload (the API will create the notification)
          setTimeout(() => loadNotifications(), 500);
        }
      )
      .subscribe();

    // Subscribe to drug_tests/random_drug_tests table for status changes
    const drugTestsChannel = supabase
      .channel(`staff-drug-tests:${staffId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'drug_tests',
        },
        (payload) => {
          console.log('Drug test status update detected:', payload);
          // Trigger notification reload (the API will create the notification)
          setTimeout(() => loadNotifications(), 500);
        }
      )
      .subscribe();

    const randomTestsChannel = supabase
      .channel(`staff-random-drug-tests:${staffId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'random_drug_tests',
        },
        (payload) => {
          console.log('Random drug test status update detected:', payload);
          setTimeout(() => loadNotifications(), 500);
        }
      )
      .subscribe();

    // Subscribe to appointments table to detect new patient appointments
    const appointmentsChannel = supabase
      .channel(`staff-appointments:${staffId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
        },
        (payload) => {
          console.log('New appointment detected:', payload);
          // Trigger notification reload (the API will create the notification)
          setTimeout(() => loadNotifications(), 500);
        }
      )
      .subscribe();

    // Subscribe to video_submissions table to detect completed video submissions
    const videoSubmissionsChannel = supabase
      .channel(`staff-video-submissions:${staffId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_submissions',
          filter: 'status=eq.completed',
        },
        (payload) => {
          console.log('Video submission completed detected:', payload);
          // Trigger notification reload (the API will create the notification)
          setTimeout(() => loadNotifications(), 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(drugTestsChannel);
      supabase.removeChannel(randomTestsChannel);
      supabase.removeChannel(appointmentsChannel);
      supabase.removeChannel(videoSubmissionsChannel);
    };
  }, [staffId]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'submission': return '📄';
      case 'message': return '💬';
      case 'appointment': return '📅';
      case 'emergency': return '🚨';
      case 'drug_test': return '🧪';
      case 'video_submission': return '🎥';
      default: return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'submission': return 'text-blue-600';
      case 'message': return 'text-green-600';
      case 'appointment': return 'text-purple-600';
      case 'emergency': return 'text-red-600';
      case 'drug_test': return 'text-amber-600';
      case 'video_submission': return 'text-indigo-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-10 w-10 rounded-full"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-80 max-h-96 overflow-y-auto"
        sideOffset={5}
      >
        <DropdownMenuLabel className="px-3 py-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Notifications</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} unread
              </Badge>
            )}
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : recentNotifications.length === 0 ? (
          <div className="px-3 py-8 text-center text-gray-500">
            <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {recentNotifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="px-3 py-3 cursor-pointer hover:bg-gray-50"
                onClick={() => {
                  // Navigate to relevant page based on notification type
                  if (notification.type === 'submission') {
                    window.location.href = '/staff/patient-inbox';
                  } else if (notification.type === 'message') {
                    window.location.href = `/staff/messages${notification.metadata?.conversation_id ? `?conversation=${notification.metadata.conversation_id}` : ''}`;
                  } else if (notification.type === 'drug_test') {
                    window.location.href = '/staff/dashboard?tab=tests';
                  } else if (notification.type === 'appointment') {
                    // Navigate to appointments page
                    router.push('/staff/appointments');
                  } else if (notification.type === 'video_submission') {
                    // Navigate to submissions/videos page
                    router.push('/staff/dashboard?tab=submissions');
                  }
                  setIsOpen(false);
                }}
              >
                <div className="flex items-start gap-3 w-full">
                  <div className="text-lg">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h5 className={`text-sm font-medium ${getNotificationColor(notification.type)}`}>
                        {notification.title}
                      </h5>
                      {!notification.read && (
                        <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        From: {notification.patient_name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatTime(notification.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          className="px-3 py-2 text-center text-sm text-blue-600 hover:bg-blue-50"
          onClick={() => {
            window.location.href = '/staff/notifications';
            setIsOpen(false);
          }}
        >
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
