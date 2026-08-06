"use server";

import { redirect } from "next/navigation";
import { requireRole } from "./auth";
import { exchangeGrantToken } from "./zoho/oauth";

// Self Client connect - see src/lib/zoho/oauth.ts for why there's no
// redirect/consent screen involved.
export async function connectZohoAction(formData: FormData) {
  await requireRole(["ADMIN"]);

  const grantToken = String(formData.get("grantToken") ?? "").trim();
  if (!grantToken) {
    redirect("/admin/sync?error=missing_token");
  }

  try {
    await exchangeGrantToken(grantToken);
  } catch (err) {
    console.error("Zoho grant token exchange failed:", err);
    const detail = err instanceof Error ? err.message : String(err);
    redirect(`/admin/sync?error=auth_failed&detail=${encodeURIComponent(detail)}`);
  }

  redirect("/admin/sync?connected=true");
}
