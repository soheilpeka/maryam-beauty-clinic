# Maryam Beauty Clinic - Project Specification

Frozen requirements for a complete, production-quality beauty-salon website with online booking,
modeled on the best salon/booking sites (Fresha, Booksy). Changes and decisions are logged in
PROGRESS.md. After any context compaction, re-read this file and PROGRESS.md first.

## 1. Project
- Salon name: Maryam Beauty Clinic.
- Reference business site: https://www.maryambeautyclinic.ca/ . Read it only to understand services,
  tone, and branding. Write ORIGINAL copy; do not copy its text or images verbatim.
- Languages: English and French with a language switcher (next-intl, /en and /fr routes, hreflang tags).
  Every UI string, email template, and validation message must exist in both languages. No RTL needed.
- Timezone: Quebec / Montreal (America/Toronto). Currency: CAD. Store times in UTC, display in the
  salon timezone.
- All prices, staff, reviews, and gallery content are DEMO placeholders, clearly marked as demo in the
  seed file. Do NOT invent fake customer reviews or fake credentials.
- Fresh empty folder. Choose a boring, well-supported stack (Next.js + TypeScript + Tailwind +
  Prisma/SQLite), state the choice in one line, then proceed.
- Docs: use Context7 for up-to-date docs of any library used. If Context7 or web search is unavailable,
  say so explicitly and rely on `npm run build` and tests to catch API mismatches.

## 2. Public site
- Stunning, modern, elegant design: hero section; services with prices/durations; staff profiles;
  gallery; reviews; FAQ; contact + map placeholder; footer.
- Mobile-first, fast, smooth micro-animations, dark mode, respects reduced motion.
- SEO basics: titles, meta descriptions, Open Graph, sitemap.

## 3. Booking (the core - do this very carefully)
- Flow: choose service(s) -> choose staff (or "any") -> choose date -> choose time slot ->
  enter name/phone/email -> confirmation.
- Available slots computed from working hours, service duration, staff schedule, breaks, and days off.
- SERVER-SIDE prevention of double booking (race-safe: transaction or unique constraint).
- Cancel/reschedule via a secure link; confirmation page and email/SMS stubs (mock provider, easy to swap).
- Clear loading, empty, and error states everywhere.

## 4. Admin dashboard (protected)
- Secure login. Calendar view of bookings; manage services, staff, working hours, days off, customers.
- Approve/cancel bookings; basic stats (bookings per day, popular services).

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
