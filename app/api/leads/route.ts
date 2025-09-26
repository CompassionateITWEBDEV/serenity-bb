import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";

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
    const raw = await req.json();
    const data = LeadSchema.parse(raw);

    const sb = supabaseAdmin(); // why: bypass RLS safely on server
    const { error } = await sb.from("leads").insert({
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone ?? null,
      subject: data.subject ?? null,
      message: data.message,
      contact_method: data.contact_method,
      source: data.source,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid payload";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
