"use client";

import { useState, useEffect } from "react";
import { Bell, Loader2 } from "lucide-react";
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
import { supabase } from "@/lib/supabase/client";
import { getUnreadNotificationCount, getStaffNotifications } from "@/lib/notifications/staff-notifications";
import { StaffNotification } from "@/lib/notifications/staff-notifications";

interface NotificationBellProps {
  staffId: string;
}

export default function NotificationBell({ staffId }: NotificationBellProps) {
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

  // Real-time subscription for notifications
  useEffect(() => {
    if (!staffId) return;

    const channel = supabase
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
          loadNotifications(); // Reload notifications
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
      default: return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'submission': return 'text-blue-600';
      case 'message': return 'text-green-600';
      case 'appointment': return 'text-purple-600';
      case 'emergency': return 'text-red-600';
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
        <DropdownMenuHeader className="px-3 py-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Notifications</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} unread
              </Badge>
            )}
          </div>
        </DropdownMenuHeader>
        
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
                    window.location.href = '/staff/messages';
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
