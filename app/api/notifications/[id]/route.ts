import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest, context: any) {
  try {
    const id = context.params.id
    const supabase = await createClient()

    const { data: notification, error } = await supabase.from("notifications").select("*").eq("id", id).single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ success: false, error: "Notification not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: notification })
  } catch (error) {
    console.error("Error fetching notification:", error)
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, context: any) {
  try {
    const id = context.params.id
    const body = await req.json()
    const supabase = await createClient()

    const { data: notification, error } = await supabase
      .from("notifications")
      .update(body)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ success: false, error: "Failed to update notification" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: notification })
  } catch (error) {
    console.error("Error updating notification:", error)
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, context: any) {
  try {
    const id = context.params.id
    const supabase = await createClient()

    const { error } = await supabase.from("notifications").delete().eq("id", id)

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ success: false, error: "Failed to delete notification" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Notification deleted successfully" })
  } catch (error) {
    console.error("Error deleting notification:", error)
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
  }
}
