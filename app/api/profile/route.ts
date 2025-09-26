// app/api/profile/route.ts
// Server handler that uses *patients* (not profiles) and maps phone_number properly.
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

type PatientRow = {
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  date_of_birth: string | null;         // ISO date (YYYY-MM-DD)
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  treatment_program: string | null;
  avatar: string | null;
  created_at: string;
  updated_at: string;
};

type ProfilePayload = {
  patientInfo: {
    id?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    phoneNumber?: string | null;
    dateOfBirth?: string | null;
    address?: string | null;
    emergencyContact?: { name?: string; phone?: string; relationship?: string } | null;
    admissionDate?: string | null;
    treatmentType?: string | null;
    treatmentPlan?: string | null;
    primaryPhysician?: string | null;
    counselor?: string | null;
    avatar?: string | null;
    joinDate?: string | null;
  };
  achievements: Array<{ id: string | number; title: string; description: string; icon: string; date: string }>;
  healthMetrics: Array<{ label: string; value: number }>;
  recentActivity: Array<{ id: string | number; activity: string; time: string; type: "wellness" | "therapy" | "medical" | "assessment" }>;
};

function supaServer() {
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      get: (key) => cookies().get(key)?.value,
      set: () => {},
      remove: () => {},
    },
  });
}

export const dynamic = "force-dynamic";

/* GET /api/profile */
export async function GET() {
  const supabase = supaServer();

  // who am i?
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uid = auth.user.id;

  // fetch patient (seed if missing)
  let { data: patient, error } = await supabase
    .from("patients")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle<PatientRow>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!patient) {
    // seed a minimal patient row using auth info
    const seed: Partial<PatientRow> = {
      user_id: uid,
      email: auth.user.email ?? null,
      first_name: auth.user.user_metadata?.first_name ?? null,
      last_name: auth.user.user_metadata?.last_name ?? null,
      phone_number: null,
      treatment_program: "Outpatient",
    };
    const ins = await supabase.from("patients").insert(seed).select("*").single<PatientRow>();
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
    patient = ins.data!;
  }

  const payload: ProfilePayload = {
    patientInfo: {
      id: patient.user_id,
      firstName: patient.first_name ?? "",
      lastName: patient.last_name ?? "",
      email: patient.email ?? auth.user.email ?? "",
      phone: patient.phone_number,            // kept for your UI fallback
      phoneNumber: patient.phone_number,
      dateOfBirth: patient.date_of_birth,
      address: patient.address,
      emergencyContact: {
        name: patient.emergency_contact_name ?? undefined,
        phone: patient.emergency_contact_phone ?? undefined,
        relationship: patient.emergency_contact_relationship ?? undefined,
      },
      treatmentType: patient.treatment_program ?? "Outpatient",
      avatar: patient.avatar,
      joinDate: patient.created_at,
    },
    achievements: [],
    healthMetrics: [],
    recentActivity: [],
  };

  return NextResponse.json(payload, { status: 200 });
}

/* PATCH /api/profile  body: { firstName,lastName,phone,dateOfBirth } */
export async function PATCH(req: Request) {
  const supabase = supaServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const uid = auth.user.id;

  const body = await req.json().catch(() => ({}));
  const firstName: string | undefined = body.firstName;
  const lastName: string | undefined = body.lastName;
  const phone: string | undefined = body.phone;             // maps to phone_number
  const dateOfBirth: string | undefined = body.dateOfBirth; // expect YYYY-MM-DD

  const patch: Partial<PatientRow> = {};
  if (typeof firstName === "string") patch.first_name = firstName;
  if (typeof lastName === "string") patch.last_name = lastName;
  if (typeof phone === "string") patch.phone_number = phone;
  if (typeof dateOfBirth === "string" && dateOfBirth.length >= 8) patch.date_of_birth = dateOfBirth;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const { error } = await supabase.from("patients").update(patch).eq("user_id", uid);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true }, { status: 200 });
}
