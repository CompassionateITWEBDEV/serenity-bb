import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type Body = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  dateOfBirth?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelationship?: string;
  treatmentProgram?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    if (!body.firstName || !body.lastName || !body.email || !body.password) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // 1) Create auth user
    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
        user_metadata: { role: "patient" },
        app_metadata: { role: "patient" },
      });

    if (createErr || !created?.user) {
      return NextResponse.json({ error: createErr?.message || "Auth creation failed." }, { status: 400 });
    }

    const uid = created.user.id;

    // 2) Insert profile
    const { error: insertErr } = await supabaseAdmin.from("patients").insert({
      id: uid,
      first_name: body.firstName,
      last_name: body.lastName,
      email: body.email,
      phone: body.phone ?? null,
      date_of_birth: body.dateOfBirth ?? null,
      emergency_contact_name: body.emergencyName ?? null,
      emergency_contact_phone: body.emergencyPhone ?? null,
      emergency_contact_relationship: body.emergencyRelationship ?? null,
      treatment_program: body.treatmentProgram ?? null,
    });

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, uid });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
