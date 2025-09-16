import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type Body = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  dateOfBirth?: string; // yyyy-mm-dd
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelationship?: string;
  treatmentProgram?: string;
};

const nil = (v?: string | null) => (v && v.trim() !== "" ? v : null);

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Body>;

    // validate early
    if (!body?.firstName || !body?.lastName || !body?.email || !body?.password) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }
    if (body.password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1) Create auth user (email confirmed to skip magic link)
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: body.email.toLowerCase(),
      password: body.password,
      email_confirm: true,
      user_metadata: {
        first_name: body.firstName,
        last_name: body.lastName,
        phone: nil(body.phone),
      },
    });
    if (createErr || !created?.user) {
      return NextResponse.json({ error: createErr?.message ?? "Failed to create user" }, { status: 400 });
    }
    const uid = created.user.id;

    // 2) Insert profile row (bypasses RLS via service role)
    const { error: insertErr } = await supabaseAdmin.from("profiles").insert({
      id: uid, // references auth.users(id)
      email: body.email.toLowerCase(),
      first_name: body.firstName,
      last_name: body.lastName,
      phone: nil(body.phone),
      date_of_birth: nil(body.dateOfBirth),
      emergency_contact: nil(
        [body.emergencyName, body.emergencyRelationship, body.emergencyPhone]
          .filter(Boolean)
          .join(" | ")
      ),
      treatment_type: nil(body.treatmentProgram),
      updated_at: new Date().toISOString(),
    });

    if (insertErr) {
      // rollback auth user to keep system consistent
      try {
        await supabaseAdmin.auth.admin.deleteUser(uid);
      } catch {
        /* ignore rollback failure */
      }
      return NextResponse.json({ error: insertErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, uid });
  } catch (e: any) {
    // typical cause: missing SUPABASE_SERVICE_ROLE
    console.error("❌ Signup unexpected error:", e?.message || e);
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
