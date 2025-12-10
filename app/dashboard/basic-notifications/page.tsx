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
  Plus
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function BasicNotificationsPage() {
  const { patient } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [message, setMessage] = useState("");

  // Mock notifications data
  const [notifications, setNotifications] = useState([
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
    },
    {
      id: '4',
      type: 'group',
      title: 'Group: Support Group',
      message: 'Sarah M.: Great session today everyone!',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      read: false,
      urgent: false
    },
    {
      id: '5',
      type: 'virtual_appointment',
      title: 'Virtual Appointment Today',
      message: 'Dr. Wilson - 2:00 PM (Virtual)',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      read: true,
      urgent: false
    }
  ]);

  const [newNotification, setNewNotification] = useState({
    type: 'appointment',
    title: '',
    message: '',
    urgent: false
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment': return <Calendar className="h-5 w-5" />;
      case 'chat': return <MessageSquare className="h-5 w-5" />;
      case 'submission': return <FileText className="h-5 w-5" />;
      case 'group': return <Users className="h-5 w-5" />;
      case 'virtual_appointment': return <Video className="h-5 w-5" />;
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

  const addNotification = () => {
    if (!newNotification.title || !newNotification.message) return;

    const notification = {
      id: Date.now().toString(),
      ...newNotification,
      timestamp: new Date().toISOString(),
      read: false
    };

    setNotifications(prev => [notification, ...prev]);
    setMessage('✅ Notification added successfully!');
    setNewNotification({
      type: 'appointment',
      title: '',
      message: '',
      urgent: false
    });
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setMessage('✅ All notifications marked as read!');
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || notification.type === filterType;
    
    return matchesSearch && matchesType;
  });

  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.read).length,
    urgent: notifications.filter(n => n.urgent).length
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Basic Notifications</h1>
        <p className="text-gray-600">Simple notification system without complex components.</p>
      </div>

      {message && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800 text-sm">{message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stats */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Stats
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.unread}</div>
              <div className="text-sm text-gray-500">Unread</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.urgent}</div>
              <div className="text-sm text-gray-500">Urgent</div>
            </div>
          </div>
        </div>

        {/* Add Notification */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Notification
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={newNotification.type}
                onChange={(e) => setNewNotification(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="appointment">Appointment</option>
                <option value="chat">Chat</option>
                <option value="submission">Submission</option>
                <option value="group">Group</option>
                <option value="virtual_appointment">Virtual Appointment</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <Input
                placeholder="Notification title"
                value={newNotification.title}
                onChange={(e) => setNewNotification(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                placeholder="Notification message"
                value={newNotification.message}
                onChange={(e) => setNewNotification(prev => ({ ...prev, message: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="urgent"
                checked={newNotification.urgent}
                onChange={(e) => setNewNotification(prev => ({ ...prev, urgent: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="urgent" className="text-sm font-medium text-gray-700">Mark as urgent</label>
            </div>
            <Button onClick={addNotification} className="w-full">
              Add Notification
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4 mt-6">
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
              <option value="chat">Chats</option>
              <option value="submission">Submissions</option>
              <option value="group">Groups</option>
              <option value="virtual_appointment">Virtual Appointments</option>
            </select>
            <Button onClick={markAllAsRead} disabled={stats.unread === 0}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark All as Read
            </Button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">Notifications ({filteredNotifications.length})</h2>
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-lg border p-12 text-center">
              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No notifications found</p>
              <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
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
                    <p className="text-gray-600">{notification.message}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
