import path from "node:path";
import { defineConfig } from "@prisma/config";

// Prisma 7 reads the connection URL here for migration/introspection commands; the runtime
// client uses a driver adapter passed to new PrismaClient({ adapter }) (see src/lib/prisma.ts).
export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  },
  migrations: {
    path: path.join(__dirname, "prisma", "migrations"),
  },
});