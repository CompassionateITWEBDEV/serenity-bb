import { ok as Ok, bad as Bad, requireUser as RequireUser } from "../_lib";

export async function GET(req: Request) {
  const { supabase, user } = await RequireUser(req);
  if (!user) return Bad("Unauthorized", 401);
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? new Date(Date.now() - 7 * 864e5).toISOString();
  const to = searchParams.get("to") ?? new Date(Date.now() + 60 * 864e5).toISOString();
  const { data, error } = await supabase
    .from("reminders").select("*")
    .eq("user_id", user.id)
    .gte("scheduled_for", from).lte("scheduled_for", to)
    .order("scheduled_for", { ascending: true });
  if (error) return Bad(error.message, 500);
  return Ok(data ?? []);
}

export async function POST(req: Request) {
  const { supabase, user } = await RequireUser(req);
  if (!user) return Bad("Unauthorized", 401);
  const body = await req.json().catch(() => null);
  if (!body) return Bad("Invalid JSON");
  const row = {
    user_id: user.id,
    appointment_id: body.appointment_id,
    channel: body.channel, // 'email'|'sms'|'push'
    scheduled_for: body.scheduled_for,
    status: body.status ?? "scheduled",
    message: body.message ?? null,
  };
  const { data, error } = await supabase.from("reminders").insert(row).select("*").single();
  if (error) return Bad(error.message, 500);
  return Ok(data, 201);
}
