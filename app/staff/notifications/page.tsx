"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import MobileDock from "@/components/staff/MobileDock";
import {
  Bell,
  CheckCircle2,
  Info,
  XCircle,
  ChevronLeft,
  MessageSquare,
  FileText,
  Calendar,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { StaffNotification, getStaffNotifications, markNotificationAsRead, markAllNotificationsAsRead, getUnreadNotificationCount } from "@/lib/notifications/staff-notifications";

type Status = "success" | "info" | "error" | "warning";

function StatusDot({ type }: { type: string }) {
  const map: Record<string, { bg: string; text: string; icon: any }> = {
    submission: { bg: "bg-blue-100", text: "text-blue-600", icon: FileText },
    message: { bg: "bg-green-100", text: "text-green-600", icon: MessageSquare },
    appointment: { bg: "bg-purple-100", text: "text-purple-600", icon: Calendar },
    emergency: { bg: "bg-red-100", text: "text-red-600", icon: AlertTriangle },
  };
  
  const config = map[type] || map.submission;
  const Icon = config.icon;
  
  return (
    <span className={`h-8 w-8 rounded-full grid place-items-center ${config.bg} ${config.text}`}>
      <Icon className="h-4 w-4" />
    </span>
  );
}

function PriorityBadge({ priority }: { priority?: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    urgent: { bg: "bg-red-100", text: "text-red-800" },
    high: { bg: "bg-orange-100", text: "text-orange-800" },
    medium: { bg: "bg-yellow-100", text: "text-yellow-800" },
    low: { bg: "bg-gray-100", text: "text-gray-800" },
  };
  
  const config = map[priority || "medium"];
  
  return (
    <Badge className={`${config.bg} ${config.text} text-xs font-medium`}>
      {priority || "medium"}
    </Badge>
  );
}

export default function StaffNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<StaffNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Get staff ID
  useEffect(() => {
    const getStaffId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setStaffId(session.user.id);
      }
    };
    getStaffId();
  }, []);

  // Load notifications
  const loadNotifications = async () => {
    if (!staffId) return;
    
    setLoading(true);
    try {
      const data = await getStaffNotifications(staffId, 100);
      setNotifications(data);
      
      const count = await getUnreadNotificationCount(staffId);
      setUnreadCount(count);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh notifications
  const refreshNotifications = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  // Load notifications on mount and when staffId changes
  useEffect(() => {
    if (staffId) {
      loadNotifications();
    }
  }, [staffId]);

  // Real-time subscription
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
          loadNotifications(); // Reload all notifications
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [staffId]);

  const markRead = async (id: string) => {
    if (!staffId) return;
    
    try {
      const success = await markNotificationAsRead(id, staffId);
      if (success) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllRead = async () => {
    if (!staffId) return;
    
    try {
      const success = await markAllNotificationsAsRead(staffId);
      if (success) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, read: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 48) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="Back"
              onClick={() => router.push("/staff/dashboard")}
              className="h-9 w-9 rounded-full bg-slate-100 hover:bg-slate-200 grid place-items-center"
            >
              <ChevronLeft className="h-5 w-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-cyan-600" />
              <h1 className="text-lg font-semibold">Notifications</h1>
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white text-xs">
                  {unreadCount}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshNotifications}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllRead}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Notifications</p>
                  <p className="text-2xl font-bold text-blue-900">{notifications.length}</p>
                </div>
                <Bell className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Unread</p>
                  <p className="text-2xl font-bold text-red-900">{unreadCount}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Read</p>
                  <p className="text-2xl font-bold text-green-900">{notifications.length - unreadCount}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notifications List */}
        <Card className="shadow-sm">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
            <CardTitle className="flex items-center justify-between">
              <span>Recent Notifications</span>
              <Badge variant="outline" className="bg-white">
                {notifications.length} total
              </Badge>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-cyan-500" />
                <p className="text-slate-600">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center">
                <Bell className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No notifications yet</h3>
                <p className="text-slate-600">You'll receive notifications when patients send submissions or messages.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map((notification) => (
                  <li 
                    key={notification.id} 
                    className={`p-6 hover:bg-slate-50 transition-colors ${
                      !notification.read ? 'bg-blue-50/30 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <StatusDot type={notification.type} />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-semibold text-lg mb-1 ${
                              notification.read ? "text-slate-600" : "text-slate-900"
                            }`}>
                              {notification.title}
                            </h4>
                            <p className="text-slate-600 text-sm leading-relaxed mb-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs text-slate-500">
                                From: {notification.patient_name}
                              </span>
                              {notification.metadata?.priority && (
                                <PriorityBadge priority={notification.metadata.priority} />
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <span className="text-xs text-slate-500">
                              {formatDate(notification.created_at)}
                            </span>
                            {!notification.read && (
                              <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {!notification.read ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => markRead(notification.id)}
                              className="text-slate-600 hover:text-slate-800"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Mark as read
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <EyeOff className="h-3 w-3" />
                              Read
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>

      <MobileDock />
    </div>
  );
}
