# Maryam Beauty Clinic - Progress

Legend: [ ] pending, [~] in progress, [x] done. Update after every phase.

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

## Phase 3 - Booking engine + flow
- [ ] Slot calculation from working hours / duration / breaks / days off (tested)
- [ ] Race-safe booking creation (transaction + unique constraint)
- [ ] Booking flow UI with loading / empty / error states
- [ ] Cancel/reschedule via secure signed link + confirmation page
- [ ] Mock email/SMS provider (swappable) + rate limiting

## Phase 4 - Admin dashboard
- [ ] Secure login (hashed passwords, safe errors)
- [ ] Calendar view of bookings; approve/cancel
- [ ] CRUD: services, staff, working hours, days off, customers
- [ ] Stats: bookings per day, popular services

## Phase 5 - Tests, polish, README
- [ ] Tests: slot calculation, double-booking prevention, form validation, booking flow
- [ ] Playwright: booking flow + mobile layout
- [ ] security-review skill run
- [ ] README: how to run, what was tested, what is mocked (email/SMS/payments)

## Notes
- 2026-09-21: next-intl 4 + React 19 prerender throws 'Expected a suspended thenable' under static export; layout uses force-dynamic (correct for a DB-driven booking site).
- 2026-09-21: Prisma 7 gotchas found by build: PrismaLibSql takes a Config object (not a client), @prisma/config has no dapter key (adapter goes on PrismaClient), and db push --skip-generate was removed.
- 2026-09-21: Prisma 7 requires driver adapters; installed @prisma/adapter-libsql + libsql, added prisma.config.ts.
- 2026-09-21: datetime.test.ts 5/5 passing - DST-correct localToUtc verified (winter UTC-5, summer UTC-4).
- 2026-09-21: Context7 tool and web_search are unavailable in this environment; falling back to
  `npm run build`, tests, and `npm view` for API/version verification.
- 2026-09-21: security-review skill is already installed at C:\Users\My Pc\.codex\skills\security-review.
