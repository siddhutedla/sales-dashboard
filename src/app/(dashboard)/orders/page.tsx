import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  clearRedAlertAction,
  setRedAlertAction,
  toggleOrderMilestoneAction,
  toggleStuckInDeliveryAction,
  updateOrderDetailsAction,
} from "@/lib/order-actions";
import { createPayoutAction } from "@/lib/payout-actions";

function formatMoney(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const MILESTONES = [
  { field: "emailSentAt", label: "Email Sent", optional: false },
  { field: "blanksShippedAt", label: "Blanks Shipped", optional: true },
  { field: "mockupApprovedAt", label: "Sample/Test Print or Mockup Approved", optional: true },
  { field: "paymentSentToPrinterAt", label: "Payment Sent to Printer", optional: false },
  { field: "orderShippedAt", label: "Order Shipped", optional: false },
  { field: "itemsReceivedAt", label: "Items Received by Customer", optional: false },
] as const;

function formatDate(date: Date | null) {
  if (!date) return null;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

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
      <h1 className="text-3xl font-extrabold">Orders</h1>
      <p className="text-ink-muted mt-2">
        Fulfillment tracking for won deals. An order shows up here automatically once a lead is
        marked Won.
      </p>

      {orders.length === 0 && (
        <div className="gp-card p-8 mt-8 text-center">
          <p className="text-4xl mb-2">📦</p>
          <p className="font-bold">No orders yet</p>
          <p className="text-sm text-ink-muted mt-1">They appear here as leads are won.</p>
        </div>
      )}

      <div className="mt-6 space-y-6">
        {orders.map((order) => (
          <div key={order.id} className="gp-card p-6">
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <h2 className="text-lg font-extrabold">{order.lead.company}</h2>
                <p className="text-sm text-ink-muted">
                  {order.lead.name}
                  {user.role === "ADMIN" && ` · ${order.lead.assignedRep.name}`}
                </p>
              </div>
              <div className="flex gap-2">
                {order.redAlert && <span className="gp-badge gp-badge-coral">Red Alert</span>}
                {order.stuckInDelivery && (
                  <span className="gp-badge gp-badge-gold">Stuck in delivery</span>
                )}
              </div>
            </div>

            {order.redAlert && (
              <div className="mt-4 bg-coral/10 border-2 border-coral rounded-xl p-3 flex justify-between items-start gap-4">
                <p className="text-sm text-coral-dark font-medium">
                  {order.redAlertNote || "Flagged as a red alert - needs attention."}
                </p>
                <form action={clearRedAlertAction.bind(null, order.id)}>
                  <button
                    type="submit"
                    className="text-sm font-semibold text-coral-dark hover:underline whitespace-nowrap"
                  >
                    Clear
                  </button>
                </form>
              </div>
            )}

            <form
              action={updateOrderDetailsAction}
              className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <input type="hidden" name="orderId" value={order.id} />
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
              </div>
              <div className="sm:col-span-2">
                <button type="submit" className="gp-btn gp-btn-secondary gp-btn-sm">
                  Save
                </button>
              </div>
            </form>

            <ul className="mt-4 divide-y divide-ink/10">
              {MILESTONES.map(({ field, label, optional }) => {
                const doneAt = order[field] as Date | null;
                return (
                  <li key={field} className="flex justify-between items-center py-2.5">
                    <div>
                      <span className="text-sm font-medium">{label}</span>
                      {optional && (
                        <span className="ml-2 text-xs text-ink-muted">(optional)</span>
                      )}
                      {doneAt && (
                        <span className="ml-2 text-xs text-mint-dark font-medium">
                          {formatDate(doneAt)}
                        </span>
                      )}
                    </div>
                    <form action={toggleOrderMilestoneAction.bind(null, order.id, field)}>
                      <button
                        type="submit"
                        className={
                          doneAt
                            ? "gp-btn gp-btn-secondary gp-btn-sm"
                            : "gp-btn gp-btn-primary gp-btn-sm"
                        }
                      >
                        {doneAt ? "Undo" : "Mark done"}
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 pt-4 border-t-2 border-ink/10 flex justify-between items-center gap-4 flex-wrap">
              <form action={toggleStuckInDeliveryAction.bind(null, order.id)}>
                <button type="submit" className="text-xs font-semibold text-gold-dark hover:underline">
                  {order.stuckInDelivery ? "Clear stuck-in-delivery" : "Mark stuck in delivery"}
                </button>
              </form>

              {!order.redAlert && (
                <form
                  action={setRedAlertAction}
                  className="flex gap-2 items-center flex-1 min-w-[240px]"
                >
                  <input type="hidden" name="orderId" value={order.id} />
                  <input
                    type="text"
                    name="redAlertNote"
                    placeholder="What's wrong?"
                    className="gp-input flex-1 py-1 text-xs"
                  />
                  <button
                    type="submit"
                    className="text-xs font-semibold text-coral-dark hover:underline whitespace-nowrap"
                  >
                    Raise red alert
                  </button>
                </form>
              )}
            </div>

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
                <form
                  action={createPayoutAction}
                  className="flex flex-wrap items-end gap-3"
                >
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
        ))}
      </div>
    </div>
  );
}
