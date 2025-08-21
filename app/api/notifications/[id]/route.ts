import { NextRequest, NextResponse } from "next/server";

// ✅ Correctly typed GET route handler for Next.js App Router
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Example: Fetch the notification from your database
    // Replace this with your actual DB logic
    // const notification = await db.notifications.findUnique({ where: { id } });

    // Mock response (delete this when DB is connected)
    const notification = {
      id,
      title: "Test Notification",
      message: "This is a sample notification fetched successfully!",
      read: false,
    };

    if (!notification) {
      return NextResponse.json(
        { success: false, error: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error("GET /api/notifications/[id] failed:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
