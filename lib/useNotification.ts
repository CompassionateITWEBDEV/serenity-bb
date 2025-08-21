import { useEffect } from "react"
import { supabase } from "@/lib/supabase-client"


export function useNotifications(patientId: string, onNew: (n: any) => void) {
  useEffect(() => {
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `patient_id=eq.${patientId}` },
        (payload) => onNew(payload.new)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [patientId, onNew])
}
