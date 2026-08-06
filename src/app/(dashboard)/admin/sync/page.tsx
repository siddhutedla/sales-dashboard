import { requireRolePage } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { connectZohoAction } from "@/lib/zoho-actions";

export default async function SyncPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  await requireRolePage(["ADMIN"]);
  const { connected, error } = await searchParams;

  const token = await prisma.zohoToken.findUnique({ where: { id: 1 } });
  const isConnected = !!token;

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-3xl font-extrabold">Zoho CRM Sync</h1>
      <p className="text-ink-muted mt-2">
        One-time, app-wide connection - sales reps never see this. Orders sync through whichever
        account is connected here.
      </p>

      {connected === "true" && (
        <div className="mt-4 bg-mint/10 border-2 border-mint rounded-xl p-3 text-sm font-medium">
          Connected to Zoho.
        </div>
      )}
      {error === "auth_failed" && (
        <div className="mt-4 bg-coral/10 border-2 border-coral rounded-xl p-3 text-sm font-medium text-coral-dark">
          Couldn&apos;t connect - the grant token may be expired or already used (they're
          single-use and expire in minutes). Generate a fresh one and try again.
        </div>
      )}
      {error === "missing_token" && (
        <div className="mt-4 bg-coral/10 border-2 border-coral rounded-xl p-3 text-sm font-medium text-coral-dark">
          Paste a grant token first.
        </div>
      )}

      <div className="gp-card p-8 mt-6 text-center">
        {isConnected ? (
          <>
            <p className="text-4xl mb-2">✅</p>
            <p className="font-bold">Connected</p>
            <p className="text-xs text-ink-muted mt-1">
              Last refreshed {token!.updatedAt.toLocaleString()}
            </p>
          </>
        ) : (
          <>
            <p className="text-4xl mb-2">🔄</p>
            <p className="font-bold mb-1">Not connected yet</p>
            <p className="text-xs text-ink-muted mb-4">
              No browser sign-in - this uses Zoho's Self Client method instead.
            </p>
          </>
        )}

        <details className="text-left mt-4">
          <summary className="cursor-pointer text-sm font-semibold text-violet">
            {isConnected ? "Reconnect / rotate" : "How to connect"}
          </summary>
          <ol className="text-sm text-ink-muted list-decimal list-inside mt-3 space-y-1">
            <li>
              Open the{" "}
              <a
                href="https://api-console.zoho.com/"
                target="_blank"
                rel="noreferrer"
                className="text-violet hover:underline"
              >
                Zoho API Console
              </a>{" "}
              → your Self Client.
            </li>
            <li>
              Under <strong>Generate Code</strong>, scope{" "}
              <code className="text-xs bg-ink/5 px-1 rounded">ZohoCRM.modules.ALL</code>, pick any
              expiry, and generate.
            </li>
            <li>Paste the resulting grant token below - it's single-use and expires fast.</li>
          </ol>
          <form action={connectZohoAction} className="mt-3 flex gap-2">
            <input
              type="text"
              name="grantToken"
              placeholder="Grant token"
              required
              className="gp-input flex-1"
            />
            <button type="submit" className="gp-btn gp-btn-violet">
              Connect
            </button>
          </form>
        </details>
      </div>
    </div>
  );
}
