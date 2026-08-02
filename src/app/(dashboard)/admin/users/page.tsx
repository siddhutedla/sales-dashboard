import { requireRolePage } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateUserRoleAction } from "@/lib/admin-actions";

export default async function UsersPage() {
  const admin = await requireRolePage(["ADMIN"]);
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: { w9Form: true, payouts: { select: { amount: true, date: true } } },
  });

  return (
    <div className="p-8">
      <h1 className="text-3xl font-extrabold">Manage Users</h1>
      <p className="text-ink-muted mt-2">Promote sales reps to admin, or step admins back down.</p>

      <div className="gp-card mt-6 overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="text-left text-xs font-bold uppercase tracking-wide text-ink-muted border-b-2 border-ink">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Org</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">W-9</th>
              <th className="px-4 py-3">1099-NEC</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const years = Array.from(new Set(u.payouts.map((p) => p.date.getFullYear()))).sort(
                (a, b) => b - a
              );

              return (
                <tr key={u.id} className="border-b border-ink/10 last:border-0">
                  <td className="px-4 py-3 font-semibold">{u.name}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3 text-sm">
                    {u.organization ?? <span className="text-ink-muted">Independent</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`gp-badge ${u.role === "ADMIN" ? "gp-badge-violet" : "gp-badge-neutral"}`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {u.w9Form ? (
                      <span className="text-mint-dark font-medium">
                        On file (•••{u.w9Form.tinLast4})
                      </span>
                    ) : (
                      <span className="text-ink-muted">Not submitted</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm space-x-2">
                    {years.length === 0 && <span className="text-ink-muted">No payouts</span>}
                    {u.w9Form &&
                      years.map((year) => (
                        <a
                          key={year}
                          href={`/api/tax/1099/${u.id}/${year}`}
                          className="text-violet font-semibold hover:underline"
                        >
                          {year}
                        </a>
                      ))}
                  </td>
                  <td className="px-4 py-3">
                    {u.id === admin.id ? (
                      <span className="text-sm text-ink-muted">You</span>
                    ) : (
                      <form action={updateUserRoleAction}>
                        <input type="hidden" name="userId" value={u.id} />
                        <input
                          type="hidden"
                          name="role"
                          value={u.role === "ADMIN" ? "SALES_REP" : "ADMIN"}
                        />
                        <button type="submit" className="gp-btn gp-btn-secondary gp-btn-sm">
                          {u.role === "ADMIN" ? "Revoke admin" : "Make admin"}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
