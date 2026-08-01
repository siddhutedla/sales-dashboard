import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  clearRedAlertAction,
  setRedAlertAction,
  toggleOrderMilestoneAction,
  toggleStuckInDeliveryAction,
  updateOrderDetailsAction,
} from "@/lib/order-actions";

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
    include: { lead: { include: { assignedRep: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Orders</h1>
      <p className="text-gray-600 mt-2">
        Fulfillment tracking for won deals. An order shows up here automatically once a lead is
        marked Won.
      </p>

      {orders.length === 0 && (
        <p className="text-gray-500 mt-8">No orders yet - they appear here as leads are won.</p>
      )}

      <div className="mt-6 space-y-6">
        {orders.map((order) => (
          <div key={order.id} className="bg-white rounded shadow-sm p-6">
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <h2 className="text-lg font-semibold">{order.lead.company}</h2>
                <p className="text-sm text-gray-500">
                  {order.lead.name}
                  {user.role === "ADMIN" && ` · ${order.lead.assignedRep.name}`}
                </p>
              </div>
              <div className="flex gap-2">
                {order.redAlert && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                    Red Alert
                  </span>
                )}
                {order.stuckInDelivery && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                    Stuck in delivery
                  </span>
                )}
              </div>
            </div>

            {order.redAlert && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded p-3 flex justify-between items-start gap-4">
                <p className="text-sm text-red-800">
                  {order.redAlertNote || "Flagged as a red alert - needs attention."}
                </p>
                <form action={clearRedAlertAction.bind(null, order.id)}>
                  <button type="submit" className="text-sm text-red-700 hover:underline whitespace-nowrap">
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
                <label className="block text-xs font-medium text-gray-500">
                  Inksoft Order Number
                </label>
                <input
                  type="text"
                  name="inksoftOrderNumber"
                  defaultValue={order.inksoftOrderNumber ?? ""}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500">Tracking Number</label>
                <input
                  type="text"
                  name="trackingNumber"
                  defaultValue={order.trackingNumber ?? ""}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
                >
                  Save
                </button>
              </div>
            </form>

            <ul className="mt-4 divide-y divide-gray-100">
              {MILESTONES.map(({ field, label, optional }) => {
                const doneAt = order[field] as Date | null;
                return (
                  <li key={field} className="flex justify-between items-center py-2">
                    <div>
                      <span className="text-sm">{label}</span>
                      {optional && <span className="ml-2 text-xs text-gray-400">(optional)</span>}
                      {doneAt && (
                        <span className="ml-2 text-xs text-green-700">{formatDate(doneAt)}</span>
                      )}
                    </div>
                    <form action={toggleOrderMilestoneAction.bind(null, order.id, field)}>
                      <button
                        type="submit"
                        className={`text-xs px-3 py-1 rounded ${
                          doneAt
                            ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        {doneAt ? "Undo" : "Mark done"}
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center gap-4 flex-wrap">
              <form action={toggleStuckInDeliveryAction.bind(null, order.id)}>
                <button type="submit" className="text-xs text-orange-700 hover:underline">
                  {order.stuckInDelivery ? "Clear stuck-in-delivery" : "Mark stuck in delivery"}
                </button>
              </form>

              {!order.redAlert && (
                <form action={setRedAlertAction} className="flex gap-2 items-center flex-1 min-w-[240px]">
                  <input type="hidden" name="orderId" value={order.id} />
                  <input
                    type="text"
                    name="redAlertNote"
                    placeholder="What's wrong?"
                    className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs"
                  />
                  <button type="submit" className="text-xs text-red-700 hover:underline whitespace-nowrap">
                    Raise red alert
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
