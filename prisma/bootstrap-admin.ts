/**
 * Create or update the INITIAL admin account from environment variables.
 *
 * There is no default admin and no default password anywhere in the codebase - this script
 * refuses to run unless ADMIN_INITIAL_EMAIL / ADMIN_INITIAL_PASSWORD are set. The password is
 * hashed with bcrypt immediately and only the hash is stored. Re-running the script updates
 * the password hash, so it is also the way to reset a forgotten admin password.
 *
 * Usage:  npm run prisma:bootstrap-admin
 */
import "@/lib/env-preload";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { env } from "@/lib/env";
import { hashPassword } from "@/lib/auth";

const prisma = new PrismaClient({
  adapter: new PrismaLibSql({ url: env.databaseUrl }),
});

async function main() {
  const email = env.adminInitialEmail;
  const password = env.adminInitialPassword;

  if (password.length < 10) {
    throw new Error("ADMIN_INITIAL_PASSWORD must be at least 10 characters.");
  }

  const passwordHash = await hashPassword(password);
  await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash, name: "Administrator", role: "admin" },
  });

  console.info(`Admin account ready: ${email}`);
  console.info("Only the bcrypt hash is stored; the plaintext lives solely in your environment.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
