const fs = require("fs");
const path = require("path");
const en = require("./messages/en.json");
const fr = require("./messages/fr.json");

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (!["node_modules", ".next", ".git", ".playwright-mcp"].includes(f)) walk(p);
    } else if (/\.(tsx|ts)$/.test(f)) files.push(p);
  }
})("src");

const varRe = /const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(?:\{[^}]*namespace:\s*)?["']([A-Za-z0-9_.\-]+)["']/g;
const callRe = /\b([A-Za-z_$][\w$]*)\(\s*["']([A-Za-z0-9_.\-]+)["']/g;

function check(messages, label) {
  const missing = [];
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    const varMap = {};
    let m2;
    varRe.lastIndex = 0;
    while ((m2 = varRe.exec(src))) varMap[m2[1]] = m2[2];
    let c;
    callRe.lastIndex = 0;
    while ((c = callRe.exec(src))) {
      const nsName = varMap[c[1]];
      if (!nsName) continue;
      const key = c[2];
      const node = messages[nsName];
      if (node === undefined) { missing.push(`MISSING NS ${nsName} (used in ${f})`); continue; }
      if (typeof node === "object" && !Object.prototype.hasOwnProperty.call(node, key)) {
        missing.push(`${nsName}.${key}  <-  ${f.split(path.sep).join("/")}`);
      }
    }
  }
  const uniq = [...new Set(missing)];
  console.log(`\n=== ${label} missing (${uniq.length}) ===`);
  uniq.forEach((x) => console.log("  " + x));
}
check(en, "EN");
check(fr, "FR");
