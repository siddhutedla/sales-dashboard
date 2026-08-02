import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { submitW9Action } from "@/lib/tax-actions";

const TAX_CLASSIFICATIONS = [
  "Individual/Sole Proprietor",
  "C Corporation",
  "S Corporation",
  "Partnership",
  "Trust/Estate",
  "LLC",
  "Other",
];

export default async function TaxPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [w9, payouts] = await Promise.all([
    prisma.w9Form.findUnique({ where: { userId: user.id } }),
    prisma.payout.findMany({
      where: { repId: user.id },
      select: { amount: true, date: true, status: true },
    }),
  ]);

  const totalsByYear = new Map<number, { paid: number; pending: number }>();
  for (const p of payouts) {
    const year = p.date.getFullYear();
    const entry = totalsByYear.get(year) ?? { paid: 0, pending: 0 };
    if (p.status === "PAID") entry.paid += p.amount.toNumber();
    else entry.pending += p.amount.toNumber();
    totalsByYear.set(year, entry);
  }
  const years = Array.from(totalsByYear.keys()).sort((a, b) => b - a);

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-3xl font-extrabold">Tax Documents</h1>
      <p className="text-ink-muted mt-2">
        Your confirmed income updates here automatically as payouts are recorded.
      </p>

      <div className="gp-card mt-8 p-6">
        <h2 className="font-extrabold">Income by year</h2>
        {years.length === 0 ? (
          <p className="text-sm text-ink-muted mt-2">No confirmed payouts yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-ink/10">
            {years.map((year) => {
              const { paid, pending } = totalsByYear.get(year)!;
              return (
                <li key={year} className="flex justify-between items-center py-2.5 gap-4">
                  <span className="text-sm text-ink-muted w-16">{year}</span>
                  <span className="flex-1">
                    <span className="font-bold">
                      $
                      {paid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                    {pending > 0 && (
                      <span className="text-xs text-gold-dark font-medium ml-2">
                        + ${pending.toLocaleString("en-US", { minimumFractionDigits: 2 })} pending
                      </span>
                    )}
                  </span>
                  {w9 ? (
                    <a
                      href={`/api/tax/1099/${user.id}/${year}`}
                      className="gp-btn gp-btn-secondary gp-btn-sm whitespace-nowrap"
                    >
                      Download 1099-NEC
                    </a>
                  ) : (
                    <span className="text-sm text-ink-muted whitespace-nowrap">
                      Submit your W-9
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-ink-muted mt-4">
          These are generated for recordkeeping and are not automatically filed with the IRS.
          Confirm with your tax professional or filing software before submitting.
        </p>
      </div>

      <div className="gp-card mt-8 p-6">
        <h2 className="font-extrabold">
          W-9 {w9 && <span className="gp-badge gp-badge-mint ml-2">on file</span>}
        </h2>
        {w9 && (
          <p className="text-sm text-ink-muted mt-2">
            SSN/EIN ending in {w9.tinLast4} · last updated{" "}
            {w9.updatedAt.toLocaleDateString("en-US")}. Fill out the form below to change it.
          </p>
        )}

        <form action={submitW9Action} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="gp-label">Legal name</label>
              <input
                name="legalName"
                type="text"
                required
                defaultValue={w9?.legalName}
                className="gp-input"
              />
            </div>
            <div>
              <label className="gp-label">Business name (optional)</label>
              <input
                name="businessName"
                type="text"
                defaultValue={w9?.businessName ?? ""}
                className="gp-input"
              />
            </div>
          </div>

          <div>
            <label className="gp-label">Federal tax classification</label>
            <select
              name="taxClassification"
              required
              defaultValue={w9?.taxClassification ?? ""}
              className="gp-input"
            >
              <option value="" disabled>
                Select one
              </option>
              {TAX_CLASSIFICATIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="gp-label">SSN or EIN {w9 && "(re-enter to update)"}</label>
            <input
              name="tin"
              type="text"
              required
              placeholder="XXX-XX-XXXX or XX-XXXXXXX"
              className="gp-input"
            />
          </div>

          <div>
            <label className="gp-label">Address</label>
            <input
              name="address"
              type="text"
              required
              defaultValue={w9?.address}
              className="gp-input"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="gp-label">City</label>
              <input
                name="city"
                type="text"
                required
                defaultValue={w9?.city}
                className="gp-input"
              />
            </div>
            <div>
              <label className="gp-label">State</label>
              <input
                name="state"
                type="text"
                required
                defaultValue={w9?.state}
                className="gp-input"
              />
            </div>
            <div>
              <label className="gp-label">ZIP</label>
              <input
                name="zipCode"
                type="text"
                required
                defaultValue={w9?.zipCode}
                className="gp-input"
              />
            </div>
          </div>

          <button type="submit" className="gp-btn gp-btn-primary">
            {w9 ? "Update W-9" : "Submit W-9"}
          </button>
        </form>
      </div>
    </div>
  );
}
