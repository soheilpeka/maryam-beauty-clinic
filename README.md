# Maryam C Beauté

Next.js 16 bilingual Maryam C Beauté website for Brossard, with an editorial public experience,
request-and-approve booking flow, protected admin tools and a provisional retail-store extension.

## Content and integrations

The verified provisional business identity is centralized in `src/lib/content/business.ts`.
Opening hours, final service copy, client photography, product catalog, Facebook URL and final
policies remain owner-dependent. Book Now uses the internal request-and-approve flow.

Booking notifications default to a mock console provider. For real email, set
`NOTIFICATION_PROVIDER=resend`, `RESEND_API_KEY`, `NOTIFICATION_FROM_EMAIL` (a verified sender),
and `ADMIN_NOTIFICATION_EMAIL`. Delivery is not considered production-ready until the owner
verifies a real request, confirmation, decline and cancellation message.

Public prices, durations, staff, store products and gallery images are demo placeholders. The
Google Maps review excerpts shown on the homepage are short, attributable excerpts linked back to
the owner-provided listing.

## Store extension

The store is available at `/en/store` and `/fr/store`. It includes a server-rendered catalog,
localized product pages, persistent cart, server-reconciled quote, guest checkout, signed order
status links, and admin catalog/order screens under `/[locale]/admin/products` and
`/[locale]/admin/orders`.

The public store hides all seeded demo products and shows a polished empty state until the owner
publishes real products from the admin. Replace the catalog, configure shipping/fulfilment and
notifications before launch. Payment selection defaults to a configuration-safe Stripe test-mode
boundary; hosted Checkout/PaymentIntent and webhook reconciliation still require owner credentials
and implementation. The mock provider is available only for isolated local/e2e demos and is blocked
in production. Admins can configure order acceptance, CAD shipping fee, free-shipping threshold and
the duration of an unpaid inventory reservation at `/[locale]/admin/store-settings`; changes are
session/CSRF protected, validated and audit logged. Production checkout remains closed until hosted
Stripe Checkout, signed webhook reconciliation and an owner-approved test transaction are complete.

## Verification

Latest whole-site QA continuation: `QA_REVIEW_2026-10-03.md` lists corrected defects, exact
verification results and production limitations. `node scripts/qa-preview.mjs http://localhost:3050`
runs a read-only local browser sweep without submitting owner-preview forms.
For an existing database missing only the three Booking contact snapshot columns, use
`npm run prisma:migrate-booking-contacts`: it backs up a local database and performs an additive,
repeatable transaction without resetting or rewriting records. Verify/back up any separate host
database first; remote execution requires the explicit `--allow-remote` flag. Do not publish backups.

```text
npm run typecheck      # TypeScript 7 native compiler; TypeScript 6 API is used by build/lint
npm run lint           # ESLint flat config; current quality warnings remain visible
npm test -- --run       # latest whole-site continuation: 433 Vitest tests
npm run build          # production build, current route count is printed by Next.js
npx playwright test    # desktop/mobile browser regression
```

The e2e setup uses a unique `prisma/e2e-<run>.db`, seeds demo data and bootstraps isolated admin
accounts, so it does not mutate `prisma/dev.db`.

Run the local owner preview with `npm run dev -- -p 3020`, then open
`http://localhost:3020/en` or `/fr`. The protected content pages cover services, products,
packages, staff and gallery, with validated image references, direct photo uploads and reusable previews. Do not publish
sample photos as the salon's real client work. Uploaded photographs use bounded persistent database storage;
remote URL validation does not inspect actual image bytes or prove file size.

For a stable production preview on port 3050, use `npm run preview`. Stop the existing
preview first. This builds and serves `.next-preview`, separately from ordinary `.next`
builds and test servers, so later builds do not invalidate its stylesheet/chunk URLs.
Set `PREVIEW_PORT` for a different local port. `qa-preview.mjs` now also reports failed
Next.js static assets, including missing stylesheets.

Latest security hardening: see `SECURITY_HARDENING_2026-10-02.md` for findings and
`SECURITY_OPERATIONS_2026-10-03.md` for the completed local maintenance, verification and
remaining production actions. Before deployment, back up and verify the identified target
database, then apply the three nullable Booking contact snapshot columns and the additive
RateLimitBucket table/index. Production request budgets use that shared table and refuse
requests with 503 if it is unavailable; development/test budgets remain in memory.

`npm run security:maintain-local` backs up only an existing local database inside `prisma/`,
encrypts and verifies the backup, applies only that additive security schema, replaces weak
local signing keys, and protects the affected files. It refuses remote database URLs.
The command has run successfully on the local database. No remote/production database,
hosting setting, deployment or external account was changed. Keep the ignored `.private/keys/`
separate from encrypted backups; losing the key makes those backups unrecoverable.


### Owner-supplied salon photography

`public/media/salon/` contains optimized, metadata-free WebP derivatives of the supplied salon, Caver1, team and eight HEIC gallery photographs. Originals stay in the ignored `pics/` folder. No before/after relationship is inferred from these photographs.

For an existing database, run `npm run prisma:refresh-salon-media` locally, or `npm run prisma:refresh-salon-media-staging` against the configured staging database. This is a one-time content upgrade: it replaces only untouched legacy gallery seed records, preserves their visibility, retains CMS edits, and creates the newly supplied gallery entries. It does not seed/reset services, users, bookings or orders. Future gallery edits use the existing admin panel. The staging command requires `.env.staging` and the existing remote database guard. Deploy the corresponding public assets together with this content upgrade.

`ImageComparison` is an accessible, touch-enabled range component mounted only for supplied before/after pairs, not unrelated salon photographs. Review original captions, photo permissions and business content before the public launch.
# Owner-approved skin package content

The EN/FR public package page reads active Package CMS records and uses the approved interactive presentation. To import the five owner-supplied programs into the configured database, run `npm run prisma:publish-packages`. This creates only missing slugs and never overwrites existing records. It has been run on the local database; a separate deployed database needs its own controlled import before the programs appear there. Confirm the target `DATABASE_URL` before running it.

Names, descriptions, price, sessions, ordering and active state are editable through the existing admin. Extended schedules, inclusions and installment offers remain source-managed in `src/lib/content/skin-programs.ts` and `src/components/packages/package-experience.tsx`; French copy is in `src/lib/content/skin-programs-fr.ts`. Changing a CMS price hides the original savings/installments to avoid publishing an outdated offer.

### Before/after CMS and deployment

`/en/admin/gallery` and `/fr/admin/gallery` now have a separate Before/after section. Owners can add/edit bilingual names and descriptions, two image references, category, aspect ratio, viewport framing, visibility and display order, with live slider preview and search/filter/pagination. Existing salon gallery records are unchanged. Public comparisons read active `ComparisonItem` database records on every page request; the static source module is only the initial import manifest, not a public fallback that would undo deactivation.

For a separate host database: back it up, verify the target `DATABASE_URL`, apply the additive schema using the project's existing `npx prisma db push` workflow (never use force-reset or accept-data-loss), regenerate the client, then run `npm run prisma:import-comparisons` once. The importer creates only missing fixed IDs and never changes saved copy, framing, order or inactive state. These steps have been performed on the local database, not the host. The WebP assets must be deployed with the code. Do not use the general seed script to upgrade an existing owner database.

For an existing remote database missing `ComparisonItem` or the owner-approved content,
use the backup-gated `scripts/remote-security-maintenance.ts` command with `--allow-remote`,
`--expected-target-sha256 <verified-fingerprint>` and `--apply-content-upgrade`. It verifies
an encrypted snapshot and isolated restore before adding only the comparison table/index,
then imports missing approved packages/comparisons and untouched legacy salon gallery entries.
Existing CMS changes and inactive records remain authoritative. This is an explicit release
operation, never an automatic seed on application startup or a reset of customer records.

New image references accept validated public paths or HTTPS raster-image URLs. Admins can also choose JPEG, PNG or WebP files directly from a phone or computer in services, packages, products, gallery, comparisons and staff forms. `/api/admin/media/upload` requires a live admin session, CSRF and a shared admin upload budget. Uploads are streamed with a 10 MiB cap, decoded with a 24 megapixel cap, auto-oriented, stripped of metadata and converted to WebP within 1600 x 1600 and 512 KiB. SVG, animated formats and unsupported HEIC are rejected; export HEIC to JPEG first. Two images may be processed concurrently per instance, with a ten-second processing deadline.

Processed files are stored in the `MediaUpload` SQLite/libSQL BLOB table, independent of Hostinger deployment files. This small-clinic storage is capped atomically at 200 MiB and 2,000 images, including unlinked drafts. Database storage, transfer and backups therefore grow with photographs; larger catalogs should move to object storage. No original filename, EXIF or GPS data is retained. Drafts are accessible only to authenticated admins. A photograph becomes public only while referenced by an active CMS record. Image responses are always private/no-store so deactivating content revokes public access; copies already downloaded cannot be recalled. Removing a form image/reference does not delete stored bytes.

Local upgrade: `npm run security:maintain-local` backs up the local DB then creates the upload table additively. Remote upgrade: use `scripts/remote-security-maintenance.ts --allow-remote --expected-target-sha256 <verified-fingerprint> --apply-media-schema` with the verified host environment; it creates and verifies an encrypted backup before creating only the upload table. Do not run a general seed/reset. `sharp` and its supported WebAssembly fallback are included for Hostinger compatibility; production upload writes were not used as a test. External URL references still do not verify remote file bytes.
