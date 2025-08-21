import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;

    // TODO: Replace with your database fetch logic
    // Example: const notification = await db.notifications.findUnique({ where: { id } });

    // Mock response for testing
    const notification = {
      id,
      title: "Sample Notification",
      message: "Fetched successfully!",
      read: false,
    };

    if (!notification) {
      return NextResponse.json(
        { success: false, error: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: notification });
  } catch (error) {
    console.error("Error fetching notification:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
