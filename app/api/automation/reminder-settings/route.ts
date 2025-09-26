import { ok, bad, requireUser } from "../_lib";

export async function GET(req: Request) {
  const { supabase, user } = await requireUser(req);
  if (!user) return bad("Unauthorized", 401);
  const { data, error } = await supabase.from("reminder_settings").select("*").eq("user_id", user.id).maybeSingle();
  if (error) return bad(error.message, 500);
  return ok(
    data ?? { user_id: user.id, email: true, sms: true, push: true, days_before: [1, 3], time_of_day: "09:00" }
  );
}

export async function PUT(req: Request) {
  const { supabase, user } = await requireUser(req);
  if (!user) return bad("Unauthorized", 401);
  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid JSON");
  const patch = {
    email: !!body.email,
    sms: !!body.sms,
    push: !!body.push,
    days_before: Array.isArray(body.days_before) ? body.days_before.map(Number) : null,
    time_of_day: typeof body.time_of_day === "string" ? body.time_of_day : null,
  };
  const { error } = await supabase.from("reminder_settings").upsert({ user_id: user.id, ...patch });
  if (error) return bad(error.message, 500);
  return ok({ ok: true });
}

export async function POST(req: Request) {
  const { supabase, user } = await requireUser(req);
  if (!user) return bad("Unauthorized", 401);
  const { error } = await supabase.from("reminder_settings").insert({
    user_id: user.id, email: true, sms: true, push: true, days_before: [1, 3], time_of_day: "09:00",
  }).onConflict("user_id").ignore();
  if (error) return bad(error.message, 500);
  return ok({ ok: true }, 201);
}
