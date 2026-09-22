const fs = require("fs");
const r = fs.readFileSync("src/app/api/admin/login/route.ts", "utf8").split(/\r?\n/);
r.forEach((ln, i) => { if (i <= 17) console.log((i + 1) + ": " + ln); });
console.log("\n=== schema search ===");
const cp = require("child_process");
