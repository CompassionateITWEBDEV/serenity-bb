import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: any   // ✅ Use `any` to avoid Next.js TS mismatch
) {
  try {
    const id = context.params.id; // ✅ Access safely

    // Example DB fetch (replace with your real code)
    // const notification = await db.notifications.findUnique({ where: { id } });

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
