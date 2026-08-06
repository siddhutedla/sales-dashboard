import Link from "next/link";
import { signInAction } from "@/lib/auth-actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet border-2 border-ink shadow-brutal-sm text-2xl mb-4">
            👋
          </div>
          <h1 className="text-3xl font-extrabold">Welcome back</h1>
          <p className="text-ink-muted mt-1">Sign in to your sales dashboard.</p>
        </div>

        <div className="gp-card p-6 sm:p-8">
          <form action={signInAction} className="space-y-4">
            <div>
              <label htmlFor="email" className="gp-label">
                Email
              </label>
              <input id="email" name="email" type="email" required className="gp-input" />
            </div>
            <div>
              <div className="flex justify-between items-baseline">
                <label htmlFor="password" className="gp-label">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-violet hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="gp-input"
              />
            </div>
            {message && <p className="text-sm font-medium text-mint-dark">{message}</p>}
            {error && <p className="text-sm font-medium text-coral-dark">{error}</p>}
            <button type="submit" className="gp-btn gp-btn-primary w-full">
              Sign in
            </button>
          </form>
        </div>

        <p className="mt-6 text-sm text-center text-ink-muted">
          New here?{" "}
          <Link href="/signup" className="text-violet font-semibold hover:underline">
            Get Started →
          </Link>
        </p>
      </div>
    </div>
  );
}
