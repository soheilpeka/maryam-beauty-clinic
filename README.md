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
in production.

## Verification

```text
npm run typecheck      # TypeScript
npm test -- --run       # 159 Vitest tests
npm run build          # production build, current route count is printed by Next.js
npx playwright test    # desktop/mobile browser regression
```

The e2e setup uses a unique `prisma/e2e-<run>.db`, seeds demo data and bootstraps isolated admin
accounts, so it does not mutate `prisma/dev.db`.

Run the local owner preview with `npm run dev -- -p 3020`, then open
`http://localhost:3020/en` or `/fr`. The protected content pages cover services, products,
packages, staff and gallery, with validated URL-based media and reusable previews. Do not publish
sample photos as the salon's real client work. Uploads require an approved storage adapter;
remote URL validation does not inspect actual image bytes or prove file size.

Latest security maintenance: Next.js 16.3.6. See `SECURITY_REVIEW.md` for remaining transitive
dependency advisories and production configuration gates.


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

New image references accept validated public paths or HTTPS raster-image URLs through the shared media policy. URL references do not verify external file bytes; uploads require an approved cloud storage adapter later. No production filesystem upload is offered.
