import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";
import "server-only";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaLibSql({
    url: env.databaseUrl,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

  return new PrismaClient({ adapter, errorFormat: "minimal" });
}

export const prisma =
  globalForPrisma.prisma ??
  (globalForPrisma.prisma = createPrismaClient());

export type { PrismaClient } from "@prisma/client";
