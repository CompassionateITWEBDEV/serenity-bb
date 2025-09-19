// /app/api/profile/route.ts
import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

/**
 * Assumed schema (rename in TABLES below if different):
 *  - patients:        id uuid PK, user_id uuid, first_name, last_name, email, phone_number, dob, address,
 *                     emergency_contact, admission_date, treatment_type, primary_physician, counselor
 *  - patient_achievements: id, patient_id, title, description, icon, date
 *  - patient_activity:     id, patient_id, activity, time_text, type
 *  - patient_health_metrics: id, patient_id, label, value (0..100), color
 */

const TABLES = {
  patients: "patients",
  achievements: "patient_achievements",
  activity: "patient_activity",
  metrics: "patient_health_metrics",
} as const;

/* ------------------------- env + supabase (lazy) ------------------------- */
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}
let _sb: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (_sb) return _sb;
  _sb = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_ANON_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  return _sb;
}

/* ------------------------------- helpers --------------------------------- */
async function getUserIdFromBearer(req: Request): Promise<string | null> {
  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const { data, error } = await sb().auth.getUser(token);
  if (error || !data?.user?.id) return null;
  return data.user.id;
}

const PatchSchema = z.object({
  firstName: z.string().min(1).max(120).optional(),
  lastName: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(3).max(40).optional(),
  address: z.string().min(3).max(200).optional(),
  dateOfBirth: z.string().optional(), // keep string for your UI
  emergencyContact: z.string().min(3).max(120).optional(),
  treatmentType: z.string().min(1).max(80).optional(),
  primaryPhysician: z.string().min(1).max(120).optional(),
  counselor: z.string().min(1).max(120).optional(),
});

type ProfilePayload = {
  patientInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    address: string;
    emergencyContact: string;
    admissionDate: string;
    treatmentType: string;
    primaryPhysician: string;
    counselor: string;
  };
  achievements: Array<{ id: string | number; title: string; description: string; icon: string; date: string }>;
  healthMetrics: Array<{ label: string; value: number; color: string }>;
  recentActivity: Array<{ id: string | number; activity: string; time: string; type: "wellness" | "therapy" | "medical" | "assessment" }>;
};

function defaults(): ProfilePayload {
  return {
    patientInfo: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      address: "",
      emergencyContact: "",
      admissionDate: "",
      treatmentType: "Outpatient",
      primaryPhysician: "",
      counselor: "",
    },
    achievements: [],
    healthMetrics: [],
    recentActivity: [],
  };
}

/* --------------------------------- GET ----------------------------------- */
export async function GET(req: Request) {
  try {
    const userId = await getUserIdFromBearer(req);
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    // 1) Patient row
    const { data: patient, error: pErr } = await sb()
      .from(TABLES.patients)
      .select(
        "id, user_id, first_name, last_name, email, phone_number, dob, address, emergency_contact, admission_date, treatment_type, primary_physician, counselor"
      )
      .eq("user_id", userId)
      .maybeSingle();

    // If no row, return safe defaults (UI still renders)
    const payload = defaults();

    if (patient) {
      payload.patientInfo = {
        firstName: patient.first_name ?? "",
        lastName: patient.last_name ?? "",
        email: patient.email ?? "",
        phone: patient.phone_number ?? "",
        dateOfBirth: patient.dob ?? "",
        address: patient.address ?? "",
        emergencyContact: patient.emergency_contact ?? "",
        admissionDate: patient.admission_date ?? "",
        treatmentType: patient.treatment_type ?? "Outpatient",
        primaryPhysician: patient.primary_physician ?? "",
        counselor: patient.counselor ?? "",
      };
    }

    // 2) Achievements
    if (patient?.id) {
      const { data: ach } = await sb()
        .from(TABLES.achievements)
        .select("id, title, description, icon, date")
        .eq("patient_id", patient.id)
        .order("date", { ascending: false });
      payload.achievements =
        ach?.map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          icon: a.icon || "🏆",
          date: a.date,
        })) ?? [];
    }

    // 3) Health metrics
    if (patient?.id) {
      const { data: metrics } = await sb()
        .from(TABLES.metrics)
        .select("label, value, color")
        .eq("patient_id", patient.id);
      payload.healthMetrics =
        metrics?.map((m) => ({
          label: m.label,
          value: Math.max(0, Math.min(100, Number(m.value ?? 0))),
          color: m.color || "bg-gray-500",
        })) ?? [];
    }

    // 4) Recent activity
    if (patient?.id) {
      const { data: acts } = await sb()
        .from(TABLES.activity)
        .select("id, activity, time_text, type")
        .eq("patient_id", patient.id)
        .order("id", { ascending: false })
        .limit(20);
      payload.recentActivity =
        acts?.map((r) => ({
          id: r.id,
          activity: r.activity,
          time: r.time_text,
          // fallback to "assessment" if type unknown
          type: (["wellness", "therapy", "medical", "assessment"].includes(r.type) ? r.type : "assessment") as
            | "wellness"
            | "therapy"
            | "medical"
            | "assessment",
        })) ?? [];
    }

    // If there was a DB error but we still want UI to render, include message
    if (pErr) {
      return NextResponse.json({ ...payload, warning: pErr.message.slice(0, 160) });
    }
    return NextResponse.json(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "internal_error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/* -------------------------------- PATCH ---------------------------------- */
export async function PATCH(req: Request) {
  try {
    const userId = await getUserIdFromBearer(req);
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const updates = PatchSchema.parse(body);

    // Map UI fields → DB columns
    const dbUpdates: Record<string, unknown> = {};
    if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
    if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
    if (updates.email !== undefined) dbUpdates.email = updates.email.toLowerCase();
    if (updates.phone !== undefined) dbUpdates.phone_number = updates.phone;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.dateOfBirth !== undefined) dbUpdates.dob = updates.dateOfBirth;
    if (updates.emergencyContact !== undefined) dbUpdates.emergency_contact = updates.emergencyContact;
    if (updates.treatmentType !== undefined) dbUpdates.treatment_type = updates.treatmentType;
    if (updates.primaryPhysician !== undefined) dbUpdates.primary_physician = updates.primaryPhysician;
    if (updates.counselor !== undefined) dbUpdates.counselor = updates.counselor;

    if (Object.keys(dbUpdates).length === 0) {
      return NextResponse.json({ ok: true }); // nothing to update
    }

    const { error } = await sb().from(TABLES.patients).update(dbUpdates).eq("user_id", userId);
    if (error) {
      return NextResponse.json({ error: "db_error", message: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_payload", issues: e.issues }, { status: 422 });
    }
    const msg = e instanceof Error ? e.message : "internal_error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
