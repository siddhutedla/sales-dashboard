import { Lead, Order, User } from "@prisma/client";
import { prisma } from "../prisma";
import { zohoClient } from "./client";
import { findOrCreateContact } from "./contacts";
import { ZohoApiResponse, ZohoOrderResponse, ZohoSearchResponse } from "@/types/zoho";
import { COMMISSION_RATE } from "../constants";

type OrderStatusFields = Pick<
  Order,
  "orderStatus" | "preorderStatus" | "inksoftOrderNumber" | "logisticsNotes" | "trackingNumber"
>;

function orderStatusPayload(order: OrderStatusFields) {
  return {
    Order_Status: order.orderStatus,
    Preorder_Status: order.preorderStatus,
    Inksoft_Order_Number: order.inksoftOrderNumber || undefined,
    Logistics_Notes: order.logisticsNotes || undefined,
    Tracking_Number: order.trackingNumber || undefined,
  };
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function markSyncError(orderId: string, err: unknown) {
  await prisma.order.update({
    where: { id: orderId },
    data: { zohoSyncStatus: "error", zohoSyncError: errorMessage(err) },
  });
}

// Creates the real Zoho Order (finding/creating the linked Contact first)
// for a freshly-created local Lead+Order pair, and stores the resulting
// Zoho ids back on the Order row so the two stay linked.
export async function createZohoOrder(lead: Lead, order: Order, rep: User): Promise<void> {
  try {
    const zohoContactId = await findOrCreateContact(lead);

    const res = await zohoClient.post<{ data: { details: { id: string } }[] }>("/crm/v2/Orders", {
      data: [
        {
          Name: order.name,
          Customer: { id: zohoContactId },
          // Order_Sales_Person is a Zoho user lookup, but individual reps
          // don't have Zoho logins (only a shared "Order Managers" account
          // exists) - Order_Sales_Manager is a plain text field added for
          // exactly this, so the rep's name goes there instead.
          Order_Sales_Manager: rep.name,
          ...orderStatusPayload(order),
        },
      ],
    });

    // See the comment in contacts.ts - create/update responses nest the id
    // under details.id, not at the top level.
    const zohoOrderId = res.data.data[0]?.details?.id;
    if (!zohoOrderId) throw new Error("Zoho did not return an Order id");

    await prisma.order.update({
      where: { id: order.id },
      data: {
        zohoOrderId,
        zohoContactId,
        zohoSyncedAt: new Date(),
        zohoSyncStatus: "synced",
        zohoSyncError: null,
      },
    });
  } catch (error) {
    console.error("Failed to create Zoho order:", error);
    await markSyncError(order.id, error);
    throw error;
  }
}

// Pushes the current local status/notes fields to an already-linked Zoho
// Order (order managers see the update live in Zoho).
export async function pushOrderStatus(order: Order): Promise<void> {
  if (!order.zohoOrderId) throw new Error("Order is not linked to Zoho");

  try {
    const res = await zohoClient.put<{ data: { code: string; message?: string }[] }>(
      `/crm/v2/Orders/${order.zohoOrderId}`,
      { data: [orderStatusPayload(order)] }
    );
    // Zoho can return HTTP 200 with a per-record error code in the body
    // (e.g. record deleted, invalid field) rather than a non-2xx status.
    if (res.data.data[0]?.code !== "SUCCESS") {
      throw new Error(res.data.data[0]?.message || "Zoho rejected the update");
    }
    await prisma.order.update({
      where: { id: order.id },
      data: { zohoSyncStatus: "synced", zohoSyncedAt: new Date(), zohoSyncError: null },
    });
  } catch (error) {
    console.error("Failed to push order status to Zoho:", error);
    await markSyncError(order.id, error);
    throw error;
  }
}

// Pulls the latest status straight from Zoho - for when an order manager
// changed it there directly instead of through this app.
export async function pullOrderFromZoho(order: Order): Promise<void> {
  if (!order.zohoOrderId) throw new Error("Order is not linked to Zoho");

  // A deleted/nonexistent record returns HTTP 204 with an empty body, not a
  // 404 - without validateStatus here axios still resolves it as "success",
  // and res.data is "" (a string), so res.data.data[0] throws a confusing
  // TypeError instead of a clear "this was deleted in Zoho" message.
  const res = await zohoClient.get<ZohoApiResponse<ZohoOrderResponse>>(
    `/crm/v2/Orders/${order.zohoOrderId}`,
    { validateStatus: (s) => s === 200 || s === 204 }
  );
  const zohoOrder = res.status === 200 ? res.data?.data?.[0] : undefined;
  if (!zohoOrder) {
    throw new Error("This order no longer exists in Zoho - it may have been deleted there.");
  }

  const hadSubtotalBefore = order.subtotalPreRush !== null;
  const newSubtotal = zohoOrder.Subtotal_Pre_Rush ?? null;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      orderStatus: zohoOrder.Order_Status || order.orderStatus,
      preorderStatus: zohoOrder.Preorder_Status || order.preorderStatus,
      inksoftOrderNumber: zohoOrder.Inksoft_Order_Number ?? order.inksoftOrderNumber,
      logisticsNotes: zohoOrder.Logistics_Notes ?? order.logisticsNotes,
      trackingNumber: zohoOrder.Tracking_Number ?? order.trackingNumber,
      subtotalPreRush: newSubtotal ?? order.subtotalPreRush,
      zohoSyncedAt: new Date(),
      zohoSyncStatus: "synced",
      zohoSyncError: null,
    },
  });

  // Auto-add the rep's commission the first time a subtotal shows up - only
  // then, so a later subtotal change in Zoho never silently overwrites an
  // amount an admin already deliberately adjusted (updatePayoutAmountAction).
  if (newSubtotal !== null && !hadSubtotalBefore) {
    await autoCreateCommission(order.leadId, newSubtotal);
  }
}

async function autoCreateCommission(leadId: string, subtotalPreRush: number): Promise<void> {
  const existing = await prisma.payout.findFirst({ where: { leadId, type: "COMMISSION" } });
  if (existing) return;

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return;

  await prisma.payout.create({
    data: {
      repId: lead.assignedRepId,
      leadId: lead.id,
      amount: subtotalPreRush * COMMISSION_RATE,
      description: `Commission - ${lead.company}`,
      date: new Date(),
      type: "COMMISSION",
    },
  });
}

// Pulls every linked order's latest status from Zoho in one shot - used on
// every /orders page load and by the manual "Sync with Zoho" button.
// Individual GETs rather than a single bulk/COQL call: at this order volume
// it's simpler and avoids needing a broader OAuth scope than what's already
// granted; worth revisiting with a bulk fetch if order counts grow a lot.
export async function pullAllOrdersFromZoho(): Promise<void> {
  const orders = await prisma.order.findMany({ where: { zohoOrderId: { not: null } } });
  await Promise.allSettled(
    orders.map((order) =>
      pullOrderFromZoho(order).catch((err) => {
        console.error(`Failed to pull order ${order.id} from Zoho:`, err);
        return markSyncError(order.id, err);
      })
    )
  );
}

export interface ZohoOrderSearchResult {
  id: string;
  name: string;
  orderStatus?: string;
  customerName?: string;
}

// For the "Import order from Zoho" flow - word search on the Order's Name.
export async function searchZohoOrdersByName(query: string): Promise<ZohoOrderSearchResult[]> {
  const res = await zohoClient.get<ZohoSearchResponse<ZohoOrderResponse>>("/crm/v2/Orders/search", {
    params: { word: query },
    validateStatus: (s) => s === 200 || s === 204,
  });

  return (res.data?.data || []).map((o) => ({
    id: o.id,
    name: o.Name,
    orderStatus: o.Order_Status,
    customerName: o.Customer?.name,
  }));
}

// "Orders" is the custom module's api_name; CustomModule1 is its internal
// module_name, which is what Zoho's own deep-link URLs actually use.
export function zohoOrderUrl(zohoOrderId: string): string | null {
  const orgDomain = process.env.ZOHO_ORG_DOMAIN;
  if (!orgDomain) return null;
  return `https://crm.zoho.com/crm/${orgDomain}/tab/CustomModule1/${zohoOrderId}`;
}

export async function getZohoOrder(zohoOrderId: string): Promise<ZohoOrderResponse> {
  const res = await zohoClient.get<ZohoApiResponse<ZohoOrderResponse>>(
    `/crm/v2/Orders/${zohoOrderId}`
  );
  const zohoOrder = res.data.data[0];
  if (!zohoOrder) throw new Error("Order not found in Zoho");
  return zohoOrder;
}
