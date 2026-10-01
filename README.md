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
