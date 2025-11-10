import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Lazy-load admin client to avoid build-time errors when env vars aren't available
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceKey) {
    throw new Error("Supabase configuration missing");
  }
  
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

type Body = { firstName: string; lastName: string; email: string; password: string };

export async function POST(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: "Service role key missing on server. Ask admin to set SUPABASE_SERVICE_ROLE_KEY." },
        { status: 500 }
      );
    }

    const admin = getAdminClient();
    const { firstName, lastName, email, password } = (await req.json()) as Body;

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Create user with app_metadata.role='staff'
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // set to false if you want email verification flow
      app_metadata: { role: "staff" },
      user_metadata: { firstName, lastName },
    });

    if (createErr || !created.user) {
      return NextResponse.json({ error: createErr?.message || "Failed to create user." }, { status: 400 });
    }

    // Insert row in public.staff (matches schema provided earlier)
    const { error: staffErr } = await admin.from("staff").insert({
      user_id: created.user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      role: "staff",
      active: true,
      created_by: created.user.id,
    });

    if (staffErr) {
      // Clean up the auth user if DB insert fails
      await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
      return NextResponse.json({ error: `Failed to create staff profile: ${staffErr.message}` }, { status: 400 });
    }

    return NextResponse.json({ ok: true, userId: created.user.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
