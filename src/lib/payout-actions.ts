"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { requireRole } from "./auth";
import { errorMessage } from "./errors";

const PAYOUT_TYPES = ["BONUS", "SALARY", "COMMISSION", "OTHER"] as const;
type PayoutTypeValue = (typeof PAYOUT_TYPES)[number];

// Used from orders/page.tsx, admin/users/[id]/page.tsx, and payouts/admin -
// redirectTo (a hidden field / bound arg) sends errors back to whichever
// page actually submitted, instead of a fixed guess.
export async function createPayoutAction(formData: FormData) {
  const redirectTo = String(formData.get("redirectTo") ?? "").trim() || "/admin/users";

  try {
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
  } catch (err) {
    redirect(`${redirectTo}?error=${encodeURIComponent(errorMessage(err))}`);
  }

  revalidatePath("/admin/users");
  revalidatePath(redirectTo);
  revalidatePath("/payouts/admin");
  revalidatePath("/payouts");
  revalidatePath("/orders");
}

export async function togglePayoutStatusAction(payoutId: string, redirectTo?: string) {
  const fallback = redirectTo || "/admin/users";

  try {
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
  } catch (err) {
    redirect(`${fallback}?error=${encodeURIComponent(errorMessage(err))}`);
  }

  revalidatePath("/admin/users");
  revalidatePath(fallback);
  revalidatePath("/payouts/admin");
  revalidatePath("/payouts");
  revalidatePath("/orders");
}

// Lets an order (or the payout itself, if added in error) actually get
// deleted afterward - deleteOrderAction refuses to touch an order with a
// payout still attached, on purpose, so this has to be a separate,
// deliberate step rather than a cascade.
export async function deletePayoutAction(payoutId: string, redirectTo?: string) {
  const fallback = redirectTo || "/admin/users";

  try {
    await requireRole(["ADMIN"]);

    const payout = await prisma.payout.findUnique({ where: { id: payoutId } });
    if (!payout) throw new Error("Payout not found");

    await prisma.payout.delete({ where: { id: payoutId } });
  } catch (err) {
    redirect(`${fallback}?error=${encodeURIComponent(errorMessage(err))}`);
  }

  revalidatePath("/admin/users");
  revalidatePath(fallback);
  revalidatePath("/payouts/admin");
  revalidatePath("/payouts");
  revalidatePath("/orders");
}

// Lets an admin correct the amount on a payout that already exists
// (e.g. the suggested 8% was off, or the subtotal changed since) without
// having to delete and recreate it.
export async function updatePayoutAmountAction(formData: FormData) {
  const payoutId = String(formData.get("payoutId") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "").trim() || "/admin/users";

  try {
    await requireRole(["ADMIN"]);

    const amount = Number(formData.get("amount"));
    if (!payoutId || !Number.isFinite(amount) || amount <= 0) {
      throw new Error("Enter a valid amount");
    }

    await prisma.payout.update({ where: { id: payoutId }, data: { amount } });
  } catch (err) {
    redirect(`${redirectTo}?error=${encodeURIComponent(errorMessage(err))}`);
  }

  revalidatePath("/admin/users");
  revalidatePath(redirectTo);
  revalidatePath("/payouts/admin");
  revalidatePath("/payouts");
  revalidatePath("/orders");
}

export async function updateRepWageAction(formData: FormData) {
  const repId = String(formData.get("repId") ?? "");

  try {
    await requireRole(["ADMIN"]);
    if (!repId) throw new Error("Missing rep");

    const hourlyWageRaw = String(formData.get("hourlyWage") ?? "").trim();
    const hoursPerWeekRaw = String(formData.get("hoursPerWeek") ?? "").trim();

    await prisma.user.update({
      where: { id: repId },
      data: {
        hourlyWage: hourlyWageRaw || null,
        hoursPerWeek: hoursPerWeekRaw || null,
      },
    });
  } catch (err) {
    redirect(`/admin/users/${repId}?error=${encodeURIComponent(errorMessage(err))}`);
  }

  revalidatePath(`/admin/users/${repId}`);
}
