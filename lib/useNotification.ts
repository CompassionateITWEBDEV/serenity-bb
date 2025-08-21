import { useEffect } from "react";
import { supabase } from "@/lib/supabase"; // ✅ Correct import based on your project

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

    // ✅ Subscribe to Postgres real-time changes for the notifications table
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `patient_id=eq.${patientId}`, // only listen for this patient
        },
        (payload) => {
          // Call the provided callback with the new notification data
          onNew(payload.new);
        }
      )
      .subscribe();

    // ✅ Cleanup subscription when the component unmounts or patientId changes
    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId, onNew]);
}
