"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { requireRole, requireUser } from "./auth";
import { encryptTin } from "./tax/crypto";
import { errorMessage } from "./errors";

export async function submitW9Action(formData: FormData) {
  try {
    const user = await requireUser();

    const legalName = String(formData.get("legalName") ?? "").trim();
    const businessName = String(formData.get("businessName") ?? "").trim();
    const taxClassification = String(formData.get("taxClassification") ?? "").trim();
    const tin = String(formData.get("tin") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const city = String(formData.get("city") ?? "").trim();
    const state = String(formData.get("state") ?? "").trim();
    const zipCode = String(formData.get("zipCode") ?? "").trim();

    const digits = tin.replace(/\D/g, "");
    if (
      !legalName ||
      !taxClassification ||
      digits.length !== 9 ||
      !address ||
      !city ||
      !state ||
      !zipCode
    ) {
      throw new Error("Please fill in all required fields with a valid 9-digit SSN/EIN");
    }

    // Store normalized digits only, so downstream fixed-position formatting
    // (formatTin in the 1099 route) can rely on a consistent 9-digit shape.
    const tinEncrypted = encryptTin(digits);
    const tinLast4 = digits.slice(-4);

    await prisma.w9Form.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        legalName,
        businessName: businessName || null,
        taxClassification,
        tinEncrypted,
        tinLast4,
        address,
        city,
        state,
        zipCode,
      },
      update: {
        legalName,
        businessName: businessName || null,
        taxClassification,
        tinEncrypted,
        tinLast4,
        address,
        city,
        state,
        zipCode,
      },
    });
  } catch (err) {
    redirect(`/tax?error=${encodeURIComponent(errorMessage(err))}`);
  }

  revalidatePath("/tax");
}

export async function updateCompanySettingsAction(formData: FormData) {
  try {
    await requireRole(["ADMIN"]);

    const legalName = String(formData.get("legalName") ?? "").trim();
    const ein = String(formData.get("ein") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const city = String(formData.get("city") ?? "").trim();
    const state = String(formData.get("state") ?? "").trim();
    const zipCode = String(formData.get("zipCode") ?? "").trim();

    if (!legalName) throw new Error("Legal name is required");

    await prisma.companySettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        legalName,
        ein: ein || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zipCode: zipCode || null,
      },
      update: {
        legalName,
        ein: ein || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zipCode: zipCode || null,
      },
    });
  } catch (err) {
    redirect(`/admin/tax-settings?error=${encodeURIComponent(errorMessage(err))}`);
  }

  revalidatePath("/admin/tax-settings");
}
