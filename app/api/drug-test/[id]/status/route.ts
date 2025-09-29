import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";

const Body = z.object({ status: z.enum(["completed", "missed", "pending"]) });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: staffRow, error: staffErr } = await supabase.from("staff").select("user_id,active").eq("user_id", auth.user.id).maybeSingle();
  if (staffErr) return NextResponse.json({ error: staffErr.message }, { status: 500 });
  if (!staffRow || staffRow.active === false) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); } catch (e: any) { return NextResponse.json({ error: e?.message ?? "Invalid body" }, { status: 400 }); }

  const { data, error } = await supabase
    .from("drug_tests")
    .update({ status: body.status })
    .eq("id", params.id)
    .select("id,patient_id,status,scheduled_for,created_at,updated_at")
    .single();

  if (error?.code === "PGRST116") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ data });
}
