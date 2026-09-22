const fs = require("fs");
const r = fs.readFileSync("src/app/api/admin/login/route.ts", "utf8").split(/\r?\n/);
r.forEach((ln, i) => { if (/min\(|z\.|message|fieldErrors|password|email/.test(ln)) console.log((i + 1) + ": " + ln.trim()); });
