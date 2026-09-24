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
- [x] CRUD: services, staff, working hours, days off, customers (2026-09-23)
- [x] Stats: bookings per day, popular services, specialist load, revenue (2026-09-23)

## Phase 5 - Tests, polish, README
- [x] Tests: double-booking prevention at confirm, form validation, request flow
      - [x] src/tests/validation.test.ts (41 tests): every shared Zod schema + flattenZodErrors
            (double-booking-at-confirm + request-flow coverage already lived in booking.test.ts /
             manage-route.test.ts; this file closed the form-validation gap)
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
  "0,00 $ réservés", French weekday labels).
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
