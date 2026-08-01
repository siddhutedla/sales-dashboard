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
      <h1 className="text-3xl font-bold">Manage Users</h1>
      <p className="text-gray-600 mt-2">Promote sales reps to admin, or step admins back down.</p>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full bg-white rounded shadow-sm">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
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
                <tr key={u.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        u.role === "ADMIN"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {u.w9Form ? (
                      <span className="text-green-700">On file (•••{u.w9Form.tinLast4})</span>
                    ) : (
                      <span className="text-gray-400">Not submitted</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm space-x-2">
                    {years.length === 0 && <span className="text-gray-400">No payouts</span>}
                    {u.w9Form &&
                      years.map((year) => (
                        <a
                          key={year}
                          href={`/api/tax/1099/${u.id}/${year}`}
                          className="text-blue-600 hover:underline"
                        >
                          {year}
                        </a>
                      ))}
                  </td>
                  <td className="px-4 py-3">
                    {u.id === admin.id ? (
                      <span className="text-sm text-gray-400">You</span>
                    ) : (
                      <form action={updateUserRoleAction}>
                        <input type="hidden" name="userId" value={u.id} />
                        <input
                          type="hidden"
                          name="role"
                          value={u.role === "ADMIN" ? "SALES_REP" : "ADMIN"}
                        />
                        <button type="submit" className="text-sm text-blue-600 hover:underline">
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
