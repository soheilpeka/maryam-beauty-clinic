# Site regression audit — 2026-10-02

## Verified locally

| Check | Result |
| --- | --- |
| Vitest business/API tests | 159 passed |
| Development browser suite | 60 passed, 2 intentional skips, 0 failed |
| Production browser suite | 60 passed, 2 intentional skips, 0 failed |
| Production build / TypeScript | Passed; 83 generated pages |
| Dependency audit | 4 high, 0 critical advisories remain |

Browser suites cover English/French, desktop/mobile, public linked pages and images, horizontal overflow at 320px, homepage breakpoints, navigation and dialogs, gallery filters/lightbox, contact validation, booking submission/manage/cancellation, admin confirmation/decline/authentication, admin forms, store/catalog/cart/checkout, sold-out/loading/error states, reduced motion and dark appearance. Mutating tests use freshly provisioned isolated databases, mock email and isolated admin accounts.

Added regressions verify that Manage links remain on the current origin even when the API's absolute URL points at an old port, and that switching language/reloading preserves the signed booking token.

## Changes

- Service headings use a responsive size and natural wrapping so long names do not split arbitrarily mid-word.
- Added public-page crawling and local image-response checks in both browser projects/languages.
- Added optional production-build browser testing; production tests verify that mock checkout is refused with an actionable error. Development tests separately exercise the complete simulated order lifecycle.
- Expanded development route warmup after a first-compile JSON failure. The final complete run passed in both modes.

The existing compact mobile hero changes were preserved. No booking/customer/order data in the owner's local database was intentionally mutated by this audit.

## Remaining launch limitations

Passing these checks is not proof that every possible bug is absent. Hostinger deployment, its environment values, actual email delivery and real checkout/webhooks were not tested. Payment remains deliberately unavailable in production until integrated; local email tests do not establish inbox delivery. Owner-approved content/prices/policies and durable production storage still need launch review.

The four dependency alerts are in the Prisma toolchain (`prisma`, `@prisma/config`, `deepmerge-ts`, `mysql2`). npm's suggested fix downgrades Prisma to 6.19.3; no incompatible downgrade was applied. See SECURITY_REVIEW.md.

## Repeat the checks

PowerShell, from the project directory:

```powershell
npm test
npm run build
$env:E2E_USE_PRODUCTION = '1'
npm run e2e -- --workers=2
$env:E2E_USE_PRODUCTION = '0'
npm run e2e -- --workers=2
```

Ignored evidence: `artifacts/production-e2e-final.log`, `artifacts/development-e2e-final.log`, `artifacts/full-audit-build.log`, `artifacts/dependency-audit.json`, `artifacts/site-audit-service-fixed.png`.
