import { supabase } from "@/lib/supabase/client";

export type UserRole = 'patient' | 'staff';

/**
 * Determines if a user is a patient or staff member
 * @param userId - The user's ID
 * @returns Promise<'patient' | 'staff'>
 */
export async function determineUserRole(userId: string): Promise<UserRole> {
  try {
    // Check if user is a patient
    const { data: patient } = await supabase
      .from("patients")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (patient?.user_id) {
      return 'patient';
    }

    // Check if user is staff
    const { data: staff } = await supabase
      .from("staff")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (staff?.user_id) {
      return 'staff';
    }

    // Default to patient if neither found (fallback)
    return 'patient';
  } catch (error) {
    console.warn("Error determining user role:", error);
    return 'patient'; // Default fallback
  }
}

/**
 * Gets the correct messages page URL based on user role
 * @param role - The user's role
 * @returns The messages page URL
 */
export function getMessagesUrl(role: UserRole): string {
  return role === 'staff' ? '/staff/messages' : '/dashboard/messages';
}

/**
 * Gets the correct dashboard page URL based on user role
 * @param role - The user's role
 * @returns The dashboard page URL
 */
export function getDashboardUrl(role: UserRole): string {
  return role === 'staff' ? '/staff/dashboard' : '/dashboard';
}
