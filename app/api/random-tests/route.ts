import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";

const Body = z.object({
  patientId: z.string().min(1),
  scheduledFor: z.string().datetime().nullable(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = Body.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const supabase = getServerSupabase();
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
    if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Create the drug test
    const { data: drugTest, error } = await supabase.from("random_drug_tests").insert({
      patient_id: parsed.data.patientId,
      scheduled_for: parsed.data.scheduledFor, // TIMESTAMPTZ or NULL
      created_by: auth.user.id,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Get patient information for the notification
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("full_name, first_name, last_name, email")
      .eq("user_id", parsed.data.patientId)
      .single();

    if (patientError) {
      console.error("Error fetching patient info:", patientError);
    }

    // Create notification for the patient
    const patientName = patient?.full_name || 
      [patient?.first_name, patient?.last_name].filter(Boolean).join(" ").trim() || 
      "Patient";

    const scheduledDate = parsed.data.scheduledFor 
      ? new Date(parsed.data.scheduledFor).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long', 
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : "as soon as possible";

    const notificationMessage = parsed.data.scheduledFor
      ? `A random drug test has been scheduled for you on ${scheduledDate}. Please be prepared to take the test at the scheduled time.`
      : `A random drug test has been assigned to you. Please contact the facility to schedule your test.`;

    // Insert notification into the notifications table
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        patient_id: parsed.data.patientId,
        type: "drug_test",
        title: "Random Drug Test Assigned",
        message: notificationMessage,
        priority: "high",
        read: false,
        metadata: {
          drug_test_id: drugTest.id,
          scheduled_for: parsed.data.scheduledFor,
          created_by: auth.user.id,
          test_type: "random"
        }
      });

    if (notificationError) {
      console.error("Error creating notification:", notificationError);
      // Don't fail the drug test creation if notification fails
    }

    return NextResponse.json({ 
      ok: true, 
      drugTest,
      notification: notificationError ? "Drug test created but notification failed" : "Drug test created and patient notified"
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
