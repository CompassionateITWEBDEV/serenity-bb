"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase/client";
import { getUnreadNotificationCount } from "@/lib/notifications/staff-notifications";

interface NotificationBellProps {
  staffId: string;
}

export default function NotificationBell({ staffId }: NotificationBellProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingApptCount, setPendingApptCount] = useState(0);

  // Load notification count
  const loadNotificationCount = async () => {
    try {
      // Prefer server API using service role to bypass RLS for count
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/staff/notifications/unread-count', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const body = await res.json().catch(() => ({ count: 0 }));
        // If API signals a warning/error in payload, fall back to client query instead of forcing 0
        const hasServerIssue = Boolean((body as any)?.warning || (body as any)?.error);
        if (!hasServerIssue && typeof body.count === 'number') {
          setUnreadCount(body.count);
          return;
        }
      }
      // Fallback to client query if API not available
      const count = await getUnreadNotificationCount(staffId);
      setUnreadCount(count);
    } catch (error) {
      console.error("Error loading notification count:", error);
    }
  };

  // Count pending appointment requests (optionally scoped to this staff member)
  const loadPendingAppointments = async () => {
    try {
      const q = supabase
        .from('appointments' as any)
        .select('id', { count: 'exact', head: true } as any)
        .eq('status', 'pending');
      // If appointments are assigned to a specific staff member, include those for this staff
      if (staffId) {
        (q as any).or(`staff_id.is.null,staff_id.eq.${staffId}`);
      }
      const { count, error } = await (q as any);
      if (error) {
        console.warn('Pending appointments count failed:', error);
        setPendingApptCount(0);
        return;
      }
      setPendingApptCount(count ?? 0);
    } catch (e) {
      console.warn('Error counting pending appointments:', e);
      setPendingApptCount(0);
    }
  };

  // Load notification count on mount
  useEffect(() => {
    if (staffId) {
      loadNotificationCount();
      loadPendingAppointments();
    }
  }, [staffId]);

  // Development resilience: poll periodically and on window focus/visibility
  useEffect(() => {
    if (!staffId) return;

    let interval: number | null = null;
    const onFocus = () => { void loadNotificationCount(); void loadPendingAppointments(); };
    const onVisibility = () => { if (document.visibilityState === 'visible') { void loadNotificationCount(); void loadPendingAppointments(); } };

    // Light polling to cover cases where realtime isn't enabled in dev
    interval = window.setInterval(() => { void loadNotificationCount(); void loadPendingAppointments(); }, 15000);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (interval) window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [staffId]);

  // Real-time subscriptions for notifications and source events
  useEffect(() => {
    if (!staffId) return;

    // Subscribe to staff_notifications table changes (direct notifications)
    const notificationsChannel = supabase
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
          loadNotificationCount();
          loadPendingAppointments();
        }
      )
      .subscribe();

    // Subscribe to messages table to detect new patient messages
    const messagesChannel = supabase
      .channel(`staff-messages:${staffId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: 'sender_role=eq.patient',
        },
        (payload) => {
          console.log('New patient message detected:', payload);
          // Trigger notification count reload (the API will create the notification)
          setTimeout(() => { loadNotificationCount(); loadPendingAppointments(); }, 500);
        }
      )
      .subscribe();

    // Subscribe to drug_tests/random_drug_tests table for status changes
    const drugTestsChannel = supabase
      .channel(`staff-drug-tests:${staffId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'drug_tests',
        },
        (payload) => {
          console.log('Drug test status update detected:', payload);
          // Trigger notification count reload (the API will create the notification)
          setTimeout(() => { loadNotificationCount(); loadPendingAppointments(); }, 500);
        }
      )
      .subscribe();

    const randomTestsChannel = supabase
      .channel(`staff-random-drug-tests:${staffId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'random_drug_tests',
        },
        (payload) => {
          console.log('Random drug test status update detected:', payload);
          setTimeout(() => { loadNotificationCount(); loadPendingAppointments(); }, 500);
        }
      )
      .subscribe();

    // Subscribe to appointments table to detect new patient appointments
    const appointmentsChannel = supabase
      .channel(`staff-appointments:${staffId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
        },
        (payload) => {
          console.log('New appointment detected:', payload);
          // Trigger notification count reload (the API will create the notification)
          setTimeout(() => { loadNotificationCount(); loadPendingAppointments(); }, 500);
        }
      )
      .subscribe();

    // Subscribe to video_submissions table to detect completed video submissions
    const videoSubmissionsChannel = supabase
      .channel(`staff-video-submissions:${staffId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_submissions',
          filter: 'status=eq.completed',
        },
        (payload) => {
          console.log('Video submission completed detected:', payload);
          // Trigger notification count reload (the API will create the notification)
          setTimeout(() => loadNotificationCount(), 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(drugTestsChannel);
      supabase.removeChannel(randomTestsChannel);
      supabase.removeChannel(appointmentsChannel);
      supabase.removeChannel(videoSubmissionsChannel);
    };
  }, [staffId]);


  return (
    <Button
      variant="ghost"
      size="sm"
      className="relative h-10 w-10 rounded-full"
      onClick={() => router.push('/staff/notifications')}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge 
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
}
