// FILE: app/api/notifications/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

// ---------- Schemas ----------
const GetQuery = z.object({
  patientId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  before: z.string().datetime().optional(), // ISO timestamp cursor (created_at)
});

const PostBody = z.object({
  title: z.string().min(1).max(120),
  message: z.string().min(1).max(2000),
  type: z.enum(["info", "warning", "success", "error"]),
  // patient_id from auth; ignore any spoofed value
});

const PatchBody = z.object({
  ids: z.array(z.string().uuid()).min(1),
  read: z.boolean(),
});

// ---------- Helpers ----------
function err(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

// ---------- GET /api/notifications ----------
export async function GET(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return err(500, "Supabase configuration missing");
  }

  const store = await cookies();
  const supabase = createServerClient(url, anon, {
    cookies: {
      get: (k) => store.get(k)?.value,
      set: (k, v, o) => store.set(k, v, o),
      remove: (k, o) => store.set(k, "", { ...o, maxAge: 0 }),
    },
  });
  
  const requestUrl = new URL(req.url);

  // Auth - try cookie-based first, fallback to Bearer token
  const { data: cookieAuth, error: cookieErr } = await supabase.auth.getUser();
  let user = cookieAuth?.user;
  let authError = cookieErr;

  // Fallback to Bearer token if cookie auth fails
  if ((!user || cookieErr) && req.headers) {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const bearer = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : null;

    if (bearer) {
      const { createClient: createSbClient } = await import("@supabase/supabase-js");
      const supabaseBearer = createSbClient(url, anon, {
        global: { headers: { Authorization: `Bearer ${bearer}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: bearerAuth, error: bearerErr } = await supabaseBearer.auth.getUser();
      if (bearerErr) {
        authError = bearerErr;
      } else {
        user = bearerAuth?.user;
        authError = null;
      }
    }
  }

  if (authError || !user) return err(401, "Unauthorized");

  // Validate query
  const parsed = GetQuery.safeParse({
    patientId: requestUrl.searchParams.get("patientId"),
    limit: requestUrl.searchParams.get("limit") ?? undefined,
    before: requestUrl.searchParams.get("before") ?? undefined,
  });
  if (!parsed.success) return err(400, parsed.error.issues[0]?.message ?? "Invalid query");

  const { patientId, limit, before } = parsed.data;

  // Enforce: patient can only read own notifications (RLS should also enforce)
  if (patientId !== user.id) return err(403, "Forbidden");

  try {
    // Use patient_id (this is the actual schema column per your schema)
    let q = supabase
      .from("notifications")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (before) {
      q = q.lt("created_at", before);
    }

    const { data, error: firstError } = await q;
    
    // If patient_id fails with column error, try user_id (fallback for schema variations)
    if (firstError && (firstError.code === '42703' || 
        (firstError.message?.includes('column') && firstError.message?.includes('does not exist')))) {
      console.log('patient_id column not found in notifications, trying user_id...');
      q = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", patientId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (before) {
        q = q.lt("created_at", before);
      }

      const { data: fallbackData, error: fallbackError } = await q;
      if (fallbackError) {
        console.error("DB error[GET]/notifications (fallback):", fallbackError);
        return err(500, fallbackError.message);
      }

      return NextResponse.json({
        data: fallbackData,
        paging: {
          nextBefore: fallbackData?.length ? fallbackData[fallbackData.length - 1].created_at : null,
          limit,
        },
      });
    }

    if (firstError) {
      console.error("DB error[GET]/notifications:", firstError);
      return err(500, firstError.message);
    }

    return NextResponse.json({
      data,
      paging: {
        nextBefore: data?.length ? data[data.length - 1].created_at : null,
        limit,
      },
    });
  } catch (e: any) {
    console.error("Server error[GET]/notifications:", e);
    return err(500, "Internal server error");
  }
}

// ---------- POST /api/notifications ----------
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return err(500, "Supabase configuration missing");
  }

  const store = await cookies();
  const supabase = createServerClient(url, anon, {
    cookies: {
      get: (k) => store.get(k)?.value,
      set: (k, v, o) => store.set(k, v, o),
      remove: (k, o) => store.set(k, "", { ...o, maxAge: 0 }),
    },
  });

  // Auth
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return err(401, "Unauthorized");

  // Validate body
  let body: z.infer<typeof PostBody>;
  try {
    body = PostBody.parse(await req.json());
  } catch (e: any) {
    return err(400, e?.issues?.[0]?.message ?? "Invalid JSON");
  }

  try {
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        title: body.title,
        message: body.message,
        type: body.type,
        patient_id: user.id, // enforce ownership server-side
        read: false,
      })
      .select("*")
      .single();

    if (error) {
      console.error("DB error[POST]/notifications:", error);
      return err(500, error.message);
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (e: any) {
    console.error("Server error[POST]/notifications:", e);
    return err(500, "Internal server error");
  }
}

// ---------- PATCH /api/notifications ----------
// Body: { ids: string[], read: boolean }  → bulk mark read/unread
export async function PATCH(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return err(500, "Supabase configuration missing");
  }

  const store = await cookies();
  const supabase = createServerClient(url, anon, {
    cookies: {
      get: (k) => store.get(k)?.value,
      set: (k, v, o) => store.set(k, v, o),
      remove: (k, o) => store.set(k, "", { ...o, maxAge: 0 }),
    },
  });

  // Auth
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return err(401, "Unauthorized");

  // Validate body
  let body: z.infer<typeof PatchBody>;
  try {
    body = PatchBody.parse(await req.json());
  } catch (e: any) {
    return err(400, e?.issues?.[0]?.message ?? "Invalid JSON");
  }

  try {
    // Extra safety: ensure update is scoped to the authenticated patient
    const { data, error } = await supabase
      .from("notifications")
      .update({ read: body.read })
      .in("id", body.ids)
      .eq("patient_id", user.id)
      .select("id, read");

    if (error) {
      console.error("DB error[PATCH]/notifications:", error);
      return err(500, error.message);
    }

    return NextResponse.json({ updated: data?.map((r) => r.id) ?? [] });
  } catch (e: any) {
    console.error("Server error[PATCH]/notifications:", e);
    return err(500, "Internal server error");
  }
}
