"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { realDataNotificationService, RealNotification, NotificationStats } from "@/lib/notifications/real-data-notifications";

export function useRealDataNotifications(patientId?: string | null) {
  const [notifications, setNotifications] = useState<RealNotification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    urgent: 0,
    byType: {
      appointments: 0,
      messages: 0,
      group_messages: 0,
      video_submissions: 0,
      video_recordings: 0,
      medications: 0,
      activities: 0,
      progress: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  
  const isInitialized = useRef(false);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!patientId) {
      setNotifications([]);
      setStats({
        total: 0,
        unread: 0,
        urgent: 0,
        byType: {
          appointments: 0,
          messages: 0,
          group_messages: 0,
          video_submissions: 0,
          video_recordings: 0,
          medications: 0,
          activities: 0,
          progress: 0
        }
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setConnectionStatus('connecting');

      const allNotifications = await realDataNotificationService.getAllNotifications(patientId);
      const calculatedStats = realDataNotificationService.calculateStats(allNotifications);
      
      setNotifications(allNotifications);
      setStats(calculatedStats);
      setConnectionStatus('connected');
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
      setConnectionStatus('disconnected');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!patientId || isInitialized.current) return;

    isInitialized.current = true;

    // Load initial notifications
    loadNotifications();

    // Set up real-time subscriptions
    realDataNotificationService.setupRealTimeSubscriptions(patientId, loadNotifications);

    return () => {
      realDataNotificationService.clearSubscriptions();
      isInitialized.current = false;
    };
  }, [patientId, loadNotifications]);

  // Mark notification as read (local state only for now)
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    
    setStats(prev => ({
      ...prev,
      unread: Math.max(0, prev.unread - 1)
    }));
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setStats(prev => ({ ...prev, unread: 0 }));
  }, []);

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
