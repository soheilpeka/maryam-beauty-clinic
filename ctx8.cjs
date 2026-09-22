const fs = require("fs");
const r = fs.readFileSync("src/lib/validation.ts", "utf8").split(/\r?\n/);
r.forEach((ln, i) => { if (i >= 0 && i <= 70) console.log((i + 1) + ": " + ln); });
