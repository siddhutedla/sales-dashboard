import Link from "next/link";
import { SignupWizard } from "./SignupWizard";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gold border-2 border-ink shadow-brutal-sm text-2xl mb-4">
            💸
          </div>
          <h1 className="text-3xl font-extrabold">Get Started</h1>
          <p className="text-ink-muted mt-1">Set up your sales account in a minute.</p>
        </div>

        <div className="gp-card p-6 sm:p-8">
          <SignupWizard error={error} />
        </div>

        <p className="mt-6 text-sm text-center text-ink-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-violet font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
