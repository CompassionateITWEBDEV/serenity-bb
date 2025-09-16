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

    // 1️⃣ Check if a patient with this email already exists
    const { data: existingPatient, error: existingErr } = await supabaseAdmin
      .from("patients")
      .select("user_id")
      .eq("email", body.email)
      .maybeSingle();

    if (existingErr) {
      console.error("❌ Error checking existing patient:", existingErr.message);
      return NextResponse.json({ error: "Database error." }, { status: 500 });
    }

    if (existingPatient) {
      return NextResponse.json(
        { error: "Patient already exists. Please log in instead." },
        { status: 409 }
      );
    }

    // 2️⃣ Create Supabase Auth user
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

    // 3️⃣ Insert or update patient profile (safe insert)
    const { error: insertErr } = await supabaseAdmin.from("patients").upsert({
      user_id: uid, // ✅ Use user_id instead of id
      first_name: body.firstName,
      last_name: body.lastName,
      full_name: `${body.firstName} ${body.lastName}`,
      email: body.email,
      phone_number: nil(body.phone),
      date_of_birth: isDateYYYYMMDD(body.dateOfBirth)
        ? body.dateOfBirth
        : null,
      emergency_contact_name: nil(body.emergencyName),
      emergency_contact_phone: nil(body.emergencyPhone),
      emergency_contact_relationship: nil(body.emergencyRelationship),
      treatment_program: nil(body.treatmentProgram),
      created_at: new Date().toISOString(),
    });

    if (insertErr) {
      // 🔄 Roll back auth user if patient insert fails
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
    console.error("❌ Unexpected error:", e.message);
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
