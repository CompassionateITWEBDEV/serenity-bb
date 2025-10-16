import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSubmissionNotificationServer } from "@/lib/notifications/staff-notifications-server";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { submissionId, submissionType, patientName } = body;

    if (!submissionId || !submissionType || !patientName) {
      return NextResponse.json({ 
        error: "Missing required fields: submissionId, submissionType, patientName" 
      }, { status: 400 });
    }

    // Create notification for staff
    await createSubmissionNotificationServer(
      user.id,
      submissionId,
      submissionType,
      patientName
    );

    return NextResponse.json({ 
      success: true, 
      message: "Staff notification created successfully" 
    });

  } catch (error) {
    console.error("Error creating submission notification:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
