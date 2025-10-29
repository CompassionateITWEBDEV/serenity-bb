import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/patient/drug-tests
 * Fetches drug tests for the authenticated patient
 */
export async function GET() {
  try {
    const supabase = getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch drug tests for this patient
    const { data: drugTests, error: drugTestsError } = await supabase
      .from("random_drug_tests")
      .select("id, status, scheduled_for, created_at, metadata")
      .eq("patient_id", user.id)
      .order("created_at", { ascending: false });

    if (drugTestsError) {
      console.error("Error fetching drug tests:", drugTestsError);
      return NextResponse.json(
        { error: "Failed to fetch drug tests", details: drugTestsError.message },
        { status: 500 }
      );
    }

    // Format the data for the frontend
    const formattedTests = (drugTests || []).map((test) => ({
      id: test.id,
      status: test.status || "pending",
      scheduledFor: test.scheduled_for,
      createdAt: test.created_at,
      metadata: test.metadata || {},
    }));

    return NextResponse.json({ drugTests: formattedTests });
  } catch (error: any) {
    console.error("Error in GET /api/patient/drug-tests:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}

