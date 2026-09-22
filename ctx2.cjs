const fs = require("fs");
const f1 = "src/app/[locale]/service-page/[slug]/page.tsx";
const l1 = fs.readFileSync(f1, "utf8").split(/\r?\n/);
console.log("=== service-page hours context ===");
l1.forEach((ln, i) => { if (i >= 224 && i <= 236) console.log((i + 1) + ": " + ln); });
console.log("\n=== admin login page (lines 25-45) ===");
const f2 = "src/app/[locale]/admin/login/page.tsx";
const l2 = fs.readFileSync(f2, "utf8").split(/\r?\n/);
l2.forEach((ln, i) => { if (i >= 24 && i <= 44) console.log((i + 1) + ": " + ln); });
console.log("\n=== Hero namespace usage ===");
const re = /namespace:\s*["']Hero["']|useTranslations\(\s*["']Hero["']/;
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = require("path").join(d, f); const st = fs.statSync(p);
  if (st.isDirectory()) { if (!["node_modules", ".next", ".git"].includes(f)) walk(p); }
  else if (/\.(tsx|ts)$/.test(f)) { const s = fs.readFileSync(p, "utf8"); if (re.test(s)) console.log("  uses Hero:", p); } } })("src");
