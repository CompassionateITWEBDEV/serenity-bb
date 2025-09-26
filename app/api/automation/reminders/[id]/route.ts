import { ok as OK, bad as BAD, requireUser as REQ } from "../../_lib";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { supabase, user } = await REQ(req);
  if (!user) return BAD("Unauthorized", 401);
  const { error } = await supabase.from("reminders").delete().eq("id", params.id).eq("user_id", user.id);
  if (error) return BAD(error.message, 500);
  return OK({ ok: true });
}
