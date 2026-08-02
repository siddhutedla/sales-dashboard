import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAYOUT_TYPE_LABELS: Record<string, string> = {
  BONUS: "Bonus",
  SALARY: "Salary",
  COMMISSION: "Commission",
  OTHER: "Other",
};

function formatMoney(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default async function PayoutsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const payouts = await prisma.payout.findMany({
    where: { repId: user.id },
    orderBy: { date: "desc" },
    include: { lead: { select: { company: true } } },
  });

  const totalPaid = payouts
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + p.amount.toNumber(), 0);
  const totalPending = payouts
    .filter((p) => p.status === "PENDING")
    .reduce((sum, p) => sum + p.amount.toNumber(), 0);

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-3xl font-extrabold">My Payouts</h1>
      <p className="text-ink-muted mt-2">Everything you&apos;ve been paid, most recent first.</p>

      <div className="gp-card mt-6 p-6">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h2 className="font-extrabold">History</h2>
          <span className="text-sm">
            <span className="font-bold">{formatMoney(totalPaid)} paid</span>
            {totalPending > 0 && (
              <span className="text-gold-dark font-medium ml-2">
                {formatMoney(totalPending)} pending
              </span>
            )}
          </span>
        </div>

        {payouts.length === 0 ? (
          <p className="text-sm text-ink-muted mt-4">No payouts recorded yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-ink/10">
            {payouts.map((p) => (
              <li key={p.id} className="flex justify-between items-center py-2.5 gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{p.description}</p>
                  <p className="text-xs text-ink-muted">
                    {p.date.toLocaleDateString("en-US")}
                    {p.lead && ` · ${p.lead.company}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="gp-badge gp-badge-neutral">
                    {PAYOUT_TYPE_LABELS[p.type] ?? p.type}
                  </span>
                  <span
                    className={`gp-badge ${p.status === "PAID" ? "gp-badge-mint" : "gp-badge-gold"}`}
                  >
                    {p.status === "PAID" ? "Paid" : "Pending"}
                  </span>
                  <span className="font-bold">{formatMoney(p.amount.toNumber())}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
