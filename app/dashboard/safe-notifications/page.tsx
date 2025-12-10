"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Bell, 
  Calendar, 
  MessageSquare, 
  Users, 
  FileText, 
  Video, 
  Search, 
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Pill,
  Activity,
  TrendingUp,
  Settings
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSafeNotifications } from "@/hooks/use-safe-notifications";

export default function SafeNotificationsPage() {
  const { patient } = useAuth();
  const { 
    notifications, 
    stats, 
    loading, 
    error, 
    connectionStatus, 
    markAsRead, 
    markAllAsRead, 
    refresh 
  } = useSafeNotifications(patient?.id);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment': return <Calendar className="h-5 w-5" />;
      case 'message': return <MessageSquare className="h-5 w-5" />;
      case 'group_message': return <Users className="h-5 w-5" />;
      case 'video_submission': return <FileText className="h-5 w-5" />;
      case 'video_recording': return <Video className="h-5 w-5" />;
      case 'medication': return <Pill className="h-5 w-5" />;
      case 'activity': return <Activity className="h-5 w-5" />;
      case 'progress': return <TrendingUp className="h-5 w-5" />;
      case 'system': return <Settings className="h-5 w-5" />;
      default: return <Bell className="h-5 w-5" />;
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
      case 'system': return 'text-gray-600 bg-gray-50 border-gray-200';
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
      case 'system': return 'System';
      default: return 'Notification';
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || notification.type === filterType;
    
    return matchesSearch && matchesType;
  });

  if (!patient) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg border p-8 text-center">
          <p className="text-gray-500">Please log in to view notifications.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Safe Notifications</h1>
            <p className="text-gray-600 mt-2">Error-resistant notifications from your healthcare system</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
              {connectionStatus === 'connected' ? 'Live Updates' : 'Offline'}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-500">Total Notifications</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.unread}</p>
                <p className="text-sm text-gray-500">Unread</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.urgent}</p>
                <p className="text-sm text-gray-500">Urgent</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total - stats.unread}</p>
                <p className="text-sm text-gray-500">Read</p>
              </div>
            </div>
          </div>
        </div>

        {/* Type Breakdown */}
        <div className="bg-white rounded-lg border p-4 mb-6">
          <h3 className="font-semibold mb-3">Notifications by Type</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-sm">Appointments: {stats.byType.appointments}</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-500" />
              <span className="text-sm">Messages: {stats.byType.messages}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-500" />
              <span className="text-sm">Groups: {stats.byType.group_messages}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-500" />
              <span className="text-sm">Videos: {stats.byType.video_submissions}</span>
            </div>
            <div className="flex items-center gap-2">
              <Pill className="h-4 w-4 text-pink-500" />
              <span className="text-sm">Medications: {stats.byType.medications}</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-500" />
              <span className="text-sm">Activities: {stats.byType.activities}</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-sm">Progress: {stats.byType.progress}</span>
            </div>
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-gray-500" />
              <span className="text-sm">System: {stats.byType.system}</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="appointment">Appointments</option>
                <option value="message">Messages</option>
                <option value="group_message">Group Messages</option>
                <option value="video_submission">Video Submissions</option>
                <option value="video_recording">Video Recordings</option>
                <option value="medication">Medications</option>
                <option value="activity">Activities</option>
                <option value="progress">Progress</option>
                <option value="system">System</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-lg border p-12 text-center">
            <RefreshCw className="h-12 w-12 text-gray-300 mx-auto mb-4 animate-spin" />
            <p className="text-gray-500 mb-2">Loading notifications...</p>
            <p className="text-sm text-gray-400">Fetching data from your system safely</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg border p-12 text-center">
            <AlertTriangle className="h-12 w-12 text-red-300 mx-auto mb-4" />
            <p className="text-red-500 mb-2">Error loading notifications</p>
            <p className="text-sm text-gray-400">{error}</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-lg border p-12 text-center">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No notifications found</p>
            <p className="text-sm text-gray-400">
              {filterType === 'all' ? "You're all caught up!" : "No notifications in this category"}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div 
              key={notification.id} 
              className={`bg-white rounded-lg border p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                !notification.read ? 'ring-2 ring-blue-200 bg-blue-50' : ''
              } ${notification.urgent ? 'border-red-200' : ''}`}
              onClick={() => markAsRead(notification.id)}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full border ${getNotificationColor(notification.type, notification.urgent)}`}>
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                      {notification.urgent && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Urgent
                        </Badge>
                      )}
                      {!notification.read && (
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Unread
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">{formatTime(notification.timestamp)}</span>
                  </div>
                  <p className="text-gray-600 mb-3">{notification.message}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {getTypeLabel(notification.type)}
                    </Badge>
                    <span className="text-xs text-gray-400">ID: {notification.source_id}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Actions */}
      {notifications.length > 0 && (
        <div className="bg-white rounded-lg border p-4 mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {stats.unread} unread notifications out of {stats.total} total
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={markAllAsRead}
                disabled={stats.unread === 0}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark All as Read
              </Button>
              <Button
                variant="outline"
                onClick={refresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
