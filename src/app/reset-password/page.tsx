import Link from "next/link";
import { resetPasswordAction } from "@/lib/auth-actions";
import { createClient } from "@/lib/supabase/server";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  // By the time we're here, /auth/confirm has already exchanged the
  // recovery code and set the session cookie - this just checks it took.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-coral border-2 border-ink shadow-brutal-sm text-2xl mb-4">
            ⏱️
          </div>
          <h1 className="text-2xl font-extrabold">Link expired</h1>
          <p className="text-ink-muted mt-1">
            That reset link is invalid or has already been used.
          </p>
          <Link
            href="/forgot-password"
            className="gp-btn gp-btn-primary mt-6 inline-block"
          >
            Request a new one
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet border-2 border-ink shadow-brutal-sm text-2xl mb-4">
            🔒
          </div>
          <h1 className="text-3xl font-extrabold">Set a new password</h1>
          <p className="text-ink-muted mt-1">For {user.email}</p>
        </div>

        <div className="gp-card p-6 sm:p-8">
          <form action={resetPasswordAction} className="space-y-4">
            <div>
              <label htmlFor="password" className="gp-label">
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                className="gp-input"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="gp-label">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={6}
                className="gp-input"
              />
            </div>
            {error && <p className="text-sm font-medium text-coral-dark">{error}</p>}
            <button type="submit" className="gp-btn gp-btn-primary w-full">
              Update password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
