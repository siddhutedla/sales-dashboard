"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { requireUser } from "./auth";

const TIMESTAMP_FIELDS = [
  "emailSentAt",
  "blanksShippedAt",
  "mockupApprovedAt",
  "paymentSentToPrinterAt",
  "orderShippedAt",
  "itemsReceivedAt",
] as const;
type TimestampField = (typeof TIMESTAMP_FIELDS)[number];

async function assertCanEditOrder(orderId: string) {
  const user = await requireUser();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { lead: true },
  });
  if (!order) throw new Error("Order not found");
  if (user.role !== "ADMIN" && order.lead.assignedRepId !== user.id) {
    throw new Error("Forbidden");
  }
  return order;
}

export async function toggleOrderMilestoneAction(
  orderId: string,
  field: TimestampField,
  formData: FormData
) {
  void formData;
  if (!TIMESTAMP_FIELDS.includes(field)) throw new Error("Invalid milestone");

  const order = await assertCanEditOrder(orderId);
  const isDone = order[field] !== null;

  await prisma.order.update({
    where: { id: orderId },
    data: { [field]: isDone ? null : new Date() },
  });

  revalidatePath("/orders");
}

export async function updateOrderDetailsAction(formData: FormData) {
  const orderId = String(formData.get("orderId"));
  await assertCanEditOrder(orderId);

  const inksoftOrderNumber = String(formData.get("inksoftOrderNumber") ?? "").trim();
  const trackingNumber = String(formData.get("trackingNumber") ?? "").trim();

  await prisma.order.update({
    where: { id: orderId },
    data: {
      inksoftOrderNumber: inksoftOrderNumber || null,
      trackingNumber: trackingNumber || null,
    },
  });

  revalidatePath("/orders");
}

export async function setRedAlertAction(formData: FormData) {
  const orderId = String(formData.get("orderId"));
  await assertCanEditOrder(orderId);

  const note = String(formData.get("redAlertNote") ?? "").trim();

  await prisma.order.update({
    where: { id: orderId },
    data: { redAlert: true, redAlertNote: note || null },
  });

  revalidatePath("/orders");
}

export async function clearRedAlertAction(orderId: string) {
  await assertCanEditOrder(orderId);

  await prisma.order.update({
    where: { id: orderId },
    data: { redAlert: false, redAlertNote: null },
  });

  revalidatePath("/orders");
}

export async function toggleStuckInDeliveryAction(orderId: string) {
  const order = await assertCanEditOrder(orderId);

  await prisma.order.update({
    where: { id: orderId },
    data: { stuckInDelivery: !order.stuckInDelivery },
  });

  revalidatePath("/orders");
}
