const en = require("./messages/en.json");
const fr = require("./messages/fr.json");
for (const ns of ["Meta", "Validation", "Admin", "Services", "Packages", "Blog", "GiftCard", "Contact", "Hero"]) {
  console.log("\n===== " + ns + " =====");
  console.log("EN keys: " + Object.keys(en[ns] || {}).join(", "));
  const frOnly = Object.keys(fr[ns] || {}).filter((k) => !(en[ns] || {}).hasOwnProperty(k));
  const enOnly = Object.keys(en[ns] || {}).filter((k) => !(fr[ns] || {}).hasOwnProperty(k));
  if (frOnly.length) console.log("FR-only: " + frOnly.join(", "));
  if (enOnly.length) console.log("EN-only: " + enOnly.join(", "));
}
