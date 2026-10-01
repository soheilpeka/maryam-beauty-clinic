# Maryam C Beauté - Project Specification

Frozen requirements for a complete, production-quality beauty-salon website with online booking,
modeled on contemporary salon/booking experiences. Changes and decisions are logged in
PROGRESS.md. After any context compaction, re-read this file and PROGRESS.md first.

## 1. Project
- Correct business identity: **Maryam C Beauté**, 621 Av. Stravinski, Brossard, QC J4X 1Y7.
- Provisional official source: https://maryamcbeaute.ca/ and the owner-provided Google Maps listing.
  The former Thornhill / Maryam Beauty Clinic identity, contact details, copy, media, service catalog,
  testimonials and SEO are obsolete and must not be published.
- Owner-supplied contact details: (450) 466-3120 and Maryam_champir@yahoo.com. Opening hours are
  centralized in `src/lib/content/business.ts`: Tue 10:00–16:00, Wed 10:00–18:00, Thu–Fri
  10:00–21:00, Sat 10:00–16:00, Sun–Mon closed.
- Owner-approved final copy, photography, catalog/prices, policies and Facebook URL are pending.
  Use restrained, clearly labelled provisional/demo content and never invent claims,
  prices, durations, credentials, policies or customer results.
- Languages: English and French with a language switcher (next-intl, /en and /fr routes, hreflang tags).
  Every UI string, email template, and validation message must exist in both languages. No RTL needed.
- Timezone: Quebec / Montreal (America/Toronto). Currency: CAD. Store times in UTC, display in the
  salon timezone.
- All prices, staff, products and gallery content are DEMO placeholders, clearly marked as demo in the
  seed file and public UI. Reviews may be published only when directly verified from the provided
  Google Maps listing with wording, attribution, rating and relative date preserved.
- Fresh empty folder. Choose a boring, well-supported stack (Next.js + TypeScript + Tailwind +
  Prisma/SQLite), state the choice in one line, then proceed.
- Docs: use Context7 for up-to-date docs of any library used. If Context7 or web search is unavailable,
  say so explicitly and rely on `npm run build` and tests to catch API mismatches.

## 2. Public site
- Stunning, modern, elegant design: hero section; services with prices/durations; staff profiles;
  gallery; reviews; FAQ; contact + map placeholder; footer.
- Mobile-first, fast, smooth micro-animations, dark mode, respects reduced motion.
- SEO basics: titles, meta descriptions, Open Graph, sitemap.
- SEO, LocalBusiness structured data, sitemap and public navigation must use the Brossard identity
  consistently and must not expose legacy Thornhill routes or copy as authoritative business content.

## 3. Booking (the core - do this very carefully)
- SCOPE CHANGE 2026-09-22: the public flow is now a manual REQUEST-AND-APPROVE flow, not
  real-time slot booking. Public visitors request an appointment; the salon approves it.
- Public flow: choose service -> choose staff (or "any") -> choose a PREFERRED date and a
  PREFERRED time (a plain date picker + time picker; available slots are NOT computed for
  the public) -> enter name/phone/email + optional note -> submit.
- On submit: a Booking is created with status PENDING. NO availability check runs at this
  step (the request is just recorded). Show a confirmation screen:
  "Request received, we will confirm shortly." Rate-limit the endpoint.
- The admin is notified immediately through the notification interface (email/SMS, mocked).
- The customer keeps a secure cancel link and can cancel a PENDING or CONFIRMED request.
  (Public rescheduling was removed together with the slot engine; cancel remains.)
- Times are still stored in UTC and shown in the salon timezone using the DST-correct
  datetime utilities.
- Conflict handling moved to admin confirm time: when the salon confirms a request, the
  server re-checks for a conflicting CONFIRMED booking for the same staff using the
  existing overlap-safe atomic guard (so two admins confirming overlapping requests can
  never double-book). The admin may adjust the time before confirming; on a conflict the
  UI warns and lets them pick another time.
- On confirm the customer is notified (email/SMS via the same interface); on decline the
  customer is notified, optionally with a reason.
- Clear loading, empty, and error states everywhere.
- Booking is handled by the internal request-and-approve flow. Do not redirect customers to a
  third-party booking provider or expose an unverified booking URL; any future provider integration
  requires a new owner-approved product decision.

## 4. Admin dashboard (protected)
- Secure login. A "Requests" view lists PENDING bookings first, then CONFIRMED ones, each
  showing service, staff, requested date/time and customer contact info, with distinct
  visual status for PENDING vs CONFIRMED.
- Confirm or decline each request (conflict guard + optional time adjust on confirm).
- Manage services, staff, working hours, days off, customers. Basic stats (bookings per
  day, popular services).
- CONTENT MANAGEMENT EXPANSION 2026-09-27: the protected admin is the authoritative content
  workflow for services, products, packages, team members and gallery/media. Every mutation uses
  server-side session authorization, the session-bound CSRF token, strict Zod validation and an
  AuditLog entry. Content records carry EN/FR fields, active state and display order; public pages
  read active records from the database so owner edits appear without source-code changes.
- Images use a provider-neutral media abstraction. Until an approved storage provider is configured,
  the admin accepts only validated local public paths or HTTPS image URLs; it must not claim that
  filesystem uploads are production-ready. Cloudinary/S3 support belongs behind the same provider
  configuration boundary.
- Services snapshot name, slug, duration and price on each Booking. Products already snapshot name,
  slug, SKU, image and price on OrderItem. Later renames/repricing must never rewrite historical
  bookings or orders. Referenced services/products/staff are deactivated instead of deleted.
- Packages are first-class records with localized content, price, session count, validity, badge,
  images and an explicit many-to-many list of included services. Package content is provisional until
  owner-approved data exists; no final packages or prices may be invented.

### Store and payment boundary
- The public store must show an honest empty state while only demo products exist. Admin-published
  products become public through the same server-authoritative catalog, cart, inventory and order
  path; seeded demo products never appear publicly.
- Payment selection defaults to a configuration-safe Stripe test-mode boundary. No card data is
  collected by this app and no live payment readiness is claimed. The owner must supply a Stripe
  test secret, approve a hosted Checkout/PaymentIntent flow, configure webhook verification and
  complete a test transaction before checkout can open. `PAYMENT_PROVIDER=mock` is reserved for
  isolated local/e2e demonstrations.

## 5. Quality bar
- Accessible HTML (labels, focus, keyboard, contrast); validated forms on client AND server.
- Rate limiting on booking endpoints; hashed passwords; no secrets in code; safe error messages.
- Seed database with realistic demo data (8 services, 4 staff).
- Tests for: slot calculation, double-booking prevention, form validation, booking flow.
- Follow conventions of what is created; keep the code clean and organized.

## 6. How to work
- Phases, each finished fully before the next:
  1. Plan + scaffold + database schema
  2. Public site
  3. Booking engine + flow
  4. Admin dashboard
  5. Tests, polish, README
- Use the tester agent to run tests, the reviewer agent to review the booking logic, and Playwright to
  open the running site and verify the booking flow and mobile layout.
- After phase 5, run the security-review skill.
- At the end: document how to run it, what was tested, and what is mocked (email/SMS/payments).

## 7. Working rules added 2026-09-21
- Keep PROJECT_SPEC.md (this file) as the frozen spec and PROGRESS.md as the phase checklist;
  update PROGRESS.md after each phase.
- Do not pin package versions from memory. Install with `npm install <pkg>@latest` and let
  package-lock.json record them. Re-check TypeScript and Vitest versions with `npm view` before use.
- If Context7 or web search is unavailable, say so explicitly and rely on `npm run build` and tests.

## 8. Environment notes
- Windows, PowerShell 5.1 (no && chaining, no bash heredocs), Node 24, npm 11.
- Sandbox: writes to C:\Users\My Pc and the npm registry require explicit approval.
