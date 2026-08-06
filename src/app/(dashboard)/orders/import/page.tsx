import { requireRolePage } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { importOrderAction } from "@/lib/order-actions";
import { searchZohoOrdersByName } from "@/lib/zoho/orders";

export default async function ImportOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireRolePage(["ADMIN"]);
  const { q } = await searchParams;

  const [results, reps] = await Promise.all([
    q ? searchZohoOrdersByName(q) : Promise.resolve([]),
    prisma.user.findMany({
      where: { role: "SALES_REP" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-3xl font-extrabold">Import Order from Zoho</h1>
      <p className="text-ink-muted mt-2">
        For orders an order manager already created directly in Zoho - search by Order Name to
        pull one in so it shows up here too.
      </p>

      <form action="/orders/import" className="mt-6 flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Order Name"
          className="gp-input flex-1"
        />
        <button type="submit" className="gp-btn gp-btn-primary">
          Search
        </button>
      </form>

      {q && results.length === 0 && (
        <div className="gp-card p-8 mt-6 text-center">
          <p className="font-bold">No matching orders found in Zoho</p>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {results.map((result) => (
          <div key={result.id} className="gp-card p-5">
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <h2 className="font-extrabold">{result.name}</h2>
                <p className="text-sm text-ink-muted">
                  {result.customerName || "No customer linked"} · {result.orderStatus || "-None-"}
                </p>
              </div>
            </div>
            <form action={importOrderAction} className="mt-3 flex flex-wrap items-end gap-3">
              <input type="hidden" name="zohoOrderId" value={result.id} />
              <div>
                <label className="gp-label">Assign to rep *</label>
                <select name="assignedRepId" required defaultValue="" className="gp-input">
                  <option value="" disabled>
                    Choose a rep...
                  </option>
                  {reps.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="gp-btn gp-btn-secondary gp-btn-sm">
                Import
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
