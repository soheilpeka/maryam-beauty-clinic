const fs = require("fs");
function keys(o, p, out) {
  for (const k in o) {
    const np = p ? p + "." + k : k;
    if (o[k] && typeof o[k] === "object") keys(o[k], np, out);
    else out.push(np);
  }
  return out;
}
const en = keys(JSON.parse(fs.readFileSync("messages/en.json", "utf8")), "", []);
const fr = keys(JSON.parse(fs.readFileSync("messages/fr.json", "utf8")), "", []);
const missingFr = en.filter((k) => !fr.includes(k));
const missingEn = fr.filter((k) => !en.includes(k));
console.log("EN keys:", en.length, "FR keys:", fr.length);
console.log("missing in FR:", missingFr.length, missingFr.slice(0, 10));
console.log("missing in EN:", missingEn.length, missingEn.slice(0, 10));
