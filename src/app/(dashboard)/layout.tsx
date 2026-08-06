import { getCurrentUser } from "@/lib/auth";
import { signOutAction } from "@/lib/auth-actions";

const navLink =
  "flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-ink hover:bg-gold/60 hover:border-ink border-2 border-transparent transition-colors";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="flex h-full">
      <aside className="w-64 bg-surface border-r-2 border-ink p-6 flex flex-col">
        <div className="flex items-center gap-2 mb-8">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gold border-2 border-ink text-lg">
            💸
          </span>
          <h2 className="text-lg font-extrabold leading-tight">Sales Dashboard</h2>
        </div>
        <nav className="space-y-1 flex-1">
          <a href="/dashboard" className={navLink}>
            📊 Dashboard
          </a>
          <a href="/payouts" className={navLink}>
            💰 Payouts
          </a>
          <a href="/orders" className={navLink}>
            📦 Orders
          </a>
          <a href="/tax" className={navLink}>
            🧾 Tax Documents
          </a>
          <a href="/email" className={`${navLink} opacity-50`}>
            📧 Email (Soon)
          </a>

          <p className="text-xs font-bold uppercase tracking-wide text-ink-muted px-4 pt-5 pb-1">
            Admin
          </p>
          <a href="/admin/users" className={navLink}>
            👤 Users
          </a>
          <a href="/payouts/admin" className={navLink}>
            💰 Payouts
          </a>
          <a href="/admin/sync" className={navLink}>
            🔄 Zoho Sync
          </a>
          <a href="/admin/tax-settings" className={navLink}>
            🧾 Tax Settings
          </a>
        </nav>
        <div className="border-t-2 border-ink/10 pt-4 mt-4">
          {user && <p className="text-sm font-semibold truncate">{user.name}</p>}
          <form action={signOutAction}>
            <button type="submit" className="gp-btn gp-btn-secondary gp-btn-sm mt-2 w-full">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-cream">{children}</main>
    </div>
  );
}
