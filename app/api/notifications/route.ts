// FILE: app/api/notifications/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = createClient(); // SSR client (cookies)
  const url = new URL(req.url);

  // Auth
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return err(401, "Unauthorized");

  // Validate query
  const parsed = GetQuery.safeParse({
    patientId: url.searchParams.get("patientId"),
    limit: url.searchParams.get("limit") ?? undefined,
    before: url.searchParams.get("before") ?? undefined,
  });
  if (!parsed.success) return err(400, parsed.error.issues[0]?.message ?? "Invalid query");

  const { patientId, limit, before } = parsed.data;

  // Enforce: patient can only read own notifications (RLS should also enforce)
  if (patientId !== user.id) return err(403, "Forbidden");

  try {
    let q = supabase
      .from("notifications")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (before) {
      // keyset pagination: created_at < before
      q = q.lt("created_at", before);
    }

    const { data, error } = await q;
    if (error) {
      console.error("DB error[GET]/notifications:", error);
      return err(500, error.message);
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
  const supabase = createClient();

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
  const supabase = createClient();

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
