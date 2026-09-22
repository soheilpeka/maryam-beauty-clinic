const fs = require("fs");
const lf = fs.readFileSync("src/components/admin/login-form.tsx", "utf8").split(/\r?\n/);
lf.forEach((ln, i) => { if (i <= 45) console.log((i + 1) + ": " + ln); });
