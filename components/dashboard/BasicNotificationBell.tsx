"use client";

import { useState } from "react";
import { Bell, Calendar, MessageSquare, Users, FileText, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

export default function BasicNotificationBell() {
  const { patient, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Mock notifications data
  const notifications = [
    {
      id: '1',
      type: 'appointment',
      title: 'Upcoming Appointment',
      message: 'Dr. Smith - 10:00 AM (In-person)',
      timestamp: new Date().toISOString(),
      read: false,
      urgent: true
    },
    {
      id: '2',
      type: 'chat',
      title: 'New Message',
      message: 'Dr. Johnson: How are you feeling today?',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      read: false,
      urgent: false
    },
    {
      id: '3',
      type: 'submission',
      title: 'Video Submission Processing',
      message: 'Daily Check-in Video - Processing',
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      read: true,
      urgent: false
    }
  ];

  const unreadCount = notifications.filter(n => !n.read).length;
  const urgentCount = notifications.filter(n => n.urgent).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment': return <Calendar className="h-4 w-4" />;
      case 'chat': return <MessageSquare className="h-4 w-4" />;
      case 'submission': return <FileText className="h-4 w-4" />;
      case 'group': return <Users className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="relative h-10 w-10 rounded-full"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
        {urgentCount > 0 && (
          <div className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-ping" />
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-96 bg-white border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {/* Header */}
          <div className="px-4 py-3 border-b">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-lg">Notifications</h4>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {unreadCount} unread
                  </Badge>
                )}
                {urgentCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {urgentCount} urgent
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="px-4 py-2 bg-gray-50 border-b">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-blue-500" />
                <span>{notifications.filter(n => n.type === 'appointment').length} appointments</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3 text-green-500" />
                <span>{notifications.filter(n => n.type === 'chat').length} messages</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3 text-purple-500" />
                <span>{notifications.filter(n => n.type === 'submission').length} submissions</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-orange-500" />
                <span>{notifications.filter(n => n.type === 'group').length} groups</span>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No notifications</p>
                <p className="text-sm text-gray-400">You're all caught up!</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${
                      notification.urgent 
                        ? 'text-red-600 bg-red-50 border border-red-200' 
                        : 'text-blue-600 bg-blue-50 border border-blue-200'
                    }`}>
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
                      <p className="text-sm text-gray-600 mb-1">{notification.message}</p>
                      <p className="text-xs text-gray-400">{formatTime(notification.timestamp)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                disabled={unreadCount === 0}
              >
                Mark all as read
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
