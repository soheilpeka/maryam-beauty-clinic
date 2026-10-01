# Maryam Beauty Clinic - Progress

## 2026-10-01 — Bare-domain homepage redirect

- Added an exact-root temporary redirect from `/` to the existing default-language homepage `/en`. EN/FR page paths and the admin proxy are unchanged.
- Production Webpack build passed with TypeScript validation and 83 generated pages; the built routes manifest contains the `/` to `/en` redirect with status 307. Direct requests from this environment to the Hostinger preview timed out, so live hosting behavior requires deployment confirmation.

## 2026-10-01 — Hostinger build compatibility

- Investigated the supplied Hostinger log: native SWC requires GLIBC_2.29 unavailable on the host, followed by a TypeScript config import failure while falling back to WASM.
- Converted `next.config.ts` to equivalent `next.config.mjs` and switched production builds to the supported `next build --webpack` path, allowing SWC WASM fallback without Turbopack native requirements.
- Removed non-route helper exports from the requests API after Webpack's generated route validation identified them as invalid. The helpers and request behavior are unchanged.
- Production build completed locally with SWC WASM forced for compatibility verification, including TypeScript validation and 83 generated pages. Hostinger redeployment still needs to confirm the result on the actual Linux host. Existing dependency advisories are not resolved by this compatibility change.

## 2026-10-01 — Remote staging database initialized

- Investigated the owner's failed staging setup: the database connection worked but no application tables existed. Retrying initialization succeeded; the original failure was not reproducible and its exact cause remains unconfirmed.
- Improved initializer error reporting to show a bounded actionable message with environment credentials redacted, rather than the previous generic error.
- Created all 27 application tables in the remote staging database, seeded the provisional catalog (16 services, 3 staff, 4 gallery items, 3 testimonial excerpts and 11 demo products), and bootstrapped the owner-configured administrator. Demo products remain subject to the existing public visibility guards.
- Verified the service count and the configured administrator/password against the remote database. TypeScript compilation passed. The local development database was not modified and no Hostinger deployment was performed.

## 2026-10-01 — Staging database setup preparation

- Added explicit libSQL client dependency and generated the empty initial SQL schema from the current Prisma schema. The SQL contains structure only, with no owner/customer data.
- Added separate `.env.staging` commands to initialize a NEW empty remote database, seed provisional content once, and bootstrap the chosen administrator. A preload guard rejects missing remote credentials before seed/admin scripts can fall back to the local `.env` database; initialization refuses databases with existing tables.
- Seed and administrator bootstrap now pass the remote database auth token to the libSQL adapter. `.env.staging` is ignored by Git.
- TypeScript compilation passed. No local database was reset or seeded, no remote database was connected, and no Hostinger deployment was performed. Real email, payment and media storage integration remain separate launch requirements.

## 2026-10-01 — Website-wide visual consistency pass (verified)

- Re-read instructions/spec/history, inspected the dirty tree and live preview on 3020. Preserving all valid work and owner data.
- Inventoried every route family in VISUAL_REVIEW.md before implementation. Browser inspection confirms old rounded/generic layouts remain in cart, booking, service details and admin login despite prior green functional tests.
- Extending the approved homepage through reusable editorial page/empty-state components, dedicated booking/store compositions and a practical branded admin sidebar. Browser screenshots and representative populated states are required before marking this pass verified.
- Implemented shared editorial heading/empty-state components and tokens, image-led empty cart/checkout, open checkout fieldsets, ruled booking choices/summary, stone service heroes, unboxed catalog/gallery, branded order/404/error states, split admin login and a responsive admin sidebar across all nine management screens. Kept the approved homepage composition.
- Corrected missing manage-booking status/detail translations, exposed salon-declined status separately, replaced browser confirm with a keyboard-operable native cancellation dialog, added an accessible admin error alert, and excluded demo products from public detail/related-product queries. Removed technical customer copy without implying live email/payment delivery.
- Final visual inspection found a mobile dashboard chart overflowing even though the earlier innerWidth check passed; confined the chart to a keyboard-accessible scroll region and strengthened browser assertions against the configured viewport width. Cart quotes now reset while refreshing so stale availability cannot leave checkout enabled after a quote error.
- Added isolated screenshot/workflow coverage for bilingual populated cart/checkout, API errors, native validation, pending/confirmed/declined/customer-cancelled requests, team schedules, customer history, expanded orders, navigation/keyboard focus, sold-out presentation and loading states. No owner database records were mutated.
- Retained dark mode with neutral editorial tokens, corrected dark primary-button contrast, and verified reduced-motion layouts. Repaired both dashboard implicit grid sizing/positioned chart labels and French staff action wrapping; strict configured-viewport assertions now pass across all admin route families.
- Final verification: TypeScript 0 errors; Vitest 159 passed / 0 failed across 9 files; production build passed (Next.js 16.3.6, 83 generated pages); Playwright `--workers=1` 46 passed / 2 skipped / 0 failed, 48 total. The two skips are mobile-only scenarios excluded on desktop. This supersedes the intermediate failed/partial runs and previous counts.
- Saved 58 selected desktop/mobile screenshots under `artifacts/visual-review-2026-10-01/`; VISUAL_REVIEW.md records the route/state checklist, responsive decisions and integration limits. The owner preview is restored using the normal development configuration rather than any isolated E2E database.
- Final read-only preview check: 42 public EN/FR route/viewport combinations at 320/390/1280px returned HTTP 200, with no horizontal overflow or browser runtime errors. Rechecked dark sign-in button contrast and recaptured its final desktop/mobile images. A six-panel overview accompanies the 58 selected screenshots.

## 2026-10-01 — Current-state continuation

- Preserved the existing dirty tree, new CMS/store files and owner media; no commit, deployment, database reset or destructive cleanup.
- Rechecked EN/FR public pages on desktop and mobile; the About MP4 loads with a 38.08-second duration and 1920-pixel video width. All 16 service routes are checked in the browser suite.
- Fixed the invisible cart control on the black header, localized admin team service labels and public CAD formatting, aligned remaining admin card colors with shared editorial tokens, and added an accessible bilingual booking FAQ without inventing policies.
- Contact validation now associates each error with its field. Booking request, approval, decline and cancellation await notification delivery attempts; Resend calls have a bounded timeout and the default admin destination remains Maryam_champir@yahoo.com.
- Preserved booking name/price/duration snapshots, CMS-authoritative active content, package relationships, URL-only media handling and guarded store pricing/inventory/order flows from the previous continuation.
- Browser verification before the security patch: 36 passed, 2 mobile-only skips on desktop, 0 failed. Added native-dialog preview/Escape and real About-video playback coverage for the final run.
- Updated Next.js 16.3.5 → 16.3.6 for GHSA-vcvr-r3jv-pc5j; no `next/og` ImageResponse usage exists in this app. Four high transitive Prisma/mysql2/deepmerge-ts advisories remain; automatic remediation requires a breaking downgrade and was not applied.
- E2E now uses a unique `prisma/e2e-<run>.db` without deleting any existing database, preventing the locked old e2e.db from blocking verification. Application dev.db is never used by browser mutation tests.
- Added private store metadata (noindex/nofollow), corrected the order-route robots path, and verified admin team create/localized publication/deactivation as well as service/package/gallery mutations and product checkout/order administration. Service detail pages now display approved durations or honest consultation-only labels.
- Final verification (after the public staff policy and narrow-mobile fixes): TypeScript passed with zero errors; Vitest 159 passed / 0 failed across 9 files; production build passed (Next.js 16.3.6, 83 generated pages); Playwright `--workers=1` 40 passed / 2 skipped / 0 failed. The two skips are mobile-only tests excluded on desktop. Counts supersede older historical progress claims. Owner preview runs on http://localhost:3020/en and /fr with the preserved development database.
- Final read-only owner-data crawl found narrow 320px overflow in editorial grid headings and French booking cards. Fixed responsive minmax tracks, long-word wrapping and stacked mobile price labels, with a bilingual 320px browser regression test. Rechecked 33 public page/viewport combinations at 320/390/1280px with no overflow or non-200 responses.
- Read-only inspection found four obsolete demo staff identities still active in dev.db. A shared public staff policy excludes only those exact unchanged profiles from public pages and booking selection (including the server API), while retaining records and historical bookings in admin. Owner replacements remain eligible. Numbered sample profiles are clearly disclosed as provisional. Added focused regression tests; no database rows were changed.


## 2026-09-30 - Maryam C Beauté completion pass

- [x] Corrected owner-supplied Brossard contact details, email and opening hours (Tue 10–16,
      Wed 10–18, Thu–Fri 10–21, Sat 10–16; Sun–Mon closed) across public contact/footer/service views.
- [x] Added bilingual `/en/about` and `/fr/about` pages with the owner-provided `about.mp4` copied
      to `public/media/about.mp4`; the original file in `pics/` remains untouched.
- [x] Replaced the provisional menu with 15 bilingual services and consultation-only pricing/duration
      labels; added Wellness category parity and preserved the booking test service slug.
- [x] Kept the public store free of seeded demo products; admin-published products still flow through
      the existing server-authoritative cart/order path. Added an empty-state-aware Playwright flow.
- [x] Removed Fresha redirects and kept internal request-and-approve booking as the public contract.
      Stripe test mode is now the default payment boundary; hosted Checkout/PaymentIntent and webhook
      reconciliation remain explicitly unconfigured until the owner supplies credentials and approves
      the payment flow. Mock payments remain isolated to local/e2e configuration.
- [x] Verification: `npm run typecheck`, `npm test -- --run` (150/150), `npm run build` (81 generated
      pages), and `npx playwright test --workers=1` (30 passed, 2 skipped).

## 2026-09-27 - Maryam C Beauté identity and public-content audit

- [x] Audited the current dirty tree, project specification, Next 16 App Router metadata/image/sitemap/accessibility guidance, public routes, booking/admin/store boundaries and security hotspots before editing.
- [x] Verified the official business source and owner-provided Google Maps listing: Maryam C Beauté, 621 Av. Stravinski, Brossard, QC J4X 1Y7, (450) 466-3120, info@maryamcbeaute.ca; retained a centralized hours-pending state because published hours conflict.
- [x] Centralized the corrected identity, social links, maps/reviews link and future Fresha configuration; Fresha remains a placeholder until the owner provides the official URL.
- [x] Removed legacy Thornhill/old-clinic identity from public metadata, navigation, footer, notifications, seed comments and public content; replaced old blog/packages/gift-card content with owner-approval placeholders and removed those pages from the sitemap.
- [x] Replaced the static service catalog with an official-source-derived provisional menu whose prices/durations are intentionally not claimed; marked gallery/store assets as temporary examples.
- [x] Added a small set of short, attributable Google Maps review excerpts and a direct listing link; no unverifiable reviews are published.
- [x] Verification after edits: `npm run typecheck` clean, `npm test` 150/150, `npm run build` passes 69 pages. `npm audit --omit=dev` still reports 4 high advisories through Prisma's transitive `deepmerge-ts`/`mysql2`; upgrading would force a breaking Prisma downgrade, so it remains an explicit dependency handoff item.

Legend: [ ] pending, [~] in progress, [x] done. Update after every phase.

## Store extension (2026-09-27)

### Store Phase 1 - Repository/store audit + architecture plan
- [x] Read PROJECT_SPEC.md, PROGRESS.md, AGENTS.md, current Next 16 App Router guides,
      Prisma schema, git status/diff, public layout/navigation/design tokens, booking and
      admin architecture, sessions/CSRF/audit/rate limiting, validation/i18n, and all tests.
- [x] Preserved the substantial uncommitted store draft already in the tree: Product/Order
      schema, demo seed catalog, public product/order APIs, catalog/product/cart UI, cart
      persistence, payment abstraction, and admin product/order API routes.
- [x] Audit findings: the draft is not wired into CartProvider/navigation/i18n; checkout,
      confirmation, admin product/order UI, tests and sitemap integration are absent; the
      build fails at /en/store/cart because no CartProvider is mounted; failed payments
      reserve inventory indefinitely; product copy contains unsupported claims; there is
      no idempotency, reservation expiry/release, refund state, SKU/featured/gallery data,
      or production guard for the mock gateway.
- [x] Architecture decision: integer CAD cents; server-authoritative pricing/shipping;
      short-lived atomic inventory reservations with an expiry and exactly-once release;
      successful payment commits reserved stock; payment failure/expiry releases it;
      cancellation/refund restocks committed stock once; immutable OrderItem snapshots;
      unique checkout idempotency key; signed public order links; mock gateway disabled in
      production unless explicitly opted in; admin mutations retain session + CSRF + Zod +
      AuditLog controls. Product content supports EN/FR and an ordered image gallery.
- [x] Phase verification: `npm run typecheck` clean; existing Vitest 142/142 passed. Current
      pre-implementation `npm run build` correctly exposed the missing CartProvider and
      failed only while prerendering /en/store/cart. No existing tests regressed.
- [x] Risks/TODOs: real product data, product photography, shipping rules, notifications,
      and a real production payment gateway remain external business integrations.

### Store Phase 2 - Schema/domain model + validation + core services
- [x] Product/order/payment/reservation schema and migration-safe seed updates
- [x] Zod schemas, cart/shipping math, payment provider boundary, inventory state machine
- [x] Unit/integration coverage for pricing, snapshots, concurrency, failure and release
- [x] Added bilingual product content, unique SKU, featured state, ordered ProductImage
      gallery, PaymentAttempt metadata, checkout idempotency, reservation/commit/restore
      timestamps and meaningful PAYMENT_FAILED/EXPIRED/REFUNDED states. Demo medical and
      clinic-equivalence claims were removed.
- [x] Inventory state machine implemented in src/lib/order.ts: one transaction atomically
      decrements all lines and writes immutable snapshots; gateway approval commits; decline
      or error restores immediately; stale PENDING reservations expire opportunistically;
      cancellation/refund restores committed inventory once; invalid status transitions
      are rejected. Mock payments throw in production unless explicitly opted in.
- [x] Phase verification: `npm run typecheck` clean; store tests 8/8; full Vitest 150/150.
      Concurrency test proves only one buyer can purchase the final unit. Remaining risk:
      a real gateway must implement authorization/capture/webhooks before live checkout.

### Store Phase 3 - Storefront + product pages
- [x] Premium landing/catalog, search/filter/sort, featured/category sections, product gallery
- [x] Responsive/dark/accessibility states and navigation integration
- [x] Store now sits inside the shared header/layout with a persistent cart provider and
      desktop/mobile cart access. Catalog is server-rendered, bilingual, searchable by
      content/SKU, category-filterable and sortable; product cards expose sale/sold-out/
      low-stock states. Product pages include an accessible gallery, quantity controls,
      buy-now, localized content and related products. Images use next/image with explicit
      sizing and safe unoptimized handling only for validated HTTPS admin URLs.
- [x] Phase verification: `npm run typecheck` clean and `npm run build` passes all 119
      generated pages; the previous missing-CartProvider build failure is resolved.
- [x] Remaining polish is intentionally tracked in Phase 7: JSON-LD, sitemap products,
      final breakpoint/keyboard checks and live visual QA.

### Store Phase 4 - Cart + checkout
- [x] Persistent cart, server reconciliation, checkout validation and idempotent submission
- [x] Confirmation and secure order-status pages
- [x] Added POST /api/store/cart/quote: every cart view re-reads active product price,
      stock and current shipping settings. The client cart remains a display cache only;
      checkout sends slug/quantity/idempotency key and the server re-prices/reserves again.
- [x] Added bilingual guest checkout with accessible labels, disabled duplicate submit,
      safe generic errors, mock-payment disclosure and a signed-token order status page.
- [x] Phase verification: `npm run typecheck` clean and `npm run build` passes with 125
      generated pages. Store route tests remain green; browser/E2E checkout coverage is
      still pending in Phase 9.

### Store Phase 5 - Orders + inventory + payment state machine
- [x] Reservation expiry/release, paid/cancelled/refunded transitions, payment metadata

### Store Phase 6 - Admin products/orders/inventory
- [x] Product CRUD and inventory visibility in existing AdminPageShell/AdminNav
- [x] Order list/detail/search/filter/status management with audit logs
- [x] Added bilingual /admin/products and /admin/orders pages reusing the existing session,
      CSRF, Zod, AdminPageShell/AdminNav and AuditLog-backed APIs. Product forms cover SKU,
      bilingual names/descriptions, price/sale price, image, stock, active and featured;
      orders show customer/items/totals and only allow valid lifecycle transitions.
- [x] Phase verification: `npm run typecheck` clean and `npm run build` passes. Admin API
      audit/authorization coverage still needs store-specific route tests in Phase 9.

### Store Phase 7 - i18n + SEO + accessibility + performance polish
- [x] EN/FR parity, metadata/JSON-LD/breadcrumbs/sitemap, image and bundle optimization
- [x] EN/FR key parity checked recursively; product and breadcrumb JSON-LD is escaped and
      intentionally contains no ratings/reviews; active product URLs and image metadata are
      included in sitemap.xml; next/image sizing and validated HTTPS handling are in place.

### Store Phase 8 - Security review
- [x] Run installed security-review skill and fix legitimate findings
- [x] Reviewed 39 hotspot candidates. Fixed guest/admin error-detail leakage and kept generic
      responses at trust boundaries. Remaining candidates are controlled JSON-LD with `<`
      escaped, Prisma/regex/test-fixture false positives, and an existing controlled booking
      conflict message. Checkout has rate limiting, idempotency, server-side pricing, signed
      order links, admin session+CSRF+audit protection, and production mock-payment blocking.

### Store Phase 9 - Unit/integration/E2E + complete regression suite
- [x] Store unit/integration tests, customer/admin Playwright flows, full legacy regression
- [x] Store tests cover totals, strict validation, server pricing/snapshots, idempotency,
      final-unit concurrency, decline release, expiry exactly-once release and lifecycle
      transitions. Playwright covers desktop/mobile customer checkout/order status and admin
      product CRUD/order inspection. Existing booking/admin/mobile/smoke suites remain green.

### Store Phase 10 - Final cleanup + documentation
- [x] README, final PROGRESS.md, exact verification matrix and production handoff

## Phase 0 - Setup and planning
- [x] Choose stack: Next.js + TypeScript + Tailwind + Prisma (SQLite) + next-intl + zod + vitest
- [x] Freeze requirements in PROJECT_SPEC.md
- [x] Create this progress tracker
- [x] Scaffold project (package.json, configs, folders)
- [x] Verify library versions with npm view: TS 7.0.2, Vitest 5.0.1, Next 16.3.5, Prisma 7.10.0, next-intl 4.14.5, zod 4.6.5

## Phase 1 - Plan + scaffold + database schema
- [x] Configs: tsconfig, next.config (next-intl plugin), postcss (TW v4), vitest, playwright, prisma.config.ts
- [x] prisma/schema.prisma: all models; Booking has @@unique([staffId, startUtc]) for race safety
- [x] Seed script with DEMO placeholder data (8 services, 4 staff)
- [x] prisma generate + push + seed verified (8 services, 4 staff, 6 gallery, 5 FAQ pairs, 3 demo testimonials, hashed admin)

## Phase 2 - Public site
- [x] Layout, header/footer, language switcher, dark mode, reduced motion (build passing)
- [x] Hero, services, staff, gallery, reviews, FAQ, contact + map placeholder
- [x] SEO: metadata, Open Graph, sitemap, robots, hreflang
- [x] VERIFIED 2026-09-21: `npm run build` passes (8/8 pages) and `npm test` 5/5 after the
      "Expected a suspended thenable" fix. Phase 2 signed off.

## Phase 3 - Booking engine + flow
- [x] Slot calculation from working hours / duration / breaks / days off
- [x] Race-safe booking creation: atomic INSERT ... WHERE NOT EXISTS (overlap subquery);
      @@unique([staffId, startUtc]) deliberately NOT used (see the schema note for why)
- [x] Booking flow UI with loading / empty / error states (build passing)
- [x] Cancel/reschedule via secure signed link + confirmation page (PATCH/DELETE covered by tests)
- [x] Mock email/SMS provider (swappable) + rate limiting on slots + bookings
- [x] Unit + integration tests: slot DST, same-start/partial-overlap/back-to-back,
      concurrency, and reschedule-via-PATCH at the route layer
- [x] PRE-PHASE-4 AUDIT 2026-09-21 (tsc clean, npm test 43/43 over 5 files, build passes):
      (1) DST slot tests present - slots-dst.test.ts covers both 2026 America/Toronto
      transitions on the boundary days themselves (Mar 8 spring forward: 09:00 local =
      13:00 UTC / UTC-4; Nov 1 fall back: 09:00 local = 14:00 UTC / UTC-5), plus same
      local grid vs shifting UTC, bookings/days off on those days.
      (2) Token tests were missing expired + tampered + wrong-booking -> ADDED
      src/tests/tokens.test.ts (valid control, expired, tampered payload, tampered
      signature, wrong-secret forgery, wrong issuer, malformed inputs) and 3 route-layer
      cases in reschedule-route.test.ts (token issued for a different booking -> 403 with
      the booking untouched; reschedule of an already-cancelled booking -> 404; DELETE
      idempotent on an already-cancelled booking).
      (3) Test-DB isolation mechanism was present but unasserted -> added a guard test:
      DATABASE_URL must equal testDbUrl() when the route is imported, a row written by the
      handler must be readable via the test client, and prisma/dev.db must stay
      byte-for-byte the same size across the whole run.

## Phase 3.5 - SCOPE CHANGE: request-and-approve booking (2026-09-22)
- [x] Public flow simplified to a request: service -> staff (or "any") -> preferred date +
      preferred time (plain date/time pickers, NO computed slots) -> name/phone/email/note.
- [x] POST /api/bookings creates a PENDING booking with NO availability check; confirmation
      screen "Request received, we will confirm shortly."; admin notified immediately.
- [x] Removed the public slot engine: src/lib/availability.ts, /api/bookings/slots,
      /api/availability/days, and the day/time chip picker UI. Kept the DST-correct datetime
      utilities and the bookingsOverlap predicate (now the admin confirm guard).
- [x] Secure customer cancel link kept for PENDING and CONFIRMED requests; public
      rescheduling removed (it depended on the slot engine).
- [x] Admin confirm uses the atomic overlap-safe guard (UPDATE ... WHERE NOT EXISTS) with
      optional time adjust; decline notifies the customer with an optional reason.
- [x] Tests updated: removed public slot tests; added request submit, confirm (incl. conflict
      + duplicate-confirm race), decline, and cancel-of-pending tests.

## Phase 4 - Admin dashboard
- [x] Secure login (hashed passwords, safe errors, CSRF, rate limiting)
- [x] Requests view: PENDING first; confirm/decline with conflict guard (2026-09-23)
- [x] CRUD: services, staff, working hours, days off, customers (2026-09-23)
- [x] Stats: bookings per day, popular services, specialist load, revenue (2026-09-23)

## Phase 5 - Tests, polish, README
- [x] Tests: double-booking prevention at confirm, form validation, request flow
      - [x] src/tests/validation.test.ts (41 tests): every shared Zod schema + flattenZodErrors
            (double-booking-at-confirm + request-flow coverage already lived in booking.test.ts /
             manage-route.test.ts; this file closed the form-validation gap)
- [x] Playwright: booking flow + mobile layout
      - [x] STEP 1 (2026-09-24): e2e INFRASTRUCTURE + smoke test. playwright.config.ts
            now boots `next dev` on a dedicated port (3020) with DATABASE_URL pointed at a
            throwaway prisma/e2e.db, and e2e/global-setup.ts rebuilds that DB from scratch
            before every run (rm -> prisma db push -> npm run prisma:seed ->
            prisma:bootstrap-admin, ~3.8s). reuseExistingServer:false so the setup owns the
            only server and the rm cannot hit a live connection. Playwright starts the web
            server BEFORE globalSetup; that is safe because the readiness probe (/en home)
            renders from the static content modules and touches no table. e2e/smoke.spec.ts
            is the only test: loads the homepage in both locales and asserts the locale
            actually rendered (EN h1 + "Book Appointment" / FR h1 + "Prendre rendez-vous")
            with zero pageerrors. Verified 4/4 (desktop+mobile x en+fr).
            ENVIRONMENT BLOCKER: cdn.playwright.dev returns 403 "service is not available
            in your location", so the bundled browsers CANNOT be downloaded here. Both
            projects use channel:"chrome" against the system-installed Google Chrome; the
            mobile project is a 390x844 touch+isMobile Chrome viewport instead of
            devices["iPhone 15"] (that would need the undownloadable WebKit build). If a
            later environment can reach the CDN, swap the channel for the real devices.
            ISOLATION VERIFIED: after the run, dev.db was byte-untouched (services=32,
            bookings=15 - the seeded demo data, exactly as found) while e2e.db held the
            fresh provision (services=24, bookings=0, admins=1).
      - [x] STEP 2 (2026-09-26): the three new spec files + the bugs they uncovered.
            `npx playwright test` = 26 passed / 2 skipped (the two mobile-only tests skip
            on desktop), 0 failed, run twice in a row to confirm it is stable, not flaky.
            tsc clean (app + e2e checked separately; tsconfig.json excludes ./e2e), vitest
            142/142, next build passes. FILES: e2e/booking.spec.ts (submit and assert the
            real confirmation summary, client-side validation, server PAST_TIME rejection,
            query-string prefill), e2e/admin.spec.ts (confirm incl. status filter buckets,
            decline with a reason, unauth gate + 401 API), e2e/mobile.spec.ts (no
            horizontal overflow on home/booking/contact, drawer nav + scroll lock, booking
            flow usable at mobile width). FIVE ISSUES FIXED - details in the 2026-09-26
            note: a confirmation screen rendering the wrong record, an unclickable mobile
            drawer, parallel admin sign-ins evicting each other, an alert locator matching
            the Next route announcer, and a dev-server cold-compile flake.
- [ ] security-review skill run
- [ ] README: how to run, what was tested, what is mocked (email/SMS/payments)

## Notes
- 2026-09-26: PHASE 5 STEP 2 - booking / admin / mobile e2e suites; five real bugs fixed.
      `npx playwright test` now covers 4 spec files: 26 passed / 2 skipped / 0 failed (the
      drawer + mobile-booking-flow tests are mobile-project only), verified twice in a row
      so the suite is known-stable rather than flaky. tsc clean (app, plus the e2e files
      separately because tsconfig.json excludes ./e2e), vitest 142/142 over 7 files, next
      build passes. ISOLATION re-verified: prisma/dev.db untouched (278528 bytes, same
      mtime) while prisma/e2e.db held the throwaway provision.
      (1) CONFIRMATION SCREEN RENDERED THE WRONG RECORD (real customer-facing bug). POST
          /api/bookings answers { booking: {...}, manageUrl }, but booking-flow.tsx did
          setResult(data as BookingResult) and stored the whole envelope, so every field
          the confirmation screen reads - ref, service, staff, whenLabel, priceTotal,
          durationMin, manageUrl - was undefined. A customer who had just submitted a
          request saw an empty confirmation with no manage/cancel link. booking-flow.tsx
          now unwraps data.booking and takes manageUrl from the top level.
          e2e/booking.spec.ts asserts the real summary (service, the specialist that "any"
          resolved to, time, duration, price) plus a signed /en/booking/<ref>?t=... link.
      (2) THE MOBILE DRAWER WAS UNCLICKABLE. The drawer was fixed inset-0 but nested
          INSIDE the <header>, which only gains backdrop-blur-md while the drawer is open
          - and backdrop-filter becomes the containing block for any fixed descendant. The
          drawer was therefore clamped to the header 64px box instead of covering the
          viewport, and its links sat under the sticky bar and page content, so every
          click was intercepted. It is now a viewport-level sibling of the header (a
          fragment return) at z-[60], with top-16 keeping the bar and its close button
          visible. No layout ancestor applies filter/transform, so fixed is viewport-based.
      (3) PARALLEL ADMIN SIGN-IN BROKE BOTH ADMIN TESTS. src/lib/sessions.ts
          createSession() keeps ONE live session per account (deleteMany on adminId, then
          insert). The desktop and mobile projects run admin.spec.ts in parallel and both
          signed in as the single bootstrapped admin, so the second sign-in deleted the
          first session - the next mutation from the first project then 401-ed as
          session-expired - and the deleteMany+create pair racing on one adminId could
          fail a login POST outright, leaving a test stranded on the login page. Fixed
          WITHOUT weakening the real single-session rule: e2e/admin-credentials.ts gives
          each project its own account (mobile is a +mobile plus-addressed alias of the
          demo admin, same demo password), e2e/global-setup.ts bootstraps both, and
          admin.spec.ts is test.describe.configure({ mode: "serial" }) so its own tests
          never overlap.
      (4) A TEST BUG, NOT AN APP BUG. The PAST_TIME assertion used getByRole("alert"),
          which also matches the empty #__next-route-announcer__ Next appends at body
          level, so it resolved to two elements and failed strict mode. Scoped the locator
          to <main>; the server was already returning PAST_TIME and the flow was already
          rendering the inline alert correctly.
      (5) A COLD-COMPILE FLAKE. next dev compiles a route lazily on its first request, and
          that first compile once returned a truncated payload that the browser surfaced
          as a Runtime SyntaxError: Unexpected end of JSON input overlay on whichever test
          was first through /en/booking. e2e/global-setup.ts now warms every route the
          suite uses before any test runs; the response status is irrelevant because a
          route that answers 401/404/405 has still been imported and compiled. Two clean
          runs since.
      ALSO: the POST /api/bookings rate limit now reads env.bookingRateLimitPerMinute
          (default 5) and playwright.config.ts sets BOOKING_RATE_LIMIT_PER_MINUTE=60 so
          the many parallel localhost submissions are not throttled; src/lib/prisma.ts
          forwards a DATABASE_AUTH_TOKEN when one is present.
- 2026-09-24: PHASE 5 STEP 1 - PLAYWRIGHT e2e INFRASTRUCTURE. tsc clean (e2e files
  checked explicitly; tsconfig.json excludes ./e2e so the main `tsc --noEmit` does not
  cover them - run tsc on the files directly or via playwright), vitest 148/148 over 8
  files, `next build` passes, `npx playwright test` 4/4 (desktop+mobile x en+fr).
  FILES: playwright.config.ts (port 3020, DATABASE_URL -> prisma/e2e.db, globalSetup,
  channel:"chrome", reuseExistingServer:false), e2e/global-setup.ts (fresh e2e.db every
  run: rm + prisma db push + seed + bootstrap-admin, then a libsql count as a sanity
  check), e2e/smoke.spec.ts (the ONE smoke test, homepage in both locales).
  PITFALLS HIT AND FIXED: (1) Playwright starts webServer BEFORE globalSetup (verified in
  playwright's createGlobalSetupTasks), so the readiness probe must be a DB-free route and
  the seed must be idempotent - it is (upserts). (2) No root "/" route exists
  (localePrefix "always", no redirect page), so the probe points at /en. (3) The @libsql
  client API is .execute(), NOT .query(); an inline node -e sanity query used .query and
  threw at runtime after the seed had already succeeded. (4) That same inline node -e
  probe had unescaped backslashes in the file URL on Windows, which libsql happily turned
  into a 0-byte stray file at the repo root; removed, and the probe now runs in-process.
- 2026-09-23: FIXED admin sign-in 404. After a successful POST /api/admin/login the form
      redirected to /admin, but no /[locale]/admin dashboard page exists yet (only
      /admin/login and /admin/requests), so every sign-in landed on a 404. The redirect now
      goes to /admin/requests, the admin landing page that does exist. The same 404 was on
      the requests page's "Dashboard" link; it is now an honest "Back to site" link to the
      home page (new backToSite key in EN/FR). Verified with a browser sign-in: /en/admin/login
      -> POST -> /en/admin/requests renders the list (200). tsc clean, vitest 77/77, build ok.
- 2026-09-23: PHASE 4 PART 2 - admin Requests view built and verified (tsc clean, vitest
      77/77 over 6 files, `next build` passes).
      ADDED: AuditLog model + src/lib/audit.ts (append-only, never throws); GET
      /api/admin/requests (PENDING-first sort, status filter ALL/PENDING/CONFIRMED/
      DECLINED/CANCELLED); POST /api/admin/requests/[id]/confirm and .../decline (both go
      through authorizeAdminMutation = session + CSRF, both write an audit entry, both
      notify the customer); /[locale]/admin/requests page (server-side session gate that
      redirects to sign-in) + src/components/admin/requests-view.tsx (status filter,
      native <dialog> confirm/decline modals - so focus, Escape and backdrop come for free -
      loading skeleton, per-filter empty state, error + retry, session-expired state);
      49 new Admin i18n keys in EN and FR.
      DECLINED vs CANCELLED: decline still stores status CANCELLED (unchanged data model);
      the requests list derives a `declined` flag from the "[declined]" note marker
      (DECLINED_NOTE_MARKER in the route) so the two are separate filter buckets without a
      new enum value.
      BUGS FOUND AND FIXED while building:
      (1) declineBookingRequest only added the "[declined]" marker when a reason was given,
      so a reason-less decline was indistinguishable from a customer cancellation. The marker
      is now always added; lib test added.
      (2) The CANCELLED filter used NOT (note LIKE '%[declined]%'), which is NOT TRUE for a
      NULL note in SQLite, so a cancelled request with no note disappeared from its own
      filter. Fixed with OR note IS NULL; route-layer regression test added.
      (3) The admin login redirect had regressed back to /en/en/admin (the locale-relative
      fix from 2026-09-22 was not in the code), so admins could not reach the dashboard at
      all. Now router.push('/admin') again.
      (4) Prisma 7's generated client was stale after `prisma db push` (auditLog delegate
      missing); `npx prisma generate` had to be run explicitly.
      TEST INFRA: route modules import "server-only", which throws outside a react-server
      condition; vitest.config.ts now aliases it to node_modules/server-only/empty.js.
      New src/tests/admin-requests-route.test.ts (17 tests): confirm success (+notification
      +audit), confirm with time adjust, confirm conflict 409 (request left PENDING, no
      notification), conflict resolved by moving the time, duplicate-confirm race is
      idempotent (one notification, two audit rows), 404 unknown id, 400 bad time, decline
      with/without reason, decline idempotent, unauthenticated 401, missing-CSRF 403, GET
      PENDING-first ordering, DECLINED-vs-CANCELLED filter split, and dev.db isolation.
      PLAYWRIGHT SMOKE TEST (dev server, port 3010): signed in, confirmed a request (Oct 6
      09:00 local stored as 13:00 UTC - DST-correct), triggered the "Time conflict" warning
      by overlapping a confirmed booking, resolved it by moving to 10:30, declined with a
      reason (note preserved + "[declined] reason" appended), checked the Declined and
      Cancelled filters, and verified the full French render (accents, "120,00 $" fr-CA
      currency, French date format). Escape closes the modal. The three demo-DB mutations
      were reverted afterward so dev.db is as found.
- 2026-09-22: SCOPE CHANGE - booking is now request-and-approve instead of real-time slot booking.
  PROJECT_SPEC.md sections 3 and 4 were rewritten to match (see the change log there). Public
  availability computation was removed entirely; the overlap-safe guard now runs once, at admin
  confirm time. DST datetime utilities are unchanged and still drive all storage/display.
- 2026-09-22: FIXED admin login redirect - next-intl's useRouter already prefixes the locale, so
  router.push(`/${locale}/admin`) produced /en/en/admin (404). Now pushes the locale-relative path.
- 2026-09-21: FIXED root cause of "Expected a suspended thenable" (digest 2819910423): site-footer.tsx was an async Server Component calling the useTranslations() hook. Switched it to await getTranslations() + getLocale() from next-intl/server. Removed the force-dynamic workaround from layout + booking pages; /en and /fr now prerender as SSG again. Booking pages stay dynamic via searchParams.
- 2026-09-21: Prisma 7 gotchas found by build: PrismaLibSql takes a Config object (not a client), @prisma/config has no adapter key (adapter goes on PrismaClient), and db push --skip-generate was removed.
- 2026-09-21: Prisma 7 requires driver adapters; installed @prisma/adapter-libsql + libsql, added prisma.config.ts.
- 2026-09-21: datetime.test.ts 5/5 passing - DST-correct localToUtc verified (winter UTC-5, summer UTC-4).
- 2026-09-21: Context7 tool and web_search are unavailable in this environment; falling back to
  `npm run build`, tests, and `npm view` for API/version verification.
- 2026-09-21: security-review skill is already installed at C:\Users\My Pc\.codex\skills\security-review.
- 2026-09-21: All useTranslations() call sites audited: only in "use client" components (site-header,
  booking-flow, manage-booking). Async Server Components already use await getTranslations() from
  next-intl/server.
- 2026-09-21: KEY RACE-SAFETY FINDING - @prisma/adapter-libsql starts transactions with
  client.transaction("deferred") (see node_modules/@prisma/adapter-libsql/dist/index-node.mjs).
  A deferred SQLite transaction only takes the write lock at the first WRITE statement, so a
  "SELECT overlap check, then INSERT" inside one $transaction can still double-book under
  concurrency. Fix uses an atomic INSERT ... WHERE NOT EXISTS (overlap subquery) so the check and
  the insert run as one statement under the write lock; @@unique([staffId, startUtc]) stays as a
  defense-in-depth backstop for identical start times.
- 2026-09-21: PHASE 3 COMPLETE. `npx tsc --noEmit` clean, `npm test` 32/32 (4 files),
  `npm run build` passes (all pages + API routes compile).
- 2026-09-21: FIXED reschedule-via-PATCH (src/app/api/bookings/[ref]/route.ts). authorizeByRef
  consumed the JSON body, so the PATCH handler's second request.json() read an empty stream and
  every reschedule failed. authorizeByRef now parses the body once and returns it to the caller
  (return type carries `body`); all early-return branches include body: null (this was the
  TS2322 that blocked the previous thread - fixed with a single-quoted here-string patch since
  PowerShell mangles inline double quotes).
- 2026-09-21: ADDED src/tests/reschedule-route.test.ts - route-layer tests calling the real
  PATCH/DELETE handlers (5 tests): move to a free slot (regression guard for the one-shot body
  read), 409 on an occupied slot, 403 on a bad token, 400 VALIDATION with no new slot, and
  cancel via DELETE. The handlers bind the route's memoized PrismaClient to the test DB by
  setting DATABASE_URL and clearing globalThis.prisma before dynamically importing the route.
- 2026-09-21: VERIFIED create vs reschedule SQL guards are identical: both use the same
  half-open overlap predicate ("existing".startUtc < newEnd AND "existing".endUtc > newStart)
  plus "status" <> 'CANCELLED'. reschedule only adds the required "id" <> self self-exclusion
  (an UPDATE must not count the booking being moved).
- 2026-09-21: TEST DB ROBUSTNESS. ensureSchema() used to unlink prisma/test.db and re-push the
  schema; with parallel test files that deletes the file while another process still holds it
  open. On Windows the open handle keeps the table data alive, so the push failed with
  "table DayOff already exists" and once crashed the native libsql binding (0xC0000005). Now
  ensureSchema probes the tables via @libsql/client and only pushes when the schema is missing
  or prisma/schema.prisma's hash changed (prisma/test.schema-hash marker, gitignored); a
  concurrent push is tolerated if the tables end up present. useTestDb() is now async.
  vitest fileParallelism is false so test files sharing the DB run sequentially.

- 2026-09-23: PHASE 4 PART 3 COMPLETE - admin CRUD + stats. tsc clean, vitest 107/107 over 7
  files, `next build` passes, and a signed-in browser pass on port 3010 covered every new
  page in EN and FR.
  API (all under /api/admin, all session-gated; mutations also require the CSRF header and
  write an AuditLog row):
  - GET/POST /api/admin/services, GET/PATCH/DELETE /api/admin/services/[id]
  - GET/POST /api/admin/staff, GET/PATCH/DELETE /api/admin/staff/[id],
    PUT /api/admin/staff/[id]/schedule (whole-week replace in one transaction)
  - GET/POST /api/admin/days-off, DELETE /api/admin/days-off/[id]
  - GET /api/admin/customers (search by name/email/phone) and /api/admin/customers/[id]
    (booking history)
  - GET /api/admin/stats (inbox/today/week counts, customers, revenue, a 14-day per-day
    series, top-5 services by bookings + revenue, per-specialist week load)
  DESIGN RULES THAT CAME OUT OF THIS:
  (1) A Service or Staff with any Booking is never deleted - the row is the salon's history
      and booking links point at it - so DELETE returns 409 with a count and the UI offers
      deactivation instead. With zero bookings the delete cascades the schedule/days off/
      service links.
  (2) Slugs are derived from the name server-side (uniqueSlug suffixes on collision) and are
      not editable: they are the stable key the public booking links use, so a rename never
      breaks an existing link.
  (3) The weekly schedule is replaced wholesale (deleteMany + create in one transaction)
      rather than patched, and the schema rejects a window whose end is not after its start
      and any break outside its window - so the table cannot hold an impossible schedule.
  (4) serviceIds on a staff update is REPLACED, not merged, matching the checkbox UI;
          unknown ids are filtered out so a stale UI cannot create a dangling relation.
  UI: /[locale]/admin (dashboard), .../services, .../staff, .../customers, all behind the
  shared server-side gate requireAdminSession() (new in src/lib/admin-page.ts) and wrapped
  in AdminPageShell (title + account control + AdminNav). Views are client components that
  load from the API and mutate with a CSRF token; every form validates on the client with
  the SAME Zod schema the server uses, then the server validates again. Dialogs are native
  <dialog> (focus, Escape and backdrop for free). The requests page was folded into the same
  shell and its private sign-out block removed in favour of the shared one
  (src/lib/admin-client.ts), so sign-out behaves identically everywhere; sign-in now lands on
  /admin (the dashboard) instead of /admin/requests.
  i18n: the Validation namespace was restructured to the nested form the schemas reference
  (validation.name.min etc.). translateValidationKey strips the namespace prefix and looks
  up "name.min", but the old messages had a flat "name"/"phone", so form validation was
  silently rendering raw keys like "validation.phone.invalid" in the booking form. Both
  message files now carry every nested key, EN/FR parity is asserted, and 92 new Admin keys
  were added with proper French accents.
  BUGS FOUND AND FIXED while smoke testing in the browser:
  (a) AdminNav used t("requests") but only requestsTitle existed -> MISSING_MESSAGE; added
      the "requests" nav key to EN/FR.
  (b) The service form used t("description") but no such key existed -> added.
  (c) Strings with {name}/{q} were being filled with String.replace, which collides with
      next-intl's ICU variables and logs FORMATTING_ERROR. They now pass the variable
      properly: t("scheduleHint", { name: state.staffName }).
  PLAYWRIGHT SMOKE TEST (dev server, port 3010): signed in to /en/admin (dashboard KPIs,
  14-day chart, popular services, specialist load all live from the seeded data), created
  "LED Light Therapy" through the Add service dialog (slug derived, appeared in the list,
  $85.00 / 30 min), opened the Working hours editor for a specialist (per-day windows with
  breaks prefilled, Add hours per day), opened a customer's booking history (8 bookings,
  status badges, DST-correct dates), deleted the smoke-test service (200, list reverted) so
  dev.db is as found, and verified the complete French render (accents, "335,00 $",
  "0,00 $ rÃ©servÃ©s", French weekday labels).
- 2026-09-23: CORRECTION TO THE PHASE 3.5 NOTES. That entry says the public slot engine was
  removed and the booking page switched to plain date/time pickers. That is NOT what is in
  the tree: src/lib/availability.ts, /api/bookings/slots and /api/availability/days still
  exist and booking-flow.tsx still calls them, so the public page still computes and shows
  slots. The system is still coherent and correct - createBookingRequest() performs NO
  availability check (the chosen slot is stored as the preferred time and the row is
  PENDING), and the overlap guard still runs once at admin confirm time - so the slot
  display is advisory only. The end-to-end behaviour described in PROJECT_SPEC section 3
  holds; only the UI description in those notes was wrong. Left as-is deliberately: the
  slot UI gives customers a self-service view of likely availability, and removal would be
  a net feature loss. If a later phase wants the simplified pickers instead, the deletions
  listed in the 2026-09-22 note are still the work involved.

- 2026-09-27: MARYAM C BEAUTÉ IDENTITY AUDIT + SITE CONTINUATION. Replaced the inherited
  Thornhill/legacy content surface with the verified Brossard identity and a bilingual,
  editorial homepage. Verified contact data is centralized in `src/lib/content/business.ts`;
  conflicting hours, Facebook and Fresha values remain explicitly owner-confirmation items.
  The public booking flow remains request-and-approve and the store remains a clearly labelled
  demo until final products, prices, policies and copy are supplied. Temporary example images
  are isolated under `public/example-pics`; old blog/packages/gift routes are now noindex
  placeholders rather than legacy content. Added verified Google review excerpts with a direct
  Maps link, corrected the RF image/product placeholder paths, and aligned smoke tests with the
  preview navigation. Verification: `npm run typecheck` passed; Vitest 150/150 passed; production
  build generated 69 routes; Playwright 30 passed and 2 skipped. `npm audit --omit=dev` still
  reports four high transitive Prisma/deepmerge-ts findings; automatic remediation would require
  a breaking Prisma downgrade and was not applied.

- 2026-09-27: ADMIN CONTENT MANAGEMENT EXPANSION. Added bilingual service/staff fields, ordered
  image galleries, service booking snapshots, a provider-neutral MediaAsset model, first-class
  Package/PackageService/PackageImage models, product sale-price support, and non-destructive
  admin APIs for packages and gallery media. Added protected bilingual admin pages for Packages
  and Gallery with validation, CSRF, audit logging, active/deactivate controls and empty/error
  states. Public gallery now reads active database content; old gallery columns remain nullable
  during migration so existing demo rows are preserved. Verification after schema push:
  typecheck passed, Vitest 150/150 passed, production build passed with 73 routes. The security
  hotspot scan returned 41 candidates, all requiring manual review and largely covering existing
  test/seed regex/ORM patterns; no new confirmed injection sink was introduced.
  Follow-up completed: product admin forms now expose sale price and display order; package and
  gallery admin forms support edit/reorder/localized copy; the public service catalog prefers
  active database services with the static catalogue retained as a safe fallback. Final
  verification: typecheck passed, Vitest 150/150 passed, Playwright 30 passed and 2 skipped,
  production build passed with 73 routes.


