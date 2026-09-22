const fs = require("fs");
const path = require("path");
const en = require("./messages/en.json");
const fr = require("./messages/fr.json");

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) { if (!["node_modules", ".next", ".git", ".playwright-mcp"].includes(f)) walk(p); }
    else if (/\.(tsx|ts)$/.test(f)) files.push(p);
  }
})("src");

// Map a variable name -> namespace, resolved per source POSITION (handles shadowing).
const declRe = /const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(?:\{[^}]*namespace:\s*)?["']([A-Za-z0-9_.\-]+)["']/g;
const callRe = /\b([A-Za-z_$][\w$]*)\(\s*["']([A-Za-z0-9_.\-]+)["']/g;

function resolve(msg, ns, key) {
  const node = msg[ns];
  if (node === undefined) return { ok: false, why: "NO_NS" };
  const parts = key.split(".");
  let cur = node;
  for (const p of parts) {
    if (cur === null || typeof cur !== "object" || !(p in cur)) return { ok: false, why: "NO_KEY" };
    cur = cur[p];
  }
  return { ok: true };
}

function check(messages, label) {
  const missing = [];
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    // Build position-sorted declarations: [index, var, ns]
    const decls = [];
    let m;
    declRe.lastIndex = 0;
    while ((m = declRe.exec(src))) decls.push([m.index, m[1], m[2]]);
    decls.sort((a, b) => a[0] - b[0]);
    let c;
    callRe.lastIndex = 0;
    while ((c = callRe.exec(src))) {
      const pos = c.index, varName = c[1], key = c[2];
      // last declaration of this var name before pos
      let ns = null;
      for (const d of decls) { if (d[0] > pos) break; if (d[1] === varName) ns = d[2]; }
      if (!ns) continue;
      const r = resolve(messages, ns, key);
      if (!r.ok) missing.push(`${ns}.${key}  <-  ${f.split(path.sep).join("/")}`);
    }
  }
  const uniq = [...new Set(missing)];
  console.log(`\n=== ${label} missing (${uniq.length}) ===`);
  uniq.forEach((x) => console.log("  " + x));
  return uniq.length;
}
const a = check(en, "EN");
const b = check(fr, "FR");
process.exit(a + b === 0 ? 0 : 1);
