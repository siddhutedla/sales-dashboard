export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full">
      <aside className="w-64 bg-gray-900 text-white p-6">
        <h2 className="text-2xl font-bold mb-8">Sales Dashboard</h2>
        <nav className="space-y-2">
          <a href="/dashboard" className="block px-4 py-2 rounded hover:bg-gray-700">
            Dashboard
          </a>
          <a href="/leads" className="block px-4 py-2 rounded hover:bg-gray-700">
            Leads
          </a>
          <a href="/payouts" className="block px-4 py-2 rounded hover:bg-gray-700">
            Payouts
          </a>
          <hr className="my-4" />
          <a href="/email" className="block px-4 py-2 rounded hover:bg-gray-700 opacity-60">
            📧 Email (Soon)
          </a>
          <a href="/orders" className="block px-4 py-2 rounded hover:bg-gray-700 opacity-60">
            📦 Orders (Soon)
          </a>
          <hr className="my-4" />
          <a href="/admin/users" className="block px-4 py-2 rounded hover:bg-gray-700">
            👤 Admin: Users
          </a>
          <a href="/admin/sync" className="block px-4 py-2 rounded hover:bg-gray-700">
            🔄 Admin: Zoho Sync
          </a>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}
