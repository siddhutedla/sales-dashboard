import { getCurrentUser } from "@/lib/auth";
import { signOutAction } from "@/lib/auth-actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="flex h-full">
      <aside className="w-64 bg-gray-900 text-white p-6 flex flex-col">
        <h2 className="text-2xl font-bold mb-8">Sales Dashboard</h2>
        <nav className="space-y-2 flex-1">
          <a href="/dashboard" className="block px-4 py-2 rounded hover:bg-gray-700">
            Dashboard
          </a>
          <a href="/leads" className="block px-4 py-2 rounded hover:bg-gray-700">
            Leads
          </a>
          <a href="/payouts" className="block px-4 py-2 rounded hover:bg-gray-700">
            Payouts
          </a>
          <a href="/orders" className="block px-4 py-2 rounded hover:bg-gray-700">
            📦 Orders
          </a>
          <a href="/tax" className="block px-4 py-2 rounded hover:bg-gray-700">
            🧾 Tax Documents
          </a>
          <hr className="my-4" />
          <a href="/email" className="block px-4 py-2 rounded hover:bg-gray-700 opacity-60">
            📧 Email (Soon)
          </a>
          <hr className="my-4" />
          <a href="/admin/users" className="block px-4 py-2 rounded hover:bg-gray-700">
            👤 Admin: Users
          </a>
          <a href="/admin/sync" className="block px-4 py-2 rounded hover:bg-gray-700">
            🔄 Admin: Zoho Sync
          </a>
          <a href="/admin/tax-settings" className="block px-4 py-2 rounded hover:bg-gray-700">
            🧾 Admin: Tax Settings
          </a>
        </nav>
        <div className="border-t border-gray-700 pt-4 mt-4">
          {user && <p className="text-sm text-gray-300 truncate">{user.name}</p>}
          <form action={signOutAction}>
            <button
              type="submit"
              className="mt-2 w-full text-left px-4 py-2 rounded hover:bg-gray-700 text-sm"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}
