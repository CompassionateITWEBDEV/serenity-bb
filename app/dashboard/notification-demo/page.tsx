"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Bell, 
  Calendar, 
  MessageSquare, 
  Users, 
  FileText, 
  Video, 
  Plus,
  CheckCircle,
  AlertTriangle,
  Clock
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function NotificationDemoPage() {
  const { patient } = useAuth();
  const [message, setMessage] = useState("");
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
      case 'appointment': return <Calendar className="h-4 w-4" />;
      case 'chat': return <MessageSquare className="h-4 w-4" />;
      case 'submission': return <FileText className="h-4 w-4" />;
      case 'group': return <Users className="h-4 w-4" />;
      case 'virtual_appointment': return <Video className="h-4 w-4" />;
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
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
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

  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.read).length,
    urgent: notifications.filter(n => n.urgent).length
  };

  if (!patient) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg border p-8 text-center">
          <p className="text-gray-500">Please log in to view the notification demo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Notification System Demo</h1>
        <p className="text-gray-600">Test the real-time notification system with sample data.</p>
      </div>

      {message && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800 text-sm">{message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notification Stats */}
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

        {/* Add Notification Form */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Notification
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
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
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Notification title"
                value={newNotification.title}
                onChange={(e) => setNewNotification(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Notification message"
                value={newNotification.message}
                onChange={(e) => setNewNotification(prev => ({ ...prev, message: e.target.value }))}
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
              <Label htmlFor="urgent">Mark as urgent</Label>
            </div>
            <Button onClick={addNotification} className="w-full">
              Add Notification
            </Button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Notifications ({notifications.length})</h2>
          <Button onClick={markAllAsRead} disabled={stats.unread === 0}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark All as Read
          </Button>
        </div>

        <div className="space-y-4">
          {notifications.map((notification) => (
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
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">How to Test the Notification System:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
          <li>Add new notifications using the form above</li>
          <li>Click on notifications to mark them as read</li>
          <li>Use "Mark All as Read" to mark all notifications as read</li>
          <li>Check the notification bell icon in the header to see the live count</li>
          <li>Visit the <a href="/dashboard/simple-notifications" className="underline">Simple Notifications page</a> for a full notification center</li>
        </ol>
      </div>
    </div>
  );
}
