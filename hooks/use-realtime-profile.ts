"use client"

import { useState, useEffect } from "react"
import { supabaseService } from "@/lib/supabase"
import { useAuth } from "./use-auth"

export function useRealtimeProfile() {
  const { patient, isAuthenticated } = useAuth()
  const [profileData, setProfileData] = useState(patient)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    if (!isAuthenticated || !patient) return

    let subscription: any = null

    const setupRealtimeSubscription = async () => {
      if (supabaseService.isAvailable()) {
        subscription = await supabaseService.subscribeToPatientUpdates(patient.id, (payload) => {
          console.log("[v0] Realtime profile update received:", payload)

          if (payload.eventType === "UPDATE" && payload.new) {
            // Update profile data with new information
            setProfileData((prev) => ({
              ...prev,
              ...payload.new,
              firstName: payload.new.full_name?.split(" ")[0] || prev?.firstName,
              lastName: payload.new.full_name?.split(" ").slice(1).join(" ") || prev?.lastName,
            }))
          }
        })
      }
    }

    setupRealtimeSubscription()

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [patient, isAuthenticated])

  const updateProfile = async (updates: Partial<typeof patient>) => {
    if (!patient) return { success: false, error: "No patient data" }

    try {
      if (supabaseService.isAvailable()) {
        const result = await supabaseService.updatePatient(patient.id, {
          full_name: updates.firstName && updates.lastName ? `${updates.firstName} ${updates.lastName}` : undefined,
          phone_number: updates.phoneNumber,
          date_of_birth: updates.dateOfBirth,
          ...updates,
        })

        if (result) {
          console.log("[v0] Profile updated successfully via Supabase")
          return { success: true }
        }
      }

      // Fallback to local update
      setProfileData((prev) => ({ ...prev, ...updates }))
      return { success: true }
    } catch (error) {
      console.error("[v0] Profile update failed:", error)
      return { success: false, error: "Failed to update profile" }
    }
  }

  return {
    profileData: profileData || patient,
    updateProfile,
    isOnline,
    isRealtimeEnabled: supabaseService.isAvailable(),
  }
}
