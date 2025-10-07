import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function supabaseFromRoute() {
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

// Escape % and _ in ILIKE searches
function escapeLike(input: string) {
  return input.replace(/[%_]/g, (m) => `\\${m}`);
}

type StaffRow = {
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  department: string | null;
  role: string | null;
  phone: string | null;
  avatar_url: string | null;
  active: boolean;
};

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const supabase = supabaseFromRoute();

  const { data: au, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
  if (!au.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const department = (url.searchParams.get("department") ?? "").trim();
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "25", 10) || 25, 1), 100);
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10) || 0, 0);

  let query = supabase
    .from<StaffRow>("staff")
    .select(
      "user_id, email, first_name, last_name, title, department, role, phone, avatar_url, active",
      { count: "exact" }
    )
    .eq("active", true) // directory shows only active
    .order("first_name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (department) query = query.eq("department", department);
  if (q) {
    const term = escapeLike(q.toLowerCase());
    query = query.or(
      [
        `first_name.ilike.%${term}%`,
        `last_name.ilike.%${term}%`,
        `email.ilike.%${term}%`,
        `department.ilike.%${term}%`,
        `title.ilike.%${term}%`,
      ].join(",")
    );
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const items = (data ?? []).map((r) => ({
    id: r.user_id,
    name: [r.first_name, r.last_name].filter(Boolean).join(" ").trim() || r.email || "Unknown",
    email: r.email,
    title: r.title,
    department: r.department,
    role: r.role ?? "staff",
    phone: r.phone,
    avatar_url: r.avatar_url,
  }));

  return NextResponse.json({
    items,
    count: count ?? items.length,
    nextOffset: offset + items.length,
    hasMore: count ? offset + items.length < count : false,
  });
}
