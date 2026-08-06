import { Lead, Order, User } from "@prisma/client";
import { prisma } from "../prisma";
import { zohoClient } from "./client";
import { findOrCreateContact } from "./contacts";
import { ZohoApiResponse, ZohoOrderResponse, ZohoSearchResponse } from "@/types/zoho";

function orderStatusPayload(order: Pick<Order, "orderStatus" | "preorderStatus" | "inksoftOrderNumber" | "logisticsNotes">) {
  return {
    Order_Status: order.orderStatus,
    Preorder_Status: order.preorderStatus,
    Inksoft_Order_Number: order.inksoftOrderNumber || undefined,
    Logistics_Notes: order.logisticsNotes || undefined,
  };
}

// Creates the real Zoho Order (finding/creating the linked Contact first)
// for a freshly-created local Lead+Order pair, and stores the resulting
// Zoho ids back on the Order row so the two stay linked.
export async function createZohoOrder(lead: Lead, order: Order, rep: User): Promise<void> {
  try {
    const zohoContactId = await findOrCreateContact(lead);

    const res = await zohoClient.post<{ data: { id: string }[] }>("/crm/v2/Orders", {
      data: [
        {
          Name: order.name,
          Customer: { id: zohoContactId },
          ...orderStatusPayload(order),
        },
      ],
    });

    const zohoOrderId = res.data.data[0]?.id;
    if (!zohoOrderId) throw new Error("Zoho did not return an Order id");

    // Order_Sales_Person is a Zoho user lookup, but individual reps don't
    // have Zoho logins (only a shared "Order Managers" account exists) -
    // attribute the rep via a Note instead so it's still visible on the record.
    await zohoClient
      .post(`/crm/v2/Orders/${zohoOrderId}/Notes`, {
        data: [
          {
            Note_Title: "Submitted via Sales Dashboard",
            Note_Content: `Entered by ${rep.name} <${rep.email}>`,
          },
        ],
      })
      .catch((err) => console.error("Failed to attach rep-attribution note:", err));

    await prisma.order.update({
      where: { id: order.id },
      data: {
        zohoOrderId,
        zohoContactId,
        zohoSyncedAt: new Date(),
        zohoSyncStatus: "synced",
      },
    });
  } catch (error) {
    console.error("Failed to create Zoho order:", error);
    await prisma.order.update({
      where: { id: order.id },
      data: { zohoSyncStatus: "error" },
    });
    throw error;
  }
}

// Pushes the current local status/notes fields to an already-linked Zoho
// Order (order managers see the update live in Zoho).
export async function pushOrderStatus(order: Order): Promise<void> {
  if (!order.zohoOrderId) throw new Error("Order is not linked to Zoho");

  try {
    await zohoClient.put(`/crm/v2/Orders/${order.zohoOrderId}`, {
      data: [orderStatusPayload(order)],
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { zohoSyncStatus: "synced", zohoSyncedAt: new Date() },
    });
  } catch (error) {
    console.error("Failed to push order status to Zoho:", error);
    await prisma.order.update({
      where: { id: order.id },
      data: { zohoSyncStatus: "error" },
    });
    throw error;
  }
}

// Pulls the latest status straight from Zoho - for when an order manager
// changed it there directly instead of through this app.
export async function pullOrderFromZoho(order: Order): Promise<void> {
  if (!order.zohoOrderId) throw new Error("Order is not linked to Zoho");

  const res = await zohoClient.get<ZohoApiResponse<ZohoOrderResponse>>(
    `/crm/v2/Orders/${order.zohoOrderId}`
  );
  const zohoOrder = res.data.data[0];
  if (!zohoOrder) throw new Error("Order not found in Zoho");

  await prisma.order.update({
    where: { id: order.id },
    data: {
      orderStatus: zohoOrder.Order_Status || order.orderStatus,
      preorderStatus: zohoOrder.Preorder_Status || order.preorderStatus,
      inksoftOrderNumber: zohoOrder.Inksoft_Order_Number ?? order.inksoftOrderNumber,
      logisticsNotes: zohoOrder.Logistics_Notes ?? order.logisticsNotes,
      zohoSyncedAt: new Date(),
      zohoSyncStatus: "synced",
    },
  });
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
