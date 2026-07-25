import { prisma } from "./prisma";

export async function requireRole(userId: string, allowedRoles: string[]) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (!allowedRoles.includes(user.role)) throw new Error("Forbidden");
  return user;
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  return user;
}
