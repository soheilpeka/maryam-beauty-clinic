const fs = require("fs");
const f = "messages/fr.json";
let s = fs.readFileSync(f, "utf8");
const R = "\ufffd";
const fixes = [
  ["traitements de beaut" + R, "traitements de beaut\u00e9"],
  ["Soins esth" + R + "tiques", "Soins esth\u00e9tiques"],
  ["personnalis" + R + "s, con", "personnalis\u00e9s, con"],
  ["con" + R + "us pour vous aider", "con\u00e7us pour vous aider"],
  ["vous aider " + R + " vous sentir", "vous aider \u00e0 vous sentir"],
  ["et " + R + " para", "et \u00e0 para"],
  ["para" + R + "tre au mieux", "para\u00eetre au mieux"],
  ["8 caract" + R + "res", "8 caract\u00e8res"],
  ["pour g" + R + "rer les r", "pour g\u00e9rer les r"],
  ["les r" + R + "servations", "les r\u00e9servations"],
];
for (const [from, to] of fixes) {
  const n = s.split(from).length - 1;
  if (n !== 1) { console.error("EXPECTED 1 match, got " + n + " for: " + JSON.stringify(from)); process.exit(1); }
  s = s.replace(from, to);
}
let count = 0;
for (let i = 0; i < s.length; i++) if (s.codePointAt(i) === 0xfffd) count++;
if (count !== 0) { console.error("STILL " + count + " replacement chars"); process.exit(1); }
JSON.parse(s);
fs.writeFileSync(f, s, "utf8");
console.log("OK: 10 fixes applied, JSON valid, no BOM, no replacement chars");
