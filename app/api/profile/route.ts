import { NextRequest, NextResponse } from "next/server";
import { supabaseForToken } from "@/lib/supabase/server";
import { getBearerTokenFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = getBearerTokenFromRequest();
  const sb = supabaseForToken(token);

  const { data: userRes, error: userErr } = await sb.auth.getUser();
  if (userErr || !userRes.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = userRes.user.id;

  // patient (one per user) – or latest by created_at
  const { data: patient, error: pErr } = await sb
    .from("patients")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });

  const patientId = patient?.id;

  // related
  const [{ data: achievements }, { data: healthMetrics }, { data: recentActivity }] = await Promise.all([
    patientId
      ? sb.from("patient_achievements").select("*").eq("user_id", userId).eq("patient_id", patientId).order("date", { ascending: false })
      : Promise.resolve({ data: [] as any }),
    patientId
      ? sb.from("patient_health_metrics").select("*").eq("user_id", userId).eq("patient_id", patientId).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as any }),
    patientId
      ? sb.from("patient_activity").select("*").eq("user_id", userId).eq("patient_id", patientId).order("time", { ascending: false }).limit(25)
      : Promise.resolve({ data: [] as any }),
  ]);

  return NextResponse.json({
    patientInfo: patient
      ? {
          id: patient.id,
          firstName: patient.first_name,
          lastName: patient.last_name,
          email: patient.email,
          phone: patient.phone,
          dateOfBirth: patient.date_of_birth ?? null,
          address: patient.address,
          emergencyContact: patient.emergency_contact,
          admissionDate: patient.admission_date,
          treatmentType: patient.treatment_type,
          treatmentPlan: patient.treatment_plan,
          primaryPhysician: patient.primary_physician,
          counselor: patient.counselor,
          avatar: patient.avatar,
          joinDate: patient.join_date,
        }
      : null,
    achievements: (achievements ?? []).map((a) => ({
      id: a.id, title: a.title, description: a.description, icon: a.icon, date: a.date,
    })),
    healthMetrics: (healthMetrics ?? []).map((m) => ({ label: m.label, value: Number(m.value) })),
    recentActivity: (recentActivity ?? []).map((r) => ({
      id: r.id, activity: r.activity, time: r.time, type: r.type,
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const token = getBearerTokenFromRequest();
  const sb = supabaseForToken(token);
  const { data: userRes, error: userErr } = await sb.auth.getUser();
  if (userErr || !userRes.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = userRes.user.id;

  const body = await req.json().catch(() => ({}));
  const payload: any = {
    first_name: body.firstName,
    last_name: body.lastName,
    phone: body.phone ?? body.phoneNumber,
    date_of_birth: body.dateOfBirth || null,
  };

  // ensure record exists
  const { data: patient } = await sb.from("patients").select("id").eq("user_id", userId).limit(1).maybeSingle();
  if (!patient) {
    const { error: insErr } = await sb.from("patients").insert({
      user_id: userId,
      email: userRes.user.email,
      ...payload,
    });
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const { error: updErr } = await sb.from("patients").update(payload).eq("id", patient.id).eq("user_id", userId);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
