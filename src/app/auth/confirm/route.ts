import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Password-reset (and any other) email links land here first. This has to
// be a Route Handler, not a Server Component page - only Route Handlers
// and Server Actions can actually persist the Set-Cookie from exchanging
// the code (see the comment in lib/supabase/server.ts); a page render
// would silently drop it and the session wouldn't survive past this request.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") || "/orders";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(
    new URL(
      `/login?error=${encodeURIComponent("That link is invalid or has expired.")}`,
      request.url
    )
  );
}
