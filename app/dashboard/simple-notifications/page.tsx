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
  Filter,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function SimpleNotificationsPage() {
  const { patient } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterUrgent, setFilterUrgent] = useState(false);

  // Mock notifications data
  const [notifications] = useState([
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
    },
    {
      id: '4',
      type: 'group',
      title: 'Group: Support Group',
      message: 'Sarah M.: Great session today everyone!',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      read: false,
      urgent: false,
      data: {}
    },
    {
      id: '5',
      type: 'virtual_appointment',
      title: 'Virtual Appointment Today',
      message: 'Dr. Wilson - 2:00 PM (Virtual)',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      read: true,
      urgent: false,
      data: {}
    }
  ]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment': return <Calendar className="h-5 w-5" />;
      case 'chat': return <MessageSquare className="h-5 w-5" />;
      case 'submission': return <FileText className="h-5 w-5" />;
      case 'group': return <Users className="h-5 w-5" />;
      case 'virtual_appointment': return <Video className="h-5 w-5" />;
      case 'google_calendar': return <Calendar className="h-5 w-5" />;
      default: return <Bell className="h-5 w-5" />;
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

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || notification.type === filterType;
    const matchesUrgent = !filterUrgent || notification.urgent;
    
    return matchesSearch && matchesType && matchesUrgent;
  });

  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.read).length,
    urgent: notifications.filter(n => n.urgent).length,
    byType: {
      appointments: notifications.filter(n => n.type === 'appointment').length,
      chats: notifications.filter(n => n.type === 'chat').length,
      submissions: notifications.filter(n => n.type === 'submission').length,
      groups: notifications.filter(n => n.type === 'group').length,
      virtual_appointments: notifications.filter(n => n.type === 'virtual_appointment').length,
      google_calendar: notifications.filter(n => n.type === 'google_calendar').length
    }
  };

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
            <h1 className="text-3xl font-bold text-gray-900">Notifications Center</h1>
            <p className="text-gray-600 mt-2">Stay updated with all your important notifications</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Live Updates
            </div>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
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
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="appointment">Appointments</option>
                <option value="chat">Chats</option>
                <option value="submission">Submissions</option>
                <option value="group">Groups</option>
                <option value="virtual_appointment">Virtual Appointments</option>
                <option value="google_calendar">Google Calendar</option>
              </select>
              <Button
                variant={filterUrgent ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterUrgent(!filterUrgent)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Urgent Only
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-lg border p-12 text-center">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No notifications found</p>
            <p className="text-sm text-gray-400">
              {filterType === 'unread' ? "You're all caught up!" : "No notifications in this category"}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div 
              key={notification.id} 
              className={`bg-white rounded-lg border p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                !notification.read ? 'ring-2 ring-blue-200 bg-blue-50' : ''
              } ${notification.urgent ? 'border-red-200' : ''}`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full ${getNotificationColor(notification.type, notification.urgent)}`}>
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
                      {notification.type.replace('_', ' ')}
                    </Badge>
                    {notification.data && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                      >
                        View Details
                      </Button>
                    )}
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
                disabled={stats.unread === 0}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark All as Read
              </Button>
              <Button variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
