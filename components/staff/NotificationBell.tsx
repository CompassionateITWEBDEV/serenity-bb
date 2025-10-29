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

  // Load notification count
  const loadNotificationCount = async () => {
    try {
      const count = await getUnreadNotificationCount(staffId);
      setUnreadCount(count);
    } catch (error) {
      console.error("Error loading notification count:", error);
    }
  };

  // Load notification count on mount
  useEffect(() => {
    if (staffId) {
      loadNotificationCount();
    }
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
          loadNotificationCount(); // Reload notification count
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
          setTimeout(() => loadNotificationCount(), 500);
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
          setTimeout(() => loadNotificationCount(), 500);
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
          setTimeout(() => loadNotificationCount(), 500);
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
          setTimeout(() => loadNotificationCount(), 500);
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
