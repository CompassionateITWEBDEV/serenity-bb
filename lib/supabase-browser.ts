import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  {
    auth: {
      persistSession: true,        // why: survive refresh
      autoRefreshToken: true,      // why: keep session valid
    },
  }
);

// File: types/profile.ts
export type Profile = {
  id: string; // auth.users.id
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  date_of_birth: string | null;
  address: string | null;
  emergency_contact: string | null;
  admission_date: string | null;
  treatment_type: string | null;
  primary_physician: string | null;
  counselor: string | null;
  created_at?: string;
  updated_at?: string | null;
};
