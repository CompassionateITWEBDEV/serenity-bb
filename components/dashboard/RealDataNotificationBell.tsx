"use client";

import { useState } from "react";
import { Bell, Loader2, Calendar, MessageSquare, Users, FileText, Video, Pill, Activity, TrendingUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useRealDataNotifications } from "@/hooks/use-real-data-notifications";

export default function RealDataNotificationBell() {
  const { patient, isAuthenticated } = useAuth();
  const { 
    notifications, 
    stats, 
    loading, 
    error, 
    connectionStatus, 
    markAsRead, 
    markAllAsRead 
  } = useRealDataNotifications(patient?.id);

  const [isOpen, setIsOpen] = useState(false);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment': return <Calendar className="h-4 w-4" />;
      case 'message': return <MessageSquare className="h-4 w-4" />;
      case 'group_message': return <Users className="h-4 w-4" />;
      case 'video_submission': return <FileText className="h-4 w-4" />;
      case 'video_recording': return <Video className="h-4 w-4" />;
      case 'medication': return <Pill className="h-4 w-4" />;
      case 'activity': return <Activity className="h-4 w-4" />;
      case 'progress': return <TrendingUp className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string, urgent: boolean) => {
    if (urgent) return 'text-red-600 bg-red-50 border-red-200';
    
    switch (type) {
      case 'appointment': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'message': return 'text-green-600 bg-green-50 border-green-200';
      case 'group_message': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'video_submission': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'video_recording': return 'text-indigo-600 bg-indigo-50 border-indigo-200';
      case 'medication': return 'text-pink-600 bg-pink-50 border-pink-200';
      case 'activity': return 'text-cyan-600 bg-cyan-50 border-cyan-200';
      case 'progress': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'appointment': return 'Appointment';
      case 'message': return 'Message';
      case 'group_message': return 'Group Chat';
      case 'video_submission': return 'Video Submission';
      case 'video_recording': return 'Video Recording';
      case 'medication': return 'Medication';
      case 'activity': return 'Activity';
      case 'progress': return 'Progress';
      default: return 'Notification';
    }
  };

  if (!isAuthenticated || !patient) return null;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="relative h-10 w-10 rounded-full"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {stats.unread > 0 && (
          <Badge 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white"
          >
            {stats.unread > 99 ? '99+' : stats.unread}
          </Badge>
        )}
        {stats.urgent > 0 && (
          <div className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-ping" />
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-96 bg-white border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {/* Header */}
          <div className="px-4 py-3 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-lg">Real-time Notifications</h4>
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
          </div>

          {/* Stats */}
          <div className="px-4 py-2 bg-gray-50 border-b">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-blue-500" />
                <span>{stats.byType.appointments} appointments</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3 text-green-500" />
                <span>{stats.byType.messages} messages</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-orange-500" />
                <span>{stats.byType.group_messages} groups</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3 text-purple-500" />
                <span>{stats.byType.video_submissions} videos</span>
              </div>
              <div className="flex items-center gap-1">
                <Pill className="h-3 w-3 text-pink-500" />
                <span>{stats.byType.medications} meds</span>
              </div>
              <div className="flex items-center gap-1">
                <Activity className="h-3 w-3 text-cyan-500" />
                <span>{stats.byType.activities} activities</span>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2 text-sm text-gray-500">Loading notifications...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-red-300 mx-auto mb-4" />
                <p className="text-red-500 mb-2">Error loading notifications</p>
                <p className="text-sm text-gray-400">{error}</p>
              </div>
            ) : notifications.length === 0 ? (
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
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full border ${getNotificationColor(notification.type, notification.urgent)}`}>
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
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-400">{formatTime(notification.timestamp)}</p>
                        <Badge variant="outline" className="text-xs">
                          {getTypeLabel(notification.type)}
                        </Badge>
                      </div>
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
                onClick={markAllAsRead}
                disabled={stats.unread === 0}
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
