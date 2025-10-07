import { NextResponse } from "next/server";
import { getAppUser } from "@/lib/getAppUser";

export async function GET() {
  const me = await getAppUser();
  if (!me) return NextResponse.json({ error: "unauthorized or no profile" }, { status: 401 });
  return NextResponse.json(me);
}
