import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRolePage } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptTin } from "@/lib/tax/crypto";
import { formatTin } from "@/lib/tax/format";
import {
  createPayoutAction,
  togglePayoutStatusAction,
  updateRepWageAction,
} from "@/lib/payout-actions";

const PAYOUT_TYPE_LABELS: Record<string, string> = {
  BONUS: "Bonus",
  SALARY: "Salary",
  COMMISSION: "Commission",
  OTHER: "Other",
};

function formatMoney(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default async function RepDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRolePage(["ADMIN"]);
  const { id } = await params;
  const { error } = await searchParams;

  const rep = await prisma.user.findUnique({
    where: { id },
    include: {
      w9Form: true,
      payouts: { orderBy: { date: "desc" }, include: { lead: { select: { company: true } } } },
    },
  });

  if (!rep) notFound();

  const tinFull = rep.w9Form
    ? formatTin(decryptTin(rep.w9Form.tinEncrypted), rep.w9Form.taxClassification)
    : null;

  const hourlyWage = rep.hourlyWage?.toNumber() ?? null;
  const hoursPerWeek = rep.hoursPerWeek?.toNumber() ?? null;
  const suggestedMonthly =
    hourlyWage !== null && hoursPerWeek !== null ? hourlyWage * hoursPerWeek * (52 / 12) : null;

  const now = new Date();
  const alreadyLoggedThisMonth = rep.payouts.some(
    (p) =>
      p.type === "SALARY" &&
      p.date.getFullYear() === now.getFullYear() &&
      p.date.getMonth() === now.getMonth()
  );
  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const todayStr = now.toISOString().slice(0, 10);

  const payoutYears = Array.from(new Set(rep.payouts.map((p) => p.date.getFullYear()))).sort(
    (a, b) => b - a
  );
  const totalPaid = rep.payouts
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + p.amount.toNumber(), 0);
  const totalPending = rep.payouts
    .filter((p) => p.status === "PENDING")
    .reduce((sum, p) => sum + p.amount.toNumber(), 0);

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <Link href="/admin/users" className="text-sm text-violet font-semibold hover:underline">
        ← Back to Users
      </Link>

      {error && (
        <div className="bg-coral/10 border-2 border-coral rounded-xl p-3 text-sm font-medium text-coral-dark">
          {error}
        </div>
      )}

      <div>
        <h1 className="text-3xl font-extrabold">{rep.name}</h1>
        <p className="text-ink-muted mt-1">
          {rep.email} · {rep.organization ?? "Independent"} ·{" "}
          <span className="gp-badge gp-badge-neutral">{rep.role}</span>
        </p>
      </div>

      <div className="gp-card p-6">
        <h2 className="font-extrabold">W-9</h2>
        {rep.w9Form ? (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-ink-muted">Legal name</p>
              <p className="font-medium">{rep.w9Form.legalName}</p>
            </div>
            {rep.w9Form.businessName && (
              <div>
                <p className="text-xs text-ink-muted">Business name</p>
                <p className="font-medium">{rep.w9Form.businessName}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-ink-muted">Tax classification</p>
              <p className="font-medium">{rep.w9Form.taxClassification}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">SSN / EIN</p>
              <p className="font-mono font-medium">{tinFull}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-ink-muted">Address</p>
              <p className="font-medium">
                {rep.w9Form.address}, {rep.w9Form.city}, {rep.w9Form.state} {rep.w9Form.zipCode}
              </p>
            </div>
            <div className="sm:col-span-2 text-xs text-ink-muted">
              Submitted {rep.w9Form.submittedAt.toLocaleDateString("en-US")} · Last updated{" "}
              {rep.w9Form.updatedAt.toLocaleDateString("en-US")}
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-muted mt-2">No W-9 submitted yet.</p>
        )}

        {payoutYears.length > 0 && rep.w9Form && (
          <div className="mt-4 pt-4 border-t-2 border-ink/10 flex gap-3 flex-wrap items-center">
            <span className="text-xs text-ink-muted">Download 1099-NEC:</span>
            {payoutYears.map((year) => (
              <a
                key={year}
                href={`/api/tax/1099/${rep.id}/${year}`}
                className="gp-btn gp-btn-secondary gp-btn-sm"
              >
                {year}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="gp-card p-6">
        <h2 className="font-extrabold">Compensation rate</h2>
        <p className="text-sm text-ink-muted mt-1">
          Set an hourly wage and hours/week to get a suggested monthly amount for semester pay.
        </p>
        <form action={updateRepWageAction} className="mt-4 flex flex-wrap items-end gap-4">
          <input type="hidden" name="repId" value={rep.id} />
          <div>
            <label className="gp-label">Hourly wage</label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="hourlyWage"
              defaultValue={hourlyWage ?? ""}
              className="gp-input w-32"
            />
          </div>
          <div>
            <label className="gp-label">Hours / week</label>
            <input
              type="number"
              step="0.5"
              min="0"
              name="hoursPerWeek"
              defaultValue={hoursPerWeek ?? ""}
              className="gp-input w-32"
            />
          </div>
          <button type="submit" className="gp-btn gp-btn-secondary">
            Save rate
          </button>
        </form>

        {suggestedMonthly !== null && (
          <div className="mt-4 pt-4 border-t-2 border-ink/10">
            <p className="text-sm">
              Suggested monthly amount:{" "}
              <span className="font-bold">{formatMoney(suggestedMonthly)}</span>{" "}
              <span className="text-xs text-ink-muted">
                (${hourlyWage}/hr × {hoursPerWeek} hrs/wk × 4.33 wks/mo)
              </span>
            </p>
            {alreadyLoggedThisMonth && (
              <p className="text-xs text-gold-dark font-medium mt-1">
                A salary payout is already logged for {monthLabel}.
              </p>
            )}
            <form action={createPayoutAction} className="mt-3 flex flex-wrap items-end gap-3">
              <input type="hidden" name="repId" value={rep.id} />
              <input type="hidden" name="type" value="SALARY" />
              <input type="hidden" name="redirectTo" value={`/admin/users/${rep.id}`} />
              <div>
                <label className="gp-label">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="amount"
                  defaultValue={suggestedMonthly.toFixed(2)}
                  className="gp-input w-32"
                  required
                />
              </div>
              <div>
                <label className="gp-label">Date</label>
                <input
                  type="date"
                  name="date"
                  defaultValue={todayStr}
                  className="gp-input w-40"
                  required
                />
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="gp-label">Description</label>
                <input
                  type="text"
                  name="description"
                  defaultValue={`Salary - ${monthLabel}`}
                  className="gp-input"
                  required
                />
              </div>
              <button type="submit" className="gp-btn gp-btn-primary">
                Log salary payout
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="gp-card p-6">
        <h2 className="font-extrabold">Add a bonus</h2>
        <p className="text-sm text-ink-muted mt-1">One-off extras - e.g. $50 for an intro call.</p>
        <form action={createPayoutAction} className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="repId" value={rep.id} />
          <input type="hidden" name="type" value="BONUS" />
          <input type="hidden" name="redirectTo" value={`/admin/users/${rep.id}`} />
          <div>
            <label className="gp-label">Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="amount"
              className="gp-input w-32"
              required
            />
          </div>
          <div>
            <label className="gp-label">Date</label>
            <input
              type="date"
              name="date"
              defaultValue={todayStr}
              className="gp-input w-40"
              required
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="gp-label">Description</label>
            <input
              type="text"
              name="description"
              placeholder="Intro call bonus"
              className="gp-input"
              required
            />
          </div>
          <button type="submit" className="gp-btn gp-btn-violet">
            Add bonus
          </button>
        </form>
      </div>

      <div className="gp-card p-6">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h2 className="font-extrabold">Payout history</h2>
          <span className="text-sm">
            <span className="font-bold">{formatMoney(totalPaid)} paid</span>
            {totalPending > 0 && (
              <span className="text-gold-dark font-medium ml-2">
                {formatMoney(totalPending)} pending
              </span>
            )}
          </span>
        </div>
        {rep.payouts.length === 0 ? (
          <p className="text-sm text-ink-muted mt-2">No payouts recorded yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-ink/10">
            {rep.payouts.map((p) => (
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
                  <span className="font-bold w-20 text-right">
                    {formatMoney(p.amount.toNumber())}
                  </span>
                  <form action={togglePayoutStatusAction.bind(null, p.id, `/admin/users/${rep.id}`)}>
                    <button type="submit" className="gp-btn gp-btn-secondary gp-btn-sm">
                      {p.status === "PAID" ? "Mark pending" : "Mark paid"}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
