"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { requireRole } from "./auth";
import { errorMessage } from "./errors";

export async function updateUserRoleAction(formData: FormData) {
  try {
    const admin = await requireRole(["ADMIN"]);

    const userId = String(formData.get("userId"));
    const role = String(formData.get("role"));
    if (role !== "ADMIN" && role !== "SALES_REP") {
      throw new Error("Invalid role");
    }
    if (userId === admin.id) {
      throw new Error("You can't change your own role - have another admin do it");
    }

    await prisma.user.update({ where: { id: userId }, data: { role } });
  } catch (err) {
    redirect(`/admin/users?error=${encodeURIComponent(errorMessage(err))}`);
  }

  revalidatePath("/admin/users");
}
