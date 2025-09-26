import { ok as Okay, bad as BadReq, requireUser as Must } from "../../_lib";

function combine(dateISO: string, hhmm: string) {
  const d = new Date(dateISO); const [hh, mm] = hhmm.split(":").map(Number); d.setHours(hh, mm, 0, 0); return d.toISOString();
}
function minusDays(iso: string, days: number, hhmm: string) {
  const d = new Date(iso); d.setDate(d.getDate() - days); return combine(d.toISOString(), hhmm);
}

export async function POST(req: Request) {
  const { supabase, user } = await Must(req);
  if (!user) return BadReq("Unauthorized", 401);

  // settings
  const { data: setRow, error: sErr } = await supabase.from("reminder_settings").select("*").eq("user_id", user.id).maybeSingle();
  if (sErr) return BadReq(sErr.message, 500);
  const settings = setRow ?? { email: true, sms: true, push: true, days_before: [1,3], time_of_day: "09:00" };
  const channels = (["email","sms","push"] as const).filter((c) => settings[c]);

  // upcoming appts (use view for consistent columns)
  const now = new Date();
  const until = new Date(Date.now() + 30 * 864e5);
  const { data: apps, error: aErr } = await supabase
    .from("automation_appointments")
    .select("id, user_id, title, start_at, provider, type")
    .eq("user_id", user.id)
    .gte("start_at", now.toISOString())
    .lte("start_at", until.toISOString())
    .order("start_at");
  if (aErr) return BadReq(aErr.message, 500);

  // build rows, skip duplicates
  const rows: any[] = [];
  for (const a of apps ?? []) {
    for (const ch of channels) {
      for (const d of settings.days_before ?? []) {
        const scheduled_for = minusDays(a.start_at, Number(d), settings.time_of_day ?? "09:00");
        const message = `Reminder: "${a.title ?? "Appointment"}" on ${new Date(a.start_at).toLocaleString()}`;
        rows.push({ user_id: user.id, appointment_id: a.id, channel: ch, scheduled_for, status: "scheduled", message });
      }
    }
  }
  // insert idempotently (unique constraint will ignore conflicts)
  const { error: insErr } = await supabase.from("reminders").insert(rows).select("id");
  if (insErr && !/duplicate key value/.test(insErr.message)) return BadReq(insErr.message, 500);
  return Okay({ created: rows.length });
}
