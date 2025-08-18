// app/api/patients/signup/route.ts
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

const isDateYYYYMMDD = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
const nil = (v?: string | null) => (v && v.trim() !== "" ? v : null);

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    // Basic validation
    if (!body?.firstName || !body?.lastName || !body?.email || !body?.password) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Lazy-create admin client at request time (prevents build-time secret errors)
    const supabaseAdmin = getSupabaseAdmin();

    // 1) Create auth user
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        role: "patient",
        firstName: body.firstName,
        lastName: body.lastName,
      },
      app_metadata: { role: "patient" },
    });

    if (createErr || !created?.user) {
      return NextResponse.json(
        { error: createErr?.message || "Auth creation failed." },
        { status: 400 }
      );
    }

    const uid = created.user.id;

    // 2) Insert patient profile
    const { error: insertErr } = await supabaseAdmin.from("patients").insert({
      id: uid,
      first_name: body.firstName,
      last_name: body.lastName,
      email: body.email,
      phone: nil(body.phone),
      date_of_birth: isDateYYYYMMDD(body.dateOfBirth) ? body.dateOfBirth : null,
      emergency_contact_name: nil(body.emergencyName),
      emergency_contact_phone: nil(body.emergencyPhone),
      emergency_contact_relationship: nil(body.emergencyRelationship),
      treatment_program: nil(body.treatmentProgram),
    });

    if (insertErr) {
      // Roll back auth user if profile insert fails
      try {
        await supabaseAdmin.auth.admin.deleteUser(uid);
      } catch {
        // ignore rollback error
      }
      return NextResponse.json({ error: insertErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, uid });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
