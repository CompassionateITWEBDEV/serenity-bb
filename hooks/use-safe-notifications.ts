"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { safeNotificationService, SafeNotification, SafeNotificationStats } from "@/lib/notifications/safe-notifications";
import { supabase } from "@/lib/supabase/client";

export function useSafeNotifications(patientId?: string | null) {
  const [notifications, setNotifications] = useState<SafeNotification[]>([]);
  const [stats, setStats] = useState<SafeNotificationStats>({
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
      progress: 0,
      system: 0,
      drug_tests: 0
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
          progress: 0,
          system: 0
        }
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setConnectionStatus('connecting');

      const allNotifications = await safeNotificationService.getAllNotifications(patientId);
      
      // Apply read status from localStorage for dynamic notifications
      const key = `notification_read_${patientId}`;
      try {
        const readIds = JSON.parse(localStorage.getItem(key) || '[]');
        const notificationsWithReadStatus = allNotifications.map(notif => {
          // For dynamic notifications, check localStorage
          const isDynamic = notif.id.startsWith('apt-') || 
                           notif.id.startsWith('msg-') || 
                           notif.id.startsWith('sub-') ||
                           notif.id.startsWith('system-');
          
          if (isDynamic && readIds.includes(notif.id)) {
            return { ...notif, read: true };
          }
          return notif;
        });
        
        const calculatedStats = safeNotificationService.calculateStats(notificationsWithReadStatus);
        setNotifications(notificationsWithReadStatus);
        setStats(calculatedStats);
      } catch (error) {
        // If localStorage fails, use original notifications
        const calculatedStats = safeNotificationService.calculateStats(allNotifications);
        setNotifications(allNotifications);
        setStats(calculatedStats);
      }
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

    // Set up safe real-time subscriptions
    safeNotificationService.setupRealTimeSubscriptions(patientId, loadNotifications);

    return () => {
      safeNotificationService.clearSubscriptions();
      isInitialized.current = false;
    };
  }, [patientId, loadNotifications]);

  // Helper to save read status to localStorage for dynamic notifications
  const saveReadStatus = useCallback((notificationId: string) => {
    if (!patientId) return;
    try {
      const key = `notification_read_${patientId}`;
      const readIds = JSON.parse(localStorage.getItem(key) || '[]');
      if (!readIds.includes(notificationId)) {
        readIds.push(notificationId);
        localStorage.setItem(key, JSON.stringify(readIds));
      }
    } catch (error) {
      console.warn('Failed to save read status to localStorage:', error);
    }
  }, [patientId]);

  // Helper to check if notification is marked as read in localStorage
  const isMarkedAsRead = useCallback((notificationId: string): boolean => {
    if (!patientId) return false;
    try {
      const key = `notification_read_${patientId}`;
      const readIds = JSON.parse(localStorage.getItem(key) || '[]');
      return readIds.includes(notificationId);
    } catch (error) {
      return false;
    }
  }, [patientId]);

  // Mark notification as read - calls backend API
  const markAsRead = useCallback(async (notificationId: string) => {
    // Optimistically update UI first
    const notification = notifications.find(n => n.id === notificationId);
    const wasUnread = notification && !notification.read;
    
    // Update notification state
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    
    // Update stats immediately
    if (wasUnread) {
      setStats(prev => ({
        ...prev,
        unread: Math.max(0, prev.unread - 1)
      }));
    }

    // Only call API for notifications that exist in the database
    // Notifications with IDs starting with 'apt-', 'msg-', etc. are generated on-the-fly
    // Only notifications from the notifications table (like drug tests) have real database IDs
    const isDatabaseNotification = !notificationId.startsWith('apt-') && 
                                   !notificationId.startsWith('msg-') && 
                                   !notificationId.startsWith('sub-') &&
                                   !notificationId.startsWith('system-');

    if (!isDatabaseNotification) {
      // For generated notifications, just update UI optimistically
      // No API call needed as they don't exist in the database
      return;
    }

    // Call backend API to persist the change for database notifications
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          ids: [notificationId],
          read: true,
        }),
      });

      if (!response.ok) {
        // If notification not found, that's okay - it might have been deleted
        // Only log for actual errors (not 404)
        if (response.status !== 404) {
          const errorText = await response.text();
          console.error("Failed to mark notification as read:", errorText);
          // Don't revert optimistic update - keep UI updated
        }
      }
      // Stats already updated optimistically, no need to reload
      // Real-time subscription will handle any backend updates
    } catch (error) {
      // Don't revert optimistic update on network errors - keep UI updated
      // The notification was marked as read in the UI, which is what the user expects
      console.error("Error marking notification as read:", error);
    }
  }, [notifications]);

  // Mark all notifications as read - calls backend API
  const markAllAsRead = useCallback(async () => {
    // Get all unread notification IDs
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    
    if (unreadIds.length === 0) return;

    // Optimistically update UI first
    const previousUnreadCount = stats.unread;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setStats(prev => ({ ...prev, unread: 0 }));

    // Filter out dynamically generated notifications (only call API for database notifications)
    const databaseUnreadIds = unreadIds.filter(id => 
      !id.startsWith('apt-') && 
      !id.startsWith('msg-') && 
      !id.startsWith('sub-') &&
      !id.startsWith('system-')
    );

    // Save read status to localStorage for dynamic notifications
    const dynamicUnreadIds = unreadIds.filter(id => 
      id.startsWith('apt-') || 
      id.startsWith('msg-') || 
      id.startsWith('sub-') ||
      id.startsWith('system-')
    );
    
    dynamicUnreadIds.forEach(id => saveReadStatus(id));

    // Only call API if there are database notifications to update
    if (databaseUnreadIds.length > 0) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const response = await fetch("/api/notifications", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({
            ids: databaseUnreadIds,
            read: true,
          }),
        });

        if (!response.ok) {
          // Only revert database notifications on error, keep optimistic update for dynamic ones
          const errorText = await response.text();
          console.error("Failed to mark all notifications as read:", errorText);
          
          // Revert only database notifications
          setNotifications(prev => 
            prev.map(n => databaseUnreadIds.includes(n.id) ? { ...n, read: false } : n)
          );
          
          // Recalculate unread count
          const remainingUnread = notifications.filter(n => 
            !n.read && !databaseUnreadIds.includes(n.id)
          ).length;
          setStats(prev => ({ ...prev, unread: remainingUnread }));
        }
        // If successful, optimistic update remains (no need to reload)
      } catch (error) {
        console.error("Error marking all notifications as read:", error);
        
        // Revert only database notifications on error
        setNotifications(prev => 
          prev.map(n => databaseUnreadIds.includes(n.id) ? { ...n, read: false } : n)
        );
        
        // Recalculate unread count
        const remainingUnread = notifications.filter(n => 
          !n.read && !databaseUnreadIds.includes(n.id)
        ).length;
        setStats(prev => ({ ...prev, unread: remainingUnread }));
      }
    }
    // If all notifications are dynamic (no database IDs), optimistic update is sufficient
  }, [notifications, stats.unread]);

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
