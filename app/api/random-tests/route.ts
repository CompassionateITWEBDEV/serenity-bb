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
    
    const creatorId = auth.user.id; // Store creator ID for later use

    // Create the drug test
    const { data: drugTest, error } = await supabase.from("drug_tests").insert({
      patient_id: parsed.data.patientId,
      scheduled_for: parsed.data.scheduledFor, // TIMESTAMPTZ or NULL
      created_by: creatorId,
      status: "pending",
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
    // Try patient_id first, fallback to user_id if needed
    let notificationError: any = null;
    let notificationSuccess = false;

    // First attempt: use patient_id (preferred)
    // Note: notifications table type constraint only allows 'message', 'medicine', 'alert'
    // We'll use 'alert' type and store 'drug_test' in data.notification_type
    const insertResult = await supabase
      .from("notifications")
      .insert({
        patient_id: parsed.data.patientId,
        type: "alert", // Use 'alert' type (allowed by schema constraint)
        title: "Random Drug Test Assigned",
        message: notificationMessage,
        read: false,
        data: {
          notification_type: "drug_test", // Store actual type in data
          drug_test_id: drugTest.id,
          scheduled_for: parsed.data.scheduledFor,
          created_by: auth.user.id,
          test_type: "random"
        }
      })
      .select()
      .single();

    if (insertResult.error) {
      // If patient_id fails, try user_id (fallback for schema compatibility)
      if (insertResult.error.code === "42703" || 
          (insertResult.error.message.includes("column") && insertResult.error.message.includes("does not exist"))) {
        const fallbackResult = await supabase
          .from("notifications")
          .insert({
            user_id: parsed.data.patientId,
            type: "alert", // Use 'alert' type (allowed by schema constraint)
            title: "Random Drug Test Assigned",
            message: notificationMessage,
            read: false,
            data: {
              notification_type: "drug_test", // Store actual type in data
              drug_test_id: drugTest.id,
              scheduled_for: parsed.data.scheduledFor,
              created_by: auth.user.id,
              test_type: "random"
            }
          })
          .select()
          .single();

        if (!fallbackResult.error) {
          notificationSuccess = true;
        } else {
          notificationError = fallbackResult.error;
        }
      } else {
        notificationError = insertResult.error;
      }
    } else {
      notificationSuccess = true;
    }

    // Send real-time notification broadcast if notification was created
    if (notificationSuccess) {
      try {
        const channel = supabase.channel(`patient-notifications:${parsed.data.patientId}`);
        await channel.send({
          type: 'broadcast',
          event: 'drug_test_scheduled',
          payload: {
            drug_test_id: drugTest.id,
            patient_id: parsed.data.patientId,
            scheduled_for: parsed.data.scheduledFor,
            message: notificationMessage,
            created_at: new Date().toISOString()
          }
        });
        supabase.removeChannel(channel);
      } catch (channelError) {
        console.error("Error sending real-time notification:", channelError);
        // Don't fail if real-time notification fails
      }
    }

    if (notificationError) {
      console.error("Error creating notification:", notificationError);
      // Don't fail the drug test creation if notification fails
    }

    // Create staff notifications for pending drug tests (async, don't block response)
    try {
      const { createDrugTestNotificationServer } = await import("@/lib/notifications/staff-notifications-server");
      
      const scheduledDate = parsed.data.scheduledFor 
        ? new Date(parsed.data.scheduledFor).toLocaleDateString("en-US", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Not scheduled";
      
      const message = parsed.data.scheduledFor
        ? `A drug test has been scheduled for ${patientName} on ${scheduledDate}`
        : `A drug test has been assigned to ${patientName} (pending scheduling)`;
      
      // Create notification for all active staff (runs async, won't block response)
      createDrugTestNotificationServer(
        parsed.data.patientId,
        drugTest.id,
        patientName,
        message,
        undefined, // testStatus
        "random" // testType
      ).catch((err) => {
        console.error("Failed to create staff notification for drug test:", err);
      });
    } catch (error) {
      console.error("Error importing staff notification function:", error);
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
