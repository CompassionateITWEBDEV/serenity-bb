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

    // ✅ Basic validation
    if (!body?.firstName || !body?.lastName || !body?.email || !body?.password) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // ✅ Initialize Supabase Admin client
    const supabaseAdmin = getSupabaseAdmin();

    // 1️⃣ Create Supabase Auth user
    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
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

    // 2️⃣ Insert patient profile into "patients"
    const { error: insertErr } = await supabaseAdmin.from("patients").insert({
      user_id: uid, // ✅ FIXED — use user_id instead of id
      first_name: body.firstName,
      last_name: body.lastName,
      full_name: `${body.firstName} ${body.lastName}`, // ✅ store combined name
      email: body.email,
      phone_number: nil(body.phone), // ✅ match schema column name
      date_of_birth: isDateYYYYMMDD(body.dateOfBirth)
        ? body.dateOfBirth
        : null,
      emergency_contact_name: nil(body.emergencyName),
      emergency_contact_phone: nil(body.emergencyPhone),
      emergency_contact_relationship: nil(body.emergencyRelationship),
      treatment_program: nil(body.treatmentProgram),
      created_at: new Date().toISOString(), // ✅ ensure timestamp is set
    });

    if (insertErr) {
      // 🔄 Rollback auth user if patient insert fails
      try {
        await supabaseAdmin.auth.admin.deleteUser(uid);
      } catch {
        // ignore rollback errors
      }
      return NextResponse.json({ error: insertErr.message }, { status: 400 });
    }

    // ✅ Success response
    return NextResponse.json({ ok: true, uid });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
