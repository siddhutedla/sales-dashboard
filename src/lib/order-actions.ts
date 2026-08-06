"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { requireUser, requireRole } from "./auth";
import { createZohoOrder, pushOrderStatus, pullOrderFromZoho, getZohoOrder } from "./zoho/orders";
import { getContact } from "./zoho/contacts";
import { zohoClient } from "./zoho/client";

async function assertCanEditOrder(orderId: string) {
  const user = await requireUser();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { lead: { include: { assignedRep: true } } },
  });
  if (!order) throw new Error("Order not found");
  if (user.role !== "ADMIN" && order.lead.assignedRepId !== user.id) {
    throw new Error("Forbidden");
  }
  return order;
}

// Saves Order Status/Preorder Status/Inksoft #/tracking #/logistics notes
// locally, then pushes the status fields to the linked Zoho record (if any)
// so order managers see the change there too.
export async function updateOrderStatusAction(formData: FormData) {
  const orderId = String(formData.get("orderId"));
  await assertCanEditOrder(orderId);

  const orderStatus = String(formData.get("orderStatus") ?? "").trim();
  const preorderStatus = String(formData.get("preorderStatus") ?? "").trim();
  const inksoftOrderNumber = String(formData.get("inksoftOrderNumber") ?? "").trim();
  const trackingNumber = String(formData.get("trackingNumber") ?? "").trim();
  const logisticsNotes = String(formData.get("logisticsNotes") ?? "").trim();

  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      orderStatus: orderStatus || undefined,
      preorderStatus: preorderStatus || undefined,
      inksoftOrderNumber: inksoftOrderNumber || null,
      trackingNumber: trackingNumber || null,
      logisticsNotes: logisticsNotes || null,
    },
  });

  if (order.zohoOrderId) {
    try {
      await pushOrderStatus(order);
    } catch (err) {
      console.error("Failed to push status to Zoho:", err);
    }
  }

  revalidatePath("/orders");
}

// For orders that failed to sync when first created (zohoSyncStatus "error")
// - retries creating the Zoho Order/Contact from scratch.
export async function retryZohoSyncAction(orderId: string) {
  const order = await assertCanEditOrder(orderId);
  if (order.zohoOrderId) return; // already linked, nothing to retry

  try {
    await createZohoOrder(order.lead, order, order.lead.assignedRep);
  } catch (err) {
    console.error("Retry Zoho sync failed:", err);
  }

  revalidatePath("/orders");
}

// Pulls the latest Order/Preorder status straight from Zoho - for when an
// order manager updated it there directly instead of through this app.
export async function refreshFromZohoAction(orderId: string) {
  const order = await assertCanEditOrder(orderId);
  if (!order.zohoOrderId) return;

  try {
    await pullOrderFromZoho(order);
  } catch (err) {
    console.error("Refresh from Zoho failed:", err);
  }

  revalidatePath("/orders");
}

// Reps can delete their own orders (admins can delete any) - for
// test entries or ones that went nowhere. Blocked if a payout is already
// recorded against it, so a commission never silently disappears; the
// Zoho record (if any) is deleted too on a best-effort basis.
export async function deleteOrderAction(orderId: string) {
  const order = await assertCanEditOrder(orderId);

  const payoutCount = await prisma.payout.count({ where: { leadId: order.leadId } });
  if (payoutCount > 0) {
    throw new Error("Can't delete - this order has a payout recorded against it");
  }

  if (order.zohoOrderId) {
    try {
      await zohoClient.delete(`/crm/v2/Orders/${order.zohoOrderId}`);
    } catch (err) {
      console.error("Failed to delete Zoho order:", err);
    }
  }

  // Cascades to delete the Order row too (orders.lead_id is ON DELETE CASCADE).
  await prisma.lead.delete({ where: { id: order.leadId } });

  revalidatePath("/orders");
}

// Admin-only: attaches an order that already exists in Zoho (created
// directly by an order manager) to this app, so its status can be looked
// up here too. Requires assigning it to a local rep since assignedRepId is
// required and Zoho's Order_Sales_Person isn't mappable to one (see
// src/lib/zoho/orders.ts).
export async function importOrderAction(formData: FormData) {
  await requireRole(["ADMIN"]);

  const zohoOrderId = String(formData.get("zohoOrderId") ?? "").trim();
  const assignedRepId = String(formData.get("assignedRepId") ?? "").trim();
  if (!zohoOrderId || !assignedRepId) {
    throw new Error("Order and assigned rep are required");
  }

  const zohoOrder = await getZohoOrder(zohoOrderId);
  const contactId = zohoOrder.Customer?.id;
  const contact = contactId ? await getContact(contactId) : null;

  const name = [contact?.First_Name, contact?.Last_Name].filter(Boolean).join(" ") || zohoOrder.Name;
  const company = contact?.Business_Org || zohoOrder.Name;

  await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.create({
      data: {
        name,
        company,
        email: contact?.Email,
        phone: contact?.Phone,
        mobile: contact?.Mobile,
        website: contact?.Website,
        address: contact?.Mailing_Street,
        city: contact?.Mailing_City,
        state: contact?.Mailing_State,
        zipCode: contact?.Mailing_Zip,
        country: contact?.Mailing_Country,
        status: "WON",
        assignedRepId,
      },
    });

    await tx.order.create({
      data: {
        leadId: lead.id,
        name: zohoOrder.Name,
        orderStatus: zohoOrder.Order_Status || "TODO: fill inksoft Order Number",
        preorderStatus: zohoOrder.Preorder_Status || "Collecting Details and Making PO/Order",
        inksoftOrderNumber: zohoOrder.Inksoft_Order_Number,
        logisticsNotes: zohoOrder.Logistics_Notes,
        zohoOrderId,
        zohoContactId: contactId,
        zohoSyncedAt: new Date(),
        zohoSyncStatus: "synced",
      },
    });
  });

  revalidatePath("/orders");
  redirect("/orders");
}
