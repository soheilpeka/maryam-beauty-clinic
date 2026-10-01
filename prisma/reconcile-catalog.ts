import "@/lib/env-preload";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { SERVICES } from "@/lib/content/services";
import { env } from "@/lib/env";

// One-time identity migration. Only untouched imported records are changed;
// owner edits and historical booking/order snapshots are never rewritten.
const client = new PrismaClient({ adapter: new PrismaLibSql({ url: env.databaseUrl }) });
const legacy = execFileSync("git", ["show", "HEAD:src/lib/content/services.ts"], { encoding: "utf8" });
async function main() {
  let changed = 0;
  // Initial scaffold demo services predate the imported catalogue; hide, never delete.
  const scaffold = ["signature-facial", "hydra-facial", "brow-lamination", "lash-extensions", "deep-tissue-massage", "relaxation-massage", "medical-peel"];
  await client.service.updateMany({ where: { slug: { in: scaffold } }, data: { active: false } });
  await client.galleryItem.updateMany({ where: { OR: [{ imageUrl: { startsWith: "/images/" } }, { imageUrl: { startsWith: "https://images.unsplash.com/" } }] }, data: { active: false } });
  await client.package.updateMany({ where: { slug: "demo-skin-reset", name: "Skin Reset (Demo)" }, data: { active: false } });
  for (const match of legacy.matchAll(/slug:\s*"([^"]+)"([\s\S]*?)(?=slug:|$)/g)) {
    const slug = match[1], block = match[2];
    const name = /name:\s*"([^"]+)"/.exec(block)?.[1];
    const price = Number(/price:\s*(\d+)/.exec(block)?.[1]);
    const duration = Number(/duration:\s*(\d+)/.exec(block)?.[1]);
    const existing = await client.service.findUnique({ where: { slug } });
    if (!existing || existing.name !== name || existing.price !== price || existing.duration !== duration) continue;
    const replacement = SERVICES.find(service => service.slug === slug);
    await client.service.update({ where: { slug }, data: replacement ? { name: replacement.name, nameFr: replacement.nameFr, description: replacement.summary, descriptionFr: replacement.summaryFr, category: replacement.category, price: 0, duration: 0, imageUrl: replacement.image, order: replacement.order } : { active: false } });
    changed++;
  }
  console.info(`Reconciled ${changed} untouched legacy services; historical records preserved.`);
}
main().finally(() => client.$disconnect());
