import { supabaseFromRoute } from "./supabaseRoute";

export type AppUser =
  | { kind: "staff"; id: string; email: string | null; first_name: string | null; last_name: string | null; role: string | null }
  | { kind: "patient"; id: string; email: string | null; first_name: string | null; last_name: string | null };

export async function getAppUser(): Promise<AppUser | null> {
  const supabase = supabaseFromRoute();

  const { data: au } = await supabase.auth.getUser();
  const user = au?.user;
  if (!user) return null;

  // Try staff first
  const { data: s } = await supabase
    .from("staff")
    .select("user_id, email, first_name, last_name, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (s?.user_id) {
    return {
      kind: "staff",
      id: s.user_id,
      email: s.email,
      first_name: s.first_name,
      last_name: s.last_name,
      role: s.role ?? "staff",
    };
  }

  // Then patient
  const { data: p } = await supabase
    .from("patients")
    .select("user_id, email, first_name, last_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (p?.user_id) {
    return {
      kind: "patient",
      id: p.user_id,
      email: p.email,
      first_name: p.first_name,
      last_name: p.last_name,
    };
  }

  return null; // authenticated but no profile row
}
