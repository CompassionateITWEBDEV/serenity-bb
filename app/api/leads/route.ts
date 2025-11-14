import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createLeadNotificationServer } from "@/lib/notifications/staff-notifications-server";

const LeadSchema = z.object({
  first_name: z.string().min(1, "First name required"),
  last_name: z.string().min(1, "Last name required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional().nullable(),
  subject: z.string().optional().nullable(),
  message: z.string().min(1, "Message required"),
  contact_method: z.enum(["phone", "email"]),
  source: z.string().default("contact"),
});

export async function POST(req: Request) {
  try {
    const input = LeadSchema.parse(await req.json());
    const name = `${input.first_name} ${input.last_name}`.trim(); // why: satisfy NOT NULL `name` if enforced

    const sb = supabaseAdmin();
    const { data: insertedLead, error } = await sb.from("leads").insert({
      first_name: input.first_name,
      last_name: input.last_name,
      name,                           // <- add this
      email: input.email,
      phone: input.phone ?? null,
      subject: input.subject ?? null,
      message: input.message,
      contact_method: input.contact_method,
      source: input.source,
      // status/is_spam use defaults
    }).select("id").single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Notify staff about the new contact form submission
    if (insertedLead?.id) {
      try {
        await createLeadNotificationServer(
          insertedLead.id,
          name,
          input.email,
          input.phone ?? null,
          input.message,
          input.subject ?? null,
          input.source
        );
      } catch (notifError) {
        // Log error but don't fail the request if notification fails
        console.error("Failed to create staff notification for lead:", notifError);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid payload" }, { status: 400 });
  }
}
