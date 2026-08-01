import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { createClient } from "./supabase/server";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return null;

  return prisma.user.findUnique({ where: { id: authUser.id } });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Unauthenticated", 401);
  return user;
}

export async function requireRole(allowedRoles: string[]) {
  const user = await requireUser();
  if (!allowedRoles.includes(user.role)) throw new AuthError("Forbidden", 403);
  return user;
}

// For Server Component pages (not API routes) - redirects instead of
// throwing, since an uncaught AuthError there just renders a raw error page.
export async function requireRolePage(allowedRoles: string[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!allowedRoles.includes(user.role)) redirect("/dashboard");
  return user;
}
