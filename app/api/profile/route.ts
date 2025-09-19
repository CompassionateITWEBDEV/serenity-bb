// /app/api/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function supabaseForRequest(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const global: any = {};
  if (auth.toLowerCase().startsWith("bearer ")) {
    global.headers = { Authorization: auth };
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global });
}

type DbRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address: string | null;
  date_of_birth: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  treatment_type: string | null;
  avatar_url: string | null;
  admission_date: string | null;
  primary_physician: string | null;
  counselor: string | null;
};

function toPayload(row: DbRow) {
  return {
    patientInfo: {
      id: row.id,
      email: row.email ?? "",
      firstName: row.first_name ?? "",
      lastName: row.last_name ?? "",
      phone: row.phone ?? "",
      phoneNumber: row.phone ?? "",
      address: row.address ?? "",
      dateOfBirth: row.date_of_birth ?? "",
      emergencyContact: {
        name: row.emergency_contact_name ?? "",
        phone: row.emergency_contact_phone ?? "",
        relationship: "",
      },
      treatmentType: row.treatment_type ?? "Outpatient",
      treatmentPlan: row.treatment_type ?? "Outpatient",
      admissionDate: row.admission_date ?? "",
      joinDate: row.admission_date ?? "",
      primaryPhysician: row.primary_physician ?? "",
      counselor: row.counselor ?? "",
      avatar: row.avatar_url ?? null,
    },
    achievements: [],
    healthMetrics: [],
    recentActivity: [],
  };
}

function emptyPayload(userId: string, email: string | null) {
  return {
    patientInfo: {
      id: userId,
      email: email ?? "",
      firstName: "",
      lastName: "",
      phone: "",
      phoneNumber: "",
      address: "",
      dateOfBirth: "",
      emergencyContact: { name: "", phone: "", relationship: "" },
      treatmentType: "Outpatient",
      treatmentPlan: "Outpatient",
      admissionDate: "",
      joinDate: "",
      primaryPhysician: "",
      counselor: "",
      avatar: null,
    },
    achievements: [],
    healthMetrics: [],
    recentActivity: [],
  };
}

export async function GET(req: NextRequest) {
  try {
    const supabase = supabaseForRequest(req);
    const { data: userRes, error: uerr } = await supabase.auth.getUser();
    if (uerr || !userRes.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const uid = userRes.user.id;

    const { data, error } = await supabase
      .from<DbRow>("profiles")
      .select(
        "id,email,first_name,last_name,phone,address,date_of_birth,emergency_contact_name,emergency_contact_phone,treatment_type,avatar_url,admission_date,primary_physician,counselor"
      )
      .eq("id", uid)
      .single();

    if (error) {
      // If no row, return defaults so the UI can create one on save
      if (error.code === "PGRST116" || /no rows/i.test(error.message))
        return NextResponse.json(emptyPayload(uid, userRes.user.email ?? null), { status: 200 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(toPayload(data), { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = supabaseForRequest(req);
    const { data: userRes, error: uerr } = await supabase.auth.getUser();
    if (uerr || !userRes.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const uid = userRes.user.id;

    const body = await req.json();
    const update: Partial<DbRow> = {
      id: uid,
      email: userRes.user.email ?? null,
      first_name: body.firstName ?? null,
      last_name: body.lastName ?? null,
      phone: body.phone ?? body.phoneNumber ?? null,
      address: body.address ?? null,
      date_of_birth: body.dateOfBirth ?? null,
      emergency_contact_name: body.emergencyContact?.name ?? null,
      emergency_contact_phone: body.emergencyContact?.phone ?? null,
      treatment_type: body.treatmentType ?? null,
      avatar_url: body.avatar ?? null,
      primary_physician: body.primaryPhysician ?? null,
      counselor: body.counselor ?? null,
    };

    const { data, error } = await supabase
      .from<DbRow>("profiles")
      .upsert(update, { onConflict: "id", ignoreDuplicates: false })
      .select(
        "id,email,first_name,last_name,phone,address,date_of_birth,emergency_contact_name,emergency_contact_phone,treatment_type,avatar_url,admission_date,primary_physician,counselor"
      )
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(toPayload(data), { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
