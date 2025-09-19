import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";

const T = {
  patients: "patients",
  achievements: "patient_achievements",
  activity: "patient_activity",
  metrics: "patient_health_metrics",
} as const;

function reqEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}
const SB_URL = reqEnv("NEXT_PUBLIC_SUPABASE_URL");
const SB_ANON = reqEnv("SUPABASE_ANON_KEY");

async function getUserIdFromBearerOrCookie(req: Request): Promise<string | null> {
  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;

  // Prefer Bearer header
  if (token) {
    const sb = createClient(SB_URL, SB_ANON, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await sb.auth.getUser(token);
    if (!error && data?.user?.id) return data.user.id;
  }

  // Fallback: Supabase cookies
  try {
    // @ts-expect-error Route handlers get a standard Request; cast for cookies access.
    const nreq: NextRequest = req as any;
    const nres = NextResponse.next();
    const sbSsr = createServerClient(SB_URL, SB_ANON, {
      cookies: {
        get: (k) => nreq.cookies.get(k)?.value,
        set: (k, v, o) => nres.cookies.set({ name: k, value: v, ...o }),
        remove: (k, o) => nres.cookies.set({ name: k, value: "", ...o }),
      },
    });
    const { data, error } = await sbSsr.auth.getUser();
    if (!error && data?.user?.id) return data.user.id;
  } catch {
    // ignore
  }
  return null;
}

const PatchSchema = z.object({
  firstName: z.string().min(1).max(120).optional(),
  lastName: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(3).max(40).optional(),
  address: z.string().min(3).max(200).optional(),
  dateOfBirth: z.string().optional(),
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

export async function GET(req: Request) {
  try {
    const userId = await getUserIdFromBearerOrCookie(req);
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const sb = createClient(SB_URL, SB_ANON, { auth: { persistSession: false, autoRefreshToken: false } });
    const payload = defaults();

    const { data: patient } = await sb
      .from(T.patients)
      .select(
        "id, user_id, first_name, last_name, email, phone_number, dob, address, emergency_contact, admission_date, treatment_type, primary_physician, counselor"
      )
      .eq("user_id", userId)
      .maybeSingle();

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

      const { data: ach } = await sb
        .from(T.achievements)
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

      const { data: metrics } = await sb
        .from(T.metrics)
        .select("label, value, color")
        .eq("patient_id", patient.id);

      payload.healthMetrics =
        metrics?.map((m) => ({
          label: m.label,
          value: Math.max(0, Math.min(100, Number(m.value ?? 0))),
          color: m.color || "bg-gray-500",
        })) ?? [];

      const { data: acts } = await sb
        .from(T.activity)
        .select("id, activity, time_text, type")
        .eq("patient_id", patient.id)
        .order("id", { ascending: false })
        .limit(20);

      payload.recentActivity =
        acts?.map((r) => ({
          id: r.id,
          activity: r.activity,
          time: r.time_text,
          type: (["wellness", "therapy", "medical", "assessment"].includes(r.type) ? r.type : "assessment") as any,
        })) ?? [];
    }

    return NextResponse.json(payload);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "internal_error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await getUserIdFromBearerOrCookie(req);
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const updates = PatchSchema.parse(body);
    if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true });

    const db: Record<string, unknown> = {};
    if (updates.firstName !== undefined) db.first_name = updates.firstName;
    if (updates.lastName !== undefined) db.last_name = updates.lastName;
    if (updates.email !== undefined) db.email = updates.email.toLowerCase();
    if (updates.phone !== undefined) db.phone_number = updates.phone;
    if (updates.address !== undefined) db.address = updates.address;
    if (updates.dateOfBirth !== undefined) db.dob = updates.dateOfBirth;
    if (updates.emergencyContact !== undefined) db.emergency_contact = updates.emergencyContact;
    if (updates.treatmentType !== undefined) db.treatment_type = updates.treatmentType;
    if (updates.primaryPhysician !== undefined) db.primary_physician = updates.primaryPhysician;
    if (updates.counselor !== undefined) db.counselor = updates.counselor;

    const sb = createClient(SB_URL, SB_ANON, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await sb.from(T.patients).update(db).eq("user_id", userId);
    if (error) return NextResponse.json({ error: "db_error", message: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_payload", issues: e.issues }, { status: 422 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "internal_error" }, { status: 500 });
  }
}
