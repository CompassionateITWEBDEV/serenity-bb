import { useEffect } from "react"
import { supabase } from "@/lib/supabase"  // ✅ FIXED: correct import

/**
 * Hook to listen for new notifications in real-time.
 *
 * @param patientId - The ID of the patient to subscribe to
 * @param onNew - Callback when a new notification arrives
 */
export function useNotifications(
  patientId: string,
  onNew: (notification: any) => void
) {
  useEffect(() => {
    if (!patientId) return;

    // ✅ Subscribe to Postgres real-time changes for this patient's notifications
    const channel = supabase
      .channel("notifications") // channel name can be anything
      .on(
        "postgres_changes",
        {
          event: "INSERT",       // listen for new notifications only
          schema: "public",
          table: "notifications",
          filter: `patient_id=eq.${patientId}`, // filter by patient ID
        },
        (payload) => {
          onNew(payload.new); // send new notification to callback
        }
      )
      .subscribe();

    // ✅ Cleanup subscription on unmount or patientId change
    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId, onNew]);
}
