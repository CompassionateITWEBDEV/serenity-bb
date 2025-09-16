import { useEffect } from "react";
import { supabase } from "@/lib/supabase"; // ✅ Correct import

/**
 * Custom hook to listen for new notifications in real-time.
 *
 * @param patientId - ID of the patient to subscribe to.
 * @param onNew - Callback function to handle a new notification.
 */
export function useNotifications(
  patientId: string,
  onNew: (notification: any) => void
) {
  useEffect(() => {
    // ✅ Guard: Don't subscribe if supabase isn't ready or patientId is missing
    if (!patientId || !supabase) return;

    // ✅ Subscribe to Postgres real-time changes for notifications
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          onNew(payload.new);
        }
      )
      .subscribe();

    // ✅ Cleanup subscription safely using optional chaining
    return () => {
      supabase?.removeChannel(channel); // ✅ FIXED HERE
    };
  }, [patientId, onNew]);
}
