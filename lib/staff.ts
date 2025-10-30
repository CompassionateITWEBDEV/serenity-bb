import { supabase } from "./supabase/client";

export type StaffProfile = {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  department: string | null;
  phone: string | null;
  avatar_url: string | null;
};

export async function getCurrentStaff(): Promise<StaffProfile | null> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return null;

  try {
    const { data, error } = await supabase
      .from("staff")
      .select("user_id,email,first_name,last_name,title,department,phone,avatar_url")
      .eq("user_id", uid)
      .maybeSingle();

    if (error) {
      // Gracefully handle common cases so UI doesn't break with empty error {}
      const code = (error as any)?.code || "UNKNOWN";
      const message = (error as any)?.message || String(error);
      const details = (error as any)?.details;
      const hint = (error as any)?.hint;

      // If table missing or RLS denied, return null so caller can show fallback
      if (
        code === "PGRST116" || // relation does not exist
        code === "PGRST205" || // not in schema cache
        message?.toLowerCase().includes("does not exist") ||
        message?.toLowerCase().includes("permission denied") ||
        message?.toLowerCase().includes("row-level security")
      ) {
        console.warn("getCurrentStaff: returning null due to schema/RLS:", { code, message, details, hint });
        return null;
      }

      // Other errors: rethrow with useful message
      throw new Error(message || "Failed to load staff profile");
    }

    // If no row exists, try to create one via server API (service role) then refetch once
    if (!data) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        await fetch("/api/staff/profile/ensure", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
      } catch {}

      const { data: refetched } = await supabase
        .from("staff")
        .select("user_id,email,first_name,last_name,title,department,phone,avatar_url")
        .eq("user_id", uid)
        .maybeSingle();
      return (refetched as StaffProfile) || null;
    }

    return (data as StaffProfile) || null;
  } catch (e) {
    // Ensure a meaningful error reaches the caller
    const err = e as any;
    const msg = err?.message || "Failed to load staff profile";
    throw new Error(msg);
  }
}

export async function updateCurrentStaff(patch: Partial<Omit<StaffProfile, "user_id" | "email">>) {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) throw new Error("Not authenticated");

  console.log("🔍 updateCurrentStaff: Updating staff with user_id:", uid);
  console.log("🔍 updateCurrentStaff: Patch data:", patch);

  const { data, error } = await supabase
    .from("staff")
    .update(patch)
    .eq("user_id", uid)
    .select("user_id,email,first_name,last_name,title,department,phone,avatar_url")
    .single();
  
  if (error) {
    console.error("❌ updateCurrentStaff: Supabase error:", error);
    console.error("❌ Error code:", error.code);
    console.error("❌ Error message:", error.message);
    console.error("❌ Error details:", error.details);
    console.error("❌ Error hint:", error.hint);
    throw error;
  }
  
  console.log("✅ updateCurrentStaff: Success! Returned data:", data);
  return data as StaffProfile;
}

export async function logout() {
  await supabase.auth.signOut();
}
