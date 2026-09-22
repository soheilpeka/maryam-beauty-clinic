const fs = require("fs");
for (const f of ["messages/en.json", "messages/fr.json"]) {
  const raw = fs.readFileSync(f, "utf8");
  const lines = raw.split(/\r?\n/);
  console.log("\n=== " + f + " (first 8 lines) ===");
  lines.slice(0, 8).forEach((l) => console.log(JSON.stringify(l)));
  console.log("indent guess:", /^\s{2}"/.test(lines[1]) ? "2 spaces" : "unknown");
  console.log("trailing newline:", raw.endsWith("\n"));
}
