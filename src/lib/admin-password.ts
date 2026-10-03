import "server-only";
import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "@/lib/auth";

/** Resetting credentials also revokes every previously issued session atomically. */
export async function resetInitialAdminPassword(prisma: PrismaClient, email: string, password: string): Promise<void> {
  if (password.length < 10 || Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("ADMIN_INITIAL_PASSWORD must be at least 10 characters and at most 72 UTF-8 bytes.");
  }
  const passwordHash = await hashPassword(password);
  await prisma.$transaction(async (tx) => {
    const admin = await tx.adminUser.upsert({
      where: { email },
      update: { passwordHash },
      create: { email, passwordHash, name: "Administrator", role: "admin" },
    });
    await tx.adminSession.deleteMany({ where: { adminId: admin.id } });
    await tx.loginFailure.deleteMany({ where: { email } });
  });
}
