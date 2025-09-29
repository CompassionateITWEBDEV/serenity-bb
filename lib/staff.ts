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

  const { data, error } = await supabase
    .from("staff")
    .select("user_id,email,first_name,last_name,title,department,phone,avatar_url")
    .eq("user_id", uid)
    .single();
  if (error) throw error;
  return data as StaffProfile;
}

export async function updateCurrentStaff(patch: Partial<Omit<StaffProfile, "user_id" | "email">>) {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("staff")
    .update(patch)
    .eq("user_id", uid)
    .select("user_id,email,first_name,last_name,title,department,phone,avatar_url")
    .single();
  if (error) throw error;
  return data as StaffProfile;
}

export async function logout() {
  await supabase.auth.signOut();
}
