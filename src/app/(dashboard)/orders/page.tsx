import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  refreshFromZohoAction,
  retryZohoSyncAction,
  updateOrderStatusAction,
} from "@/lib/order-actions";
import { createPayoutAction } from "@/lib/payout-actions";
import { zohoOrderUrl } from "@/lib/zoho/orders";
import { ZOHO_ORDER_STATUS_OPTIONS, ZOHO_PREORDER_STATUS_OPTIONS } from "@/types/zoho";

function formatMoney(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const ATTENTION_STATUSES = new Set(["Red Alert", "Shipped and Stuck in Delivery"]);

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const orders = await prisma.order.findMany({
    where: user.role === "ADMIN" ? {} : { lead: { assignedRepId: user.id } },
    include: {
      lead: {
        include: {
          assignedRep: true,
          payouts: { where: { type: "COMMISSION" }, orderBy: { date: "desc" } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="p-8">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Orders</h1>
          <p className="text-ink-muted mt-2">
            Every order created here is pushed straight into Zoho's Orders module.
          </p>
        </div>
        <div className="flex gap-2">
          {user.role === "ADMIN" && (
            <a href="/orders/import" className="gp-btn gp-btn-secondary">
              Import from Zoho
            </a>
          )}
          <a href="/orders/new" className="gp-btn gp-btn-primary">
            + New Order
          </a>
        </div>
      </div>

      {orders.length === 0 && (
        <div className="gp-card p-8 mt-8 text-center">
          <p className="text-4xl mb-2">📦</p>
          <p className="font-bold">No orders yet</p>
          <p className="text-sm text-ink-muted mt-1">Create one to get started.</p>
        </div>
      )}

      <div className="mt-6 space-y-6">
        {orders.map((order) => {
          const zohoUrl = order.zohoOrderId ? zohoOrderUrl(order.zohoOrderId) : null;
          const needsAttention = ATTENTION_STATUSES.has(order.orderStatus);

          return (
            <div key={order.id} className="gp-card p-6">
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                  <h2 className="text-lg font-extrabold">{order.name}</h2>
                  <p className="text-sm text-ink-muted">
                    {order.lead.company} · {order.lead.name}
                    {user.role === "ADMIN" && ` · ${order.lead.assignedRep.name}`}
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  {needsAttention && <span className="gp-badge gp-badge-coral">{order.orderStatus}</span>}
                  {order.zohoSyncStatus === "error" && (
                    <span className="gp-badge gp-badge-gold">Zoho sync failed</span>
                  )}
                </div>
              </div>

              {order.zohoSyncStatus === "error" && !order.zohoOrderId && (
                <div className="mt-4 bg-gold/10 border-2 border-gold rounded-xl p-3 flex justify-between items-start gap-4">
                  <p className="text-sm font-medium">
                    This order hasn't synced to Zoho yet.
                  </p>
                  <form action={retryZohoSyncAction.bind(null, order.id)}>
                    <button
                      type="submit"
                      className="text-sm font-semibold hover:underline whitespace-nowrap"
                    >
                      Retry
                    </button>
                  </form>
                </div>
              )}

              <form action={updateOrderStatusAction} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="hidden" name="orderId" value={order.id} />
                <div>
                  <label className="gp-label">Order Status</label>
                  <select name="orderStatus" defaultValue={order.orderStatus} className="gp-input">
                    {ZOHO_ORDER_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="gp-label">Preorder Status</label>
                  <select name="preorderStatus" defaultValue={order.preorderStatus} className="gp-input">
                    {ZOHO_PREORDER_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="gp-label">Inksoft Order Number</label>
                  <input
                    type="text"
                    name="inksoftOrderNumber"
                    defaultValue={order.inksoftOrderNumber ?? ""}
                    className="gp-input"
                  />
                </div>
                <div>
                  <label className="gp-label">Tracking Number</label>
                  <input
                    type="text"
                    name="trackingNumber"
                    defaultValue={order.trackingNumber ?? ""}
                    className="gp-input"
                  />
                  <p className="text-xs text-ink-muted mt-1">Local only - not pushed to Zoho.</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="gp-label">Logistics Notes</label>
                  <textarea
                    name="logisticsNotes"
                    defaultValue={order.logisticsNotes ?? ""}
                    rows={2}
                    className="gp-input"
                  />
                </div>
                <div className="sm:col-span-2 flex gap-2 items-center flex-wrap">
                  <button type="submit" className="gp-btn gp-btn-secondary gp-btn-sm">
                    Save &amp; push to Zoho
                  </button>
                  {order.zohoOrderId && (
                    <form action={refreshFromZohoAction.bind(null, order.id)}>
                      <button type="submit" className="gp-btn gp-btn-secondary gp-btn-sm">
                        Refresh from Zoho
                      </button>
                    </form>
                  )}
                  {zohoUrl && (
                    <a
                      href={zohoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-violet hover:underline"
                    >
                      View in Zoho ↗
                    </a>
                  )}
                </div>
              </form>

              {user.role === "ADMIN" && (
                <div className="mt-4 pt-4 border-t-2 border-ink/10">
                  {order.lead.payouts.length > 0 && (
                    <p className="text-xs text-ink-muted mb-2">
                      Commission on this deal:{" "}
                      {order.lead.payouts
                        .map(
                          (p) =>
                            `${formatMoney(p.amount.toNumber())} (${p.status === "PAID" ? "paid" : "pending"})`
                        )
                        .join(", ")}
                    </p>
                  )}
                  <form action={createPayoutAction} className="flex flex-wrap items-end gap-3">
                    <input type="hidden" name="repId" value={order.lead.assignedRepId} />
                    <input type="hidden" name="leadId" value={order.lead.id} />
                    <input type="hidden" name="type" value="COMMISSION" />
                    <div>
                      <label className="gp-label">Payout for this deal</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        name="amount"
                        placeholder="Amount"
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
                        defaultValue={`Commission - ${order.lead.company}`}
                        className="gp-input"
                        required
                      />
                    </div>
                    <button type="submit" className="gp-btn gp-btn-violet gp-btn-sm">
                      Add payout
                    </button>
                  </form>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
