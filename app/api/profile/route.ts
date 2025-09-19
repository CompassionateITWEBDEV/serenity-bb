// /app/api/profile/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";

const T = {
  profiles: "profiles",
  weeklyGoals: "weekly_goals",
  weeklyData: "weekly_data",
  progressMetrics: "progress_metrics",
} as const;

function envOrThrow(n: string) {
  const v = process.env[n];
  if (!v) throw new Error(`Missing env: ${n}`);
  return v;
}
const SB_URL = envOrThrow("NEXT_PUBLIC_SUPABASE_URL");
const SB_ANON = envOrThrow("SUPABASE_ANON_KEY");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function tryParseJwtOrB64(jsonish: string) {
  try {
    const seg = jsonish.includes(".") ? jsonish.split(".")[1] : jsonish;
    const s = Buffer.from(seg.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/** Resolves user by (1) Supabase Bearer, (2) Supabase cookies, (3) legacy cookies containing uuid/email */
async function resolveIdentity(req: Request): Promise<{ uid?: string; email?: string } | null> {
  // 1) Bearer token
  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
  if (token) {
    const sb = createClient(SB_URL, SB_ANON, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data } = await sb.auth.getUser(token);
    if (data?.user?.id) return { uid: data.user.id, email: data.user.email ?? undefined };
  }

  // 2) Supabase cookies
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
    if (data?.user?.id) return { uid: data.user.id, email: data.user.email ?? undefined };
  } catch {}

  // 3) Legacy cookie
  try {
    const nreq = req as unknown as NextRequest;
    const raw = nreq.cookies.get("auth_token")?.value || nreq.cookies.get("patient_auth")?.value || "";
    if (!raw) return null;

    if (UUID_RE.test(raw)) return { uid: raw };
    const j = tryParseJwtOrB64(raw) || tryParseJwtOrB64(raw.split(".")[1] || "");
    if (j) {
      const candUid = j.uid || j.userId || j.id || j.sub;
      if (typeof candUid === "string" && UUID_RE.test(candUid)) return { uid: candUid };
      const email = j.email || j.user?.email;
      if (typeof email === "string" && email.includes("@")) return { email };
    }
  } catch {}

  return null;
}

type ProfilePayload = {
  patientInfo: {
    firstName: string; lastName: string; email: string; phone: string; dateOfBirth: string;
    address: string; emergencyContact: string; admissionDate: string; treatmentType: string;
    primaryPhysician: string; counselor: string;
  };
  achievements: Array<{ id: number | string; title: string; description: string; icon: string; date: string }>;
  healthMetrics: Array<{ label: string; value: number; color: string }>;
  recentActivity: Array<{ id: number | string; activity: string; time: string; type: "wellness" | "therapy" | "medical" | "assessment" }>;
};

function defaultPayload(): ProfilePayload {
  return {
    patientInfo: {
      firstName: "", lastName: "", email: "", phone: "", dateOfBirth: "",
      address: "", emergencyContact: "", admissionDate: "", treatmentType: "Outpatient",
      primaryPhysician: "", counselor: "",
    },
    achievements: [],
    healthMetrics: [],
    recentActivity: [],
  };
}

const PatchSchema = z.object({
  firstName: z.string().min(1).max(120).optional(),
  lastName: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(3).max(40).optional(),
  address: z.string().min(3).max(200).optional(),
  dateOfBirth: z.string().optional(),
  emergencyContact: z.string().min(3).max(200).optional(),
  treatmentType: z.string().min(1).max(80).optional(),
  primaryPhysician: z.string().optional(), // UI-only
  counselor: z.string().optional(),        // UI-only
});

export async function GET(req: Request) {
  try {
    const who = await resolveIdentity(req);
    if (!who) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const sb = createClient(SB_URL, SB_ANON, { auth: { persistSession: false, autoRefreshToken: false } });
    let payload = defaultPayload();

    // Load or auto-provision profile
    let profile:
      | {
          id: string; email: string | null; first_name: string | null; last_name: string | null; phone: string | null;
          date_of_birth: string | null; address: string | null; emergency_contact: string | null;
          treatment_type: string | null; created_at: string | null;
        }
      | null = null;

    if (who.uid) {
      const { data } = await sb
        .from(T.profiles)
        .select("id,email,first_name,last_name,phone,date_of_birth,address,emergency_contact,treatment_type,created_at")
        .eq("id", who.uid)
        .maybeSingle();
      profile = data ?? null;

      if (!profile) {
        // Auto-provision minimal row (requires insert policy)
        const email = who.email ?? null;
        await sb.from(T.profiles).insert({ id: who.uid, email }).select().maybeSingle().catch(() => null);
        const again = await sb
          .from(T.profiles)
          .select("id,email,first_name,last_name,phone,date_of_birth,address,emergency_contact,treatment_type,created_at")
          .eq("id", who.uid)
          .maybeSingle();
        profile = again.data ?? null;
      }
    } else if (who.email) {
      const { data } = await sb
        .from(T.profiles)
        .select("id,email,first_name,last_name,phone,date_of_birth,address,emergency_contact,treatment_type,created_at")
        .eq("email", who.email.toLowerCase())
        .maybeSingle();
      profile = data ?? null;
    }

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
        primaryPhysician: "",
        counselor: "",
      };

      const owner = profile.id;

      // metrics
      const { data: metrics } = await sb
        .from(T.progressMetrics)
        .select("label,value,color,user_id,profile_id")
        .or(`user_id.eq.${owner},profile_id.eq.${owner}`);
      payload.healthMetrics = (metrics ?? []).map((m) => ({
        label: m.label,
        value: Math.max(0, Math.min(100, Number(m.value ?? 0))),
        color: m.color || "bg-gray-500",
      }));

      // weekly data → recent activity
      const { data: wdata } = await sb
        .from(T.weeklyData)
        .select("id,week,wellness,attendance,goals,created_at,user_id,profile_id")
        .or(`user_id.eq.${owner},profile_id.eq.${owner}`)
        .order("created_at", { ascending: false })
        .limit(12);
      payload.recentActivity = (wdata ?? []).map((w) => ({
        id: w.id,
        activity: `Week ${w.week}: wellness ${w.wellness}/10, attendance ${w.attendance}%`,
        time: new Date(w.created_at ?? Date.now()).toLocaleDateString(),
        type: "assessment",
      }));

      // achievements (basic: completed goals)
      const { data: goals } = await sb
        .from(T.weeklyGoals)
        .select("id,name,target,current,updated_at,user_id,profile_id")
        .or(`user_id.eq.${owner},profile_id.eq.${owner}`)
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
    }

    return NextResponse.json(payload);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "internal_error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const who = await resolveIdentity(req);
    if (!who) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const updates = PatchSchema.parse(body);
    if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true });

    const sb = createClient(SB_URL, SB_ANON, { auth: { persistSession: false, autoRefreshToken: false } });
    const db: Record<string, unknown> = {};
    if (updates.firstName !== undefined) db.first_name = updates.firstName;
    if (updates.lastName !== undefined) db.last_name = updates.lastName;
    if (updates.email !== undefined) db.email = updates.email.toLowerCase();
    if (updates.phone !== undefined) db.phone = updates.phone;
    if (updates.address !== undefined) db.address = updates.address;
    if (updates.dateOfBirth !== undefined) db.date_of_birth = updates.dateOfBirth;
    if (updates.emergencyContact !== undefined) db.emergency_contact = updates.emergencyContact;
    if (updates.treatmentType !== undefined) db.treatment_type = updates.treatmentType;

    if (who.uid) {
      const { error } = await sb.from(T.profiles).update(db).eq("id", who.uid);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    } else if (who.email) {
      const { error } = await sb.from(T.profiles).update(db).eq("email", who.email.toLowerCase());
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    } else {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_payload", issues: e.issues }, { status: 422 });
    return NextResponse.json({ error: e instanceof Error ? e.message : "internal_error" }, { status: 500 });
  }
}
