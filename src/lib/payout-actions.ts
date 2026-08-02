"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { requireRole } from "./auth";

const PAYOUT_TYPES = ["BONUS", "SALARY", "COMMISSION", "OTHER"] as const;
type PayoutTypeValue = (typeof PAYOUT_TYPES)[number];

export async function createPayoutAction(formData: FormData) {
  await requireRole(["ADMIN"]);

  const repId = String(formData.get("repId") ?? "");
  const amount = Number(formData.get("amount"));
  const description = String(formData.get("description") ?? "").trim();
  const dateStr = String(formData.get("date") ?? "");
  const type = String(formData.get("type") ?? "BONUS");
  const leadId = String(formData.get("leadId") ?? "").trim() || null;

  if (!repId || !Number.isFinite(amount) || amount <= 0 || !description || !dateStr) {
    throw new Error("Please fill in all required fields with a valid amount");
  }
  if (!PAYOUT_TYPES.includes(type as PayoutTypeValue)) {
    throw new Error("Invalid payout type");
  }

  await prisma.payout.create({
    data: {
      repId,
      amount,
      description,
      date: new Date(dateStr),
      type: type as PayoutTypeValue,
      leadId,
    },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${repId}`);
  revalidatePath("/payouts/admin");
  revalidatePath("/payouts");
  revalidatePath("/orders");
}

export async function togglePayoutStatusAction(payoutId: string) {
  await requireRole(["ADMIN"]);

  const payout = await prisma.payout.findUnique({ where: { id: payoutId } });
  if (!payout) throw new Error("Payout not found");

  const isPaid = payout.status === "PAID";
  await prisma.payout.update({
    where: { id: payoutId },
    data: {
      status: isPaid ? "PENDING" : "PAID",
      paidAt: isPaid ? null : new Date(),
    },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${payout.repId}`);
  revalidatePath("/payouts/admin");
  revalidatePath("/payouts");
  revalidatePath("/orders");
}

export async function updateRepWageAction(formData: FormData) {
  await requireRole(["ADMIN"]);

  const repId = String(formData.get("repId") ?? "");
  const hourlyWageRaw = String(formData.get("hourlyWage") ?? "").trim();
  const hoursPerWeekRaw = String(formData.get("hoursPerWeek") ?? "").trim();

  if (!repId) throw new Error("Missing rep");

  await prisma.user.update({
    where: { id: repId },
    data: {
      hourlyWage: hourlyWageRaw || null,
      hoursPerWeek: hoursPerWeekRaw || null,
    },
  });

  revalidatePath(`/admin/users/${repId}`);
}
