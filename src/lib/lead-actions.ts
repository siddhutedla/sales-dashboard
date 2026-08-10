"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { requireUser } from "./auth";
import { createZohoOrder } from "./zoho/orders";
import { errorMessage } from "./errors";

function str(formData: FormData, key: string): string | undefined {
  const value = String(formData.get(key) ?? "").trim();
  return value || undefined;
}

// Reps skip a New/Contacted/Qualified/Proposal pipeline entirely - entering
// a potential order here creates the Lead (contact info) and its Order
// together, then pushes the Order straight into Zoho's real Orders module
// (see src/lib/zoho/orders.ts). "status: WON" just satisfies the
// on_lead_won trigger's column - there's no user-facing pipeline anymore.
export async function createLeadAction(formData: FormData) {
  const user = await requireUser();

  const name = str(formData, "name");
  const company = str(formData, "company");
  const orderName = str(formData, "orderName");

  let lead, order;
  try {
    if (!name || !company || !orderName) {
      throw new Error("Name, company, and order name are required");
    }

    const assignedRepIdInput = str(formData, "assignedRepId");

    ({ lead, order } = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.create({
        data: {
          name,
          company,
          email: str(formData, "email"),
          phone: str(formData, "phone"),
          industry: str(formData, "industry"),
          status: "WON",
          assignedRepId: user.role === "ADMIN" ? assignedRepIdInput || user.id : user.id,
        },
      });

      // The Notes field goes straight to the Order's logisticsNotes (which
      // already pushes to Zoho's Logistics_Notes on create/update) rather
      // than a separate Lead.notes column nothing else reads.
      const order = await tx.order.create({
        data: { leadId: lead.id, name: orderName, logisticsNotes: str(formData, "notes") },
      });

      return { lead, order };
    }));
  } catch (err) {
    redirect(`/orders/new?error=${encodeURIComponent(errorMessage(err))}`);
  }

  // Synchronous, not fire-and-forget - a rep submitting this expects it to
  // actually land in Zoho. If it fails, the local order still exists
  // (zohoSyncStatus "error") and can be retried from the Orders page.
  try {
    await createZohoOrder(lead, order, user);
  } catch (err) {
    console.error("Zoho order creation failed:", err);
  }

  revalidatePath("/orders");
  redirect("/orders");
}

export async function updateLeadAction(formData: FormData) {
  try {
    const user = await requireUser();

    const id = String(formData.get("id") ?? "");
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) throw new Error("Lead not found");
    if (user.role === "SALES_REP" && existing.assignedRepId !== user.id) {
      throw new Error("Forbidden");
    }

    const name = str(formData, "name");
    const company = str(formData, "company");
    if (!name || !company) {
      throw new Error("Name and company are required");
    }

    const assignedRepIdInput = str(formData, "assignedRepId");
    const valueInput = str(formData, "value");

    await prisma.lead.update({
      where: { id },
      data: {
        name,
        company,
        email: str(formData, "email") ?? null,
        phone: str(formData, "phone") ?? null,
        mobile: str(formData, "mobile") ?? null,
        website: str(formData, "website") ?? null,
        address: str(formData, "address") ?? null,
        city: str(formData, "city") ?? null,
        state: str(formData, "state") ?? null,
        zipCode: str(formData, "zipCode") ?? null,
        country: str(formData, "country") ?? null,
        industry: str(formData, "industry") ?? null,
        value: valueInput ? Number(valueInput) : 0,
        source: str(formData, "source") ?? null,
        notes: str(formData, "notes") ?? null,
        assignedRepId: user.role === "ADMIN" && assignedRepIdInput ? assignedRepIdInput : undefined,
      },
    });
  } catch (err) {
    redirect(`/orders?error=${encodeURIComponent(errorMessage(err))}`);
  }

  revalidatePath("/orders");
}
