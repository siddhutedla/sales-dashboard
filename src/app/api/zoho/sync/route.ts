import { NextRequest, NextResponse } from "next/server";
import { pullLeadsFromZoho } from "@/lib/zoho/sync";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const syncSecret = process.env.SYNC_SECRET;

  // Verify the request is authorized (bearer token or admin role check)
  if (syncSecret && authHeader !== `Bearer ${syncSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await pullLeadsFromZoho();
    return NextResponse.json({ success: true, message: "Sync completed" });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
