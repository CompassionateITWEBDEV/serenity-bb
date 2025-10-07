import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function supabaseFromRoute() {
  const store = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n: string) => store.get(n)?.value,
        set: (name: string, value: string, options: any) => store.set({ name, value, ...options }),
        remove: (name: string, options: any) => store.delete({ name, ...options }),
      },
    }
  );
}
