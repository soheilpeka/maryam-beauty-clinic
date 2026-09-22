const fs = require("fs");
const path = require("path");
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); const st = fs.statSync(p);
  if (st.isDirectory()) { if (!["node_modules", ".next", ".git"].includes(f)) walk(p); }
  else if (/\.(tsx|ts)$/.test(f)) files.push(p); } })("src");
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  if (!/Validation/.test(src)) continue;
  const lines = src.split(/\r?\n/);
  console.log("\n=== " + f + " ===");
  lines.forEach((ln, i) => {
    if (/tValidation\s*\(/.test(ln)) console.log((i + 1) + ": " + ln.trim());
  });
}
console.log("\n=== fr.Contact.hoursLabel ===");
console.log(JSON.stringify(require("./messages/fr.json").Contact.hoursLabel));
console.log("=== zod schema min lengths (login-form) ===");
const lf = fs.readFileSync("src/components/admin/login-form.tsx", "utf8").split(/\r?\n/);
lf.forEach((ln, i) => { if (/min\(|z\.|schema/.test(ln)) console.log((i + 1) + ": " + ln.trim()); });
