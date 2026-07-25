import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken } from "@/lib/zoho/oauth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (!code) {
    return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
  }

  try {
    await exchangeCodeForToken(code);
    return NextResponse.redirect(new URL("/admin/sync?connected=true", request.url));
  } catch (error) {
    console.error("Zoho auth error:", error);
    return NextResponse.redirect(new URL("/admin/sync?error=auth_failed", request.url));
  }
}
