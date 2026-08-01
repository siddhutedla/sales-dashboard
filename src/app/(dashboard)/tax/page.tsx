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
    prisma.payout.findMany({ where: { repId: user.id }, select: { amount: true, date: true } }),
  ]);

  const totalsByYear = new Map<number, number>();
  for (const p of payouts) {
    const year = p.date.getFullYear();
    totalsByYear.set(year, (totalsByYear.get(year) ?? 0) + p.amount.toNumber());
  }
  const years = Array.from(totalsByYear.keys()).sort((a, b) => b - a);

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-3xl font-bold">Tax Documents</h1>
      <p className="text-gray-600 mt-2">
        Your confirmed income updates here automatically as payouts are recorded.
      </p>

      <div className="mt-8 bg-white rounded shadow-sm p-6">
        <h2 className="font-semibold">Income by year</h2>
        {years.length === 0 ? (
          <p className="text-sm text-gray-500 mt-2">No confirmed payouts yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100">
            {years.map((year) => (
              <li key={year} className="flex justify-between items-center py-2 gap-4">
                <span className="text-sm text-gray-500 w-16">{year}</span>
                <span className="font-medium flex-1">
                  ${totalsByYear.get(year)!.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
                {w9 ? (
                  <a
                    href={`/api/tax/1099/${user.id}/${year}`}
                    className="text-sm text-blue-600 hover:underline whitespace-nowrap"
                  >
                    Download 1099-NEC
                  </a>
                ) : (
                  <span className="text-sm text-gray-400 whitespace-nowrap">Submit your W-9</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-gray-400 mt-4">
          These are generated for recordkeeping and are not automatically filed with the IRS.
          Confirm with your tax professional or filing software before submitting.
        </p>
      </div>

      <div className="mt-8 bg-white rounded shadow-sm p-6">
        <h2 className="font-semibold">
          W-9 {w9 && <span className="text-green-700 text-sm font-normal ml-1">on file</span>}
        </h2>
        {w9 && (
          <p className="text-sm text-gray-500 mt-1">
            SSN/EIN ending in {w9.tinLast4} · last updated{" "}
            {w9.updatedAt.toLocaleDateString("en-US")}. Fill out the form below to change it.
          </p>
        )}

        <form action={submitW9Action} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Legal name</label>
              <input
                name="legalName"
                type="text"
                required
                defaultValue={w9?.legalName}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Business name (optional)
              </label>
              <input
                name="businessName"
                type="text"
                defaultValue={w9?.businessName ?? ""}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Federal tax classification
            </label>
            <select
              name="taxClassification"
              required
              defaultValue={w9?.taxClassification ?? ""}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
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
            <label className="block text-sm font-medium text-gray-700">
              SSN or EIN {w9 && "(re-enter to update)"}
            </label>
            <input
              name="tin"
              type="text"
              required
              placeholder="XXX-XX-XXXX or XX-XXXXXXX"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <input
              name="address"
              type="text"
              required
              defaultValue={w9?.address}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">City</label>
              <input
                name="city"
                type="text"
                required
                defaultValue={w9?.city}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">State</label>
              <input
                name="state"
                type="text"
                required
                defaultValue={w9?.state}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">ZIP</label>
              <input
                name="zipCode"
                type="text"
                required
                defaultValue={w9?.zipCode}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>
          </div>

          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {w9 ? "Update W-9" : "Submit W-9"}
          </button>
        </form>
      </div>
    </div>
  );
}
