/** Rebuild the owner's service photographs without cropping or retouching their contents. */
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const groups = [
  ["AI skin Analysis", "ai-skin-analysis"],
  ["Deep cleaning facial", "deep-cleansing-facials"],
  ["Eyelash and brow lamination", "lash-brow-lamination"],
  ["Hair botox", "hair-botox-hydration"],
  ["Laser skin rejuvenation", "laser-skin-rejuvenation"],
  ["Lip blush", "lip-blush-dark-lip-neutralization"],
  ["Microblading", "microblading-eyebrow-shaping"],
  ["Pigmented lesions laser treatment", "pigmented-lesions-laser-treatment"],
  ["Rf micro needling", "rf-microneedling"],
  ["Swedish massage", "swedish-relaxation-massage"],
];
const root = process.cwd();
const tiles = [];
for (const [folder, slug] of groups) {
  const sourceDir = path.join(root, "pics", "service pics", folder);
  const files = (await readdir(sourceDir)).filter(name => /\.(jpe?g|png|webp)$/i.test(name)).sort((a, b) => {
    const rank = name => Number(name.match(/Image (\d+) \d{4}-/)?.[1] ?? 0);
    return rank(a) - rank(b) || a.localeCompare(b);
  });
  for (const [index, file] of files.entries()) {
    const number = String(index + 1).padStart(2, "0");
    const source = path.join(sourceDir, file);
    // This source is filed under facials but visibly depicts an AI skin scanner.
    const scanner = folder === "Deep cleaning facial" && file.includes("6.48.59");
    const asset = scanner ? "ai-skin-analysis/04.webp" : `${slug}/${number}.webp`;
    const destination = path.join(root, "public", "media", "services", asset);
    if (process.argv.includes("--write")) {
      await mkdir(path.dirname(destination), { recursive: true });
      await sharp(source).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 90 }).toFile(destination);
    }
    const thumbnail = await sharp(source).rotate().resize(320, 240, { fit: "contain", background: "#f4f2ee" }).toBuffer();
    const label = `<svg width="320" height="50"><rect width="320" height="50" fill="white"/><text x="10" y="20" font-size="13" font-family="Arial">${folder} / ${number}</text><text x="10" y="40" font-size="11" font-family="Arial">${file.replace("WhatsApp Image ", "").replace("2026-10-", "Oct ")}</text></svg>`;
    tiles.push(await sharp({ create: { width: 320, height: 290, channels: 3, background: "white" } }).composite([{ input: thumbnail, top: 0, left: 0 }, { input: Buffer.from(label), top: 240, left: 0 }]).png().toBuffer());
    console.log(`${asset} <- ${folder}/${file}`);
  }
}
await mkdir(path.join(root, "artifacts"), { recursive: true });
const sheet = path.join(root, "artifacts", "owner-service-photos.jpg");
await sharp({ create: { width: 1280, height: Math.ceil(tiles.length / 4) * 290, channels: 3, background: "#ddd" } }).composite(tiles.map((input, index) => ({ input, left: index % 4 * 320, top: Math.floor(index / 4) * 290 }))).jpeg({ quality: 92 }).toFile(sheet);
console.log(`Review sheet: ${sheet}`);
