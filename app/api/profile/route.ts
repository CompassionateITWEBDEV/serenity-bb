import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";

/** TABLE NAMES (match your Supabase project) */
const T = {
  profiles: "profiles",
  weeklyGoals: "weekly_goals",
  weeklyData: "weekly_data",
  progressMetrics: "progress_metrics",
} as const;

/** ENV */
function reqEnv(n: string) { const v = process.env[n]; if (!v) throw new Error(`Missing env: ${n}`); return v; }
const SB_URL = reqEnv("NEXT_PUBLIC_SUPABASE_URL");
const SB_ANON = reqEnv("SUPABASE_ANON_KEY");

/** Auth: Bearer first, then Supabase cookies */
async function getUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
  if (token) {
    const sb = createClient(SB_URL, SB_ANON, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data } = await sb.auth.getUser(token);
    if (data?.user?.id) return data.user.id;
  }
  try {
    const nreq = req as unknown as NextRequest;
    const nres = NextResponse.next();
    const ssr = createServerClient(SB_URL, SB_ANON, {
      cookies: {
        get: (k) => nreq.cookies.get(k)?.value,
        set: (k, v, o) => nres.cookies.set({ name: k, value: v, ...o }),
        remove: (k, o) => nres.cookies.set({ name: k, value: "", ...o }),
      },
    });
    const { data } = await ssr.auth.getUser();
    if (data?.user?.id) return data.user.id;
  } catch {}
  return null;
}

/** Payload + validation */
const PatchSchema = z.object({
  firstName: z.string().min(1).max(120).optional(),
  lastName: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(3).max(40).optional(),
  address: z.string().min(3).max(200).optional(),
  dateOfBirth: z.string().optional(),
  emergencyContact: z.string().min(3).max(200).optional(),
  treatmentType: z.string().min(1).max(80).optional(),
  primaryPhysician: z.string().min(1).max(120).optional(),   // kept for UI; ignored if column absent
  counselor: z.string().min(1).max(120).optional(),          // kept for UI; ignored if column absent
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
  recentActivity: Array<{ id: string | number; activity: string; time: string; type: "wellness"|"therapy"|"medical"|"assessment" }>;
};

function defaults(): ProfilePayload {
  return {
    patientInfo: {
      firstName: "", lastName: "", email: "", phone: "",
      dateOfBirth: "", address: "", emergencyContact: "",
      admissionDate: "", treatmentType: "Outpatient",
      primaryPhysician: "", counselor: "",
    },
    achievements: [],            // not modeled here; you can wire patient_rewards later
    healthMetrics: [],
    recentActivity: [],
  };
}

/** GET */
export async function GET(req: Request) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const sb = createClient(SB_URL, SB_ANON, { auth: { persistSession: false, autoRefreshToken: false } });
    const payload = defaults();

    // PROFILES (your screenshot’s columns)
    const { data: profile, error: pErr } = await sb
      .from(T.profiles)
      .select("user_id,email,first_name,last_name,phone,date_of_birth,address,emergency_contact,treatment_type,created_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });

    if (profile) {
      payload.patientInfo = {
        firstName: profile.first_name ?? "",
        lastName: profile.last_name ?? "",
        email: profile.email ?? "",
        phone: profile.phone ?? "",
        dateOfBirth: profile.date_of_birth ?? "",
        address: profile.address ?? "",
        emergencyContact: profile.emergency_contact ?? "",
        admissionDate: profile.created_at ?? "",
        treatmentType: profile.treatment_type ?? "Outpatient",
        primaryPhysician: "", // not in table; leave blank for UI
        counselor: "",        // not in table; leave blank for UI
      };
    }

    // PROGRESS METRICS
    const { data: metrics } = await sb
      .from(T.progressMetrics)
      .select("label,value,color")
      .eq("user_id", userId);
    payload.healthMetrics = (metrics ?? []).map((m) => ({
      label: m.label,
      value: Math.max(0, Math.min(100, Number(m.value ?? 0))),
      color: m.color || "bg-gray-500",
    }));

    // WEEKLY DATA (for “Recent Activity/Trends” appearance)
    const { data: wdata } = await sb
      .from(T.weeklyData)
      .select("id,week,wellness,attendance,goals,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(12);

    payload.recentActivity = (wdata ?? []).map((w) => ({
      id: w.id,
      activity: `Week ${w.week}: wellness ${w.wellness}/10, attendance ${w.attendance}%`,
      time: new Date(w.created_at ?? Date.now()).toLocaleDateString(),
      type: "assessment",
    }));

    // ACHIEVEMENTS (optional: map weekly_goals completed as achievements)
    const { data: goals } = await sb
      .from(T.weeklyGoals)
      .select("id,name,target,current,updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(6);
    payload.achievements = (goals ?? [])
      .filter((g) => Number(g.current ?? 0) >= Number(g.target ?? 0) && g.target != null)
      .map((g) => ({
        id: g.id,
        title: g.name ?? "Goal",
        description: `Completed ${g.current}/${g.target}`,
        icon: "🏆",
        date: new Date(g.updated_at ?? Date.now()).toISOString().slice(0, 10),
      }));

    return NextResponse.json(payload);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "internal_error" }, { status: 500 });
  }
}

/** PATCH → updates `profiles` */
export async function PATCH(req: Request) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const updates = PatchSchema.parse(body);
    if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true });

    // map to your columns
    const db: Record<string, unknown> = {};
    if (updates.firstName !== undefined) db.first_name = updates.firstName;
    if (updates.lastName !== undefined) db.last_name = updates.lastName;
    if (updates.email !== undefined) db.email = updates.email.toLowerCase();
    if (updates.phone !== undefined) db.phone = updates.phone;
    if (updates.address !== undefined) db.address = updates.address;
    if (updates.dateOfBirth !== undefined) db.date_of_birth = updates.dateOfBirth;
    if (updates.emergencyContact !== undefined) db.emergency_contact = updates.emergencyContact;
    if (updates.treatmentType !== undefined) db.treatment_type = updates.treatmentType;
    // primaryPhysician/counselor left out (not in profiles)

    const sb = createClient(SB_URL, SB_ANON, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await sb.from(T.profiles).update(db).eq("user_id", userId);
    if (error) return NextResponse.json({ error: "db_error", message: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_payload", issues: e.issues }, { status: 422 });
    return NextResponse.json({ error: e instanceof Error ? e.message : "internal_error" }, { status: 500 });
  }
}
