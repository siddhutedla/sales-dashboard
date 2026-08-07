import Link from "next/link";
import { requireRolePage } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { togglePayoutStatusAction } from "@/lib/payout-actions";
import { DeletePayoutButton } from "@/components/DeletePayoutButton";

const PAYOUT_TYPE_LABELS: Record<string, string> = {
  BONUS: "Bonus",
  SALARY: "Salary",
  COMMISSION: "Commission",
  OTHER: "Other",
};

function formatMoney(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRolePage(["ADMIN"]);
  const { error } = await searchParams;

  const [payouts, reps] = await Promise.all([
    prisma.payout.findMany({
      orderBy: { date: "desc" },
      include: { rep: { select: { id: true, name: true } }, lead: { select: { company: true } } },
    }),
    prisma.user.findMany({
      include: { payouts: { select: { amount: true, status: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const grandTotalPaid = payouts
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + p.amount.toNumber(), 0);
  const grandTotalPending = payouts
    .filter((p) => p.status === "PENDING")
    .reduce((sum, p) => sum + p.amount.toNumber(), 0);

  const reportYears = Array.from(
    new Set(payouts.filter((p) => p.status === "PAID").map((p) => p.date.getFullYear()))
  ).sort((a, b) => b - a);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-extrabold">Manage Payouts</h1>
      <p className="text-ink-muted mt-2">
        Every payout across every rep. Add a new one from a rep&apos;s detail page.
      </p>

      {error && (
        <div className="mt-4 bg-coral/10 border-2 border-coral rounded-xl p-3 text-sm font-medium text-coral-dark">
          {error}
        </div>
      )}

      <div className="gp-card mt-6 p-6">
        <h2 className="font-extrabold">Annual reports</h2>
        <p className="text-sm text-ink-muted mt-1">
          Your own tax documents - a summary of the 1099s you&apos;ve issued, and an expense report
          for your accountant.
        </p>
        {reportYears.length === 0 ? (
          <p className="text-sm text-ink-muted mt-3">
            No paid payouts yet - reports will appear here once you mark some paid.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-ink/10">
            {reportYears.map((year) => (
              <li key={year} className="flex justify-between items-center py-2 gap-3 flex-wrap">
                <span className="text-sm font-medium">{year}</span>
                <div className="flex gap-2">
                  <a
                    href={`/api/tax/1096/${year}`}
                    className="gp-btn gp-btn-secondary gp-btn-sm"
                  >
                    1096 Summary
                  </a>
                  <a
                    href={`/api/tax/expense-report/${year}`}
                    className="gp-btn gp-btn-secondary gp-btn-sm"
                  >
                    Expense Report
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="gp-card mt-6 p-6">
        <h2 className="font-extrabold">Totals by rep</h2>
        <ul className="mt-3 divide-y divide-ink/10">
          {reps.map((r) => {
            const repPaid = r.payouts
              .filter((p) => p.status === "PAID")
              .reduce((sum, p) => sum + p.amount.toNumber(), 0);
            const repPending = r.payouts
              .filter((p) => p.status === "PENDING")
              .reduce((sum, p) => sum + p.amount.toNumber(), 0);
            return (
              <li key={r.id} className="flex justify-between items-center py-2">
                <Link
                  href={`/admin/users/${r.id}`}
                  className="text-sm font-medium text-violet hover:underline"
                >
                  {r.name}
                </Link>
                <span className="text-sm">
                  <span className="font-bold">{formatMoney(repPaid)} paid</span>
                  {repPending > 0 && (
                    <span className="text-gold-dark font-medium ml-2">
                      {formatMoney(repPending)} pending
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="gp-card mt-6 overflow-x-auto">
        <div className="flex justify-between items-center px-4 pt-4 flex-wrap gap-2">
          <h2 className="font-extrabold">All payouts</h2>
          <span className="text-sm">
            <span className="font-bold">{formatMoney(grandTotalPaid)} paid</span>
            {grandTotalPending > 0 && (
              <span className="text-gold-dark font-medium ml-2">
                {formatMoney(grandTotalPending)} pending
              </span>
            )}
          </span>
        </div>
        {payouts.length === 0 ? (
          <p className="text-sm text-ink-muted p-4">No payouts recorded yet.</p>
        ) : (
          <table className="min-w-full mt-3">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-wide text-ink-muted border-b-2 border-ink">
                <th className="px-4 py-3">Rep</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3"></th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-b border-ink/10 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${p.rep.id}`}
                      className="text-violet font-medium hover:underline"
                    >
                      {p.rep.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm">{p.date.toLocaleDateString("en-US")}</td>
                  <td className="px-4 py-3">
                    <span className="gp-badge gp-badge-neutral">
                      {PAYOUT_TYPE_LABELS[p.type] ?? p.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {p.description}
                    {p.lead && <span className="text-ink-muted"> · {p.lead.company}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`gp-badge ${p.status === "PAID" ? "gp-badge-mint" : "gp-badge-gold"}`}
                    >
                      {p.status === "PAID" ? "Paid" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold">{formatMoney(p.amount.toNumber())}</td>
                  <td className="px-4 py-3">
                    <form action={togglePayoutStatusAction.bind(null, p.id, "/payouts/admin")}>
                      <button type="submit" className="gp-btn gp-btn-secondary gp-btn-sm">
                        {p.status === "PAID" ? "Mark pending" : "Mark paid"}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <DeletePayoutButton
                      payoutId={p.id}
                      description={p.description}
                      redirectTo="/payouts/admin"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
