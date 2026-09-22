const fs = require("fs");
const files = [
  "src/app/[locale]/blog/page.tsx",
  "src/app/[locale]/book-online/page.tsx",
  "src/app/[locale]/contact/page.tsx",
  "src/app/[locale]/gallery/page.tsx",
  "src/app/[locale]/gift-card/page.tsx",
  "src/app/[locale]/pricing-plans/packages/page.tsx",
  "src/app/[locale]/service-page/[slug]/page.tsx",
  "src/app/[locale]/admin/login/page.tsx",
  "src/components/admin/login-form.tsx",
  "src/components/site-header.tsx",
];
const re = /(getTranslations|useTranslations)|([A-Za-z_$][\w$]*)\(\s*["']([A-Za-z0-9_.\-]+)["']/;
for (const f of files) {
  const lines = fs.readFileSync(f, "utf8").split(/\r?\n/);
  console.log("\n===== " + f + " =====");
  lines.forEach((ln, i) => {
    if (/Translations/.test(ln) || /\bt\w*\(['"]/.test(ln)) {
      console.log(String(i + 1).padStart(4) + ": " + ln.trim());
    }
  });
}
