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
- [ ] CRUD: services, staff, working hours, days off, customers
- [ ] Stats: bookings per day, popular services

## Phase 5 - Tests, polish, README
- [ ] Tests: double-booking prevention at confirm, form validation, request flow
- [ ] Playwright: booking flow + mobile layout
- [ ] security-review skill run
- [ ] README: how to run, what was tested, what is mocked (email/SMS/payments)

## Notes
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
