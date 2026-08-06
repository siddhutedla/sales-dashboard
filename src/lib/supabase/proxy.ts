import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Called from src/proxy.ts (this Next.js version's replacement for middleware.ts).
// Refreshes the Supabase session cookie on every request - required because
// Server Components can read cookies but can't write them.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute =
    path.startsWith("/login") || path.startsWith("/signup") || path.startsWith("/forgot-password");
  const isApiRoute = path.startsWith("/api");
  // /auth/confirm exchanges the code and sets the session itself - it must
  // be reachable while logged out (that's the whole point). /reset-password
  // is reachable either logged out (mid recovery-code exchange) or logged
  // in (rotating your password) - it's deliberately not in isAuthRoute, so
  // a logged-in user landing there via a recovery link isn't bounced to
  // /dashboard before they can actually set the new password.
  const isPasswordResetFlow = path.startsWith("/auth/") || path.startsWith("/reset-password");

  if (!user && !isAuthRoute && !isApiRoute && !isPasswordResetFlow) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
