import Link from "next/link";
import { requestPasswordResetAction } from "@/lib/auth-actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet border-2 border-ink shadow-brutal-sm text-2xl mb-4">
            🔑
          </div>
          <h1 className="text-3xl font-extrabold">Forgot password?</h1>
          <p className="text-ink-muted mt-1">We'll email you a link to reset it.</p>
        </div>

        <div className="gp-card p-6 sm:p-8">
          <form action={requestPasswordResetAction} className="space-y-4">
            <div>
              <label htmlFor="email" className="gp-label">
                Email
              </label>
              <input id="email" name="email" type="email" required className="gp-input" />
            </div>
            {error && <p className="text-sm font-medium text-coral-dark">{error}</p>}
            <button type="submit" className="gp-btn gp-btn-primary w-full">
              Send reset link
            </button>
          </form>
        </div>

        <p className="mt-6 text-sm text-center text-ink-muted">
          <Link href="/login" className="text-violet font-semibold hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
