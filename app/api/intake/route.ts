import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";

const IntakeSchema = z.object({
  fullName: z.string().min(1),
  dateOfBirth: z.string().min(1), // YYYY-MM-DD from <input type="date">
  email: z.string().email(),
  phone: z.string().min(5),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
  preferredContactMethod: z.enum(["phone", "email"]),
  primaryConcern: z.string().min(1),
  previousTreatment: z.enum(["yes", "no"]),
  currentMedications: z.string().optional().nullable(),
  treatmentType: z.string().optional().nullable(),
  hasInsurance: z.enum(["yes", "no"]),
  insuranceProvider: z.string().optional().nullable(),
  additionalNotes: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = IntakeSchema.parse(body);

    const sb = supabaseAdmin(); // server-only service role
    const { error } = await sb.from("intake_submissions").insert({
      full_name: input.fullName,
      date_of_birth: input.dateOfBirth,
      email: input.email,
      phone: input.phone,
      emergency_contact_name: input.emergencyContactName || null,
      emergency_contact_phone: input.emergencyContactPhone || null,
      preferred_contact_method: input.preferredContactMethod,
      primary_concern: input.primaryConcern,
      previous_treatment: input.previousTreatment,
      current_medications: input.currentMedications || null,
      treatment_type: input.treatmentType || null,
      has_insurance: input.hasInsurance,
      insurance_provider: input.insuranceProvider || null,
      additional_notes: input.additionalNotes || null,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid request";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
