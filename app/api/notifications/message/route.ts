import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createMessageNotificationServer } from "@/lib/notifications/staff-notifications-server";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { messageId, conversationId, messagePreview } = body;

    if (!messageId || !conversationId || !messagePreview) {
      return NextResponse.json({ 
        error: "Missing required fields: messageId, conversationId, messagePreview" 
      }, { status: 400 });
    }

    // Get patient information
    const { data: patientData, error: patientError } = await supabase
      .from("patients")
      .select("first_name, last_name")
      .eq("user_id", user.id)
      .single();

    if (patientError) {
      console.error("Error fetching patient data:", patientError);
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const patientName = `${patientData.first_name} ${patientData.last_name}`.trim();

    // Create notification for staff
    await createMessageNotificationServer(
      user.id,
      messageId,
      conversationId,
      patientName,
      messagePreview
    );

    return NextResponse.json({ 
      success: true, 
      message: "Staff notification created successfully" 
    });

  } catch (error) {
    console.error("Error creating message notification:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
