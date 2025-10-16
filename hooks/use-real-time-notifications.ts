"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { notificationService, NotificationData } from "@/lib/notifications/real-time-notifications";

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

export function useRealTimeNotifications(userId?: string | null) {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
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
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  
  const isInitialized = useRef(false);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setStats({
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
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setConnectionStatus('connecting');

      const allNotifications = await notificationService.getAllNotifications(userId);
      
      setNotifications(allNotifications);

      // Calculate stats
      const unreadCount = allNotifications.filter(n => !n.read).length;
      const urgentCount = allNotifications.filter(n => n.urgent).length;
      
      const byType = {
        appointments: allNotifications.filter(n => n.type === 'appointment').length,
        chats: allNotifications.filter(n => n.type === 'chat').length,
        submissions: allNotifications.filter(n => n.type === 'submission').length,
        groups: allNotifications.filter(n => n.type === 'group').length,
        virtual_appointments: allNotifications.filter(n => n.type === 'virtual_appointment').length,
        google_calendar: allNotifications.filter(n => n.type === 'google_calendar').length
      };

      setStats({
        total: allNotifications.length,
        unread: unreadCount,
        urgent: urgentCount,
        byType
      });

      setConnectionStatus('connected');
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
      setConnectionStatus('disconnected');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!userId || isInitialized.current) return;

    isInitialized.current = true;

    // Load initial notifications
    loadNotifications();

    // Set up real-time subscriptions
    notificationService.setupRealTimeSubscriptions(userId, loadNotifications);

    return () => {
      notificationService.clearSubscriptions();
      isInitialized.current = false;
    };
  }, [userId, loadNotifications]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!userId) return;

    // Update local state immediately
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    
    // Update stats
    setStats(prev => ({
      ...prev,
      unread: Math.max(0, prev.unread - 1)
    }));

    // Update in service
    await notificationService.markAsRead(notificationId, userId);
  }, [userId]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    // Update local state immediately
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setStats(prev => ({ ...prev, unread: 0 }));

    // Update in service
    await notificationService.markAllAsRead(userId);
  }, [userId]);

  // Refresh notifications manually
  const refresh = useCallback(() => {
    loadNotifications();
  }, [loadNotifications]);

  return {
    notifications,
    stats,
    loading,
    error,
    connectionStatus,
    markAsRead,
    markAllAsRead,
    refresh
  };
}
