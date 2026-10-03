# Security hardening — 2026-10-02 to 2026-10-03

**Follow-up:** the first-pass results below are historical. The owner-authorized local
maintenance and shared production limiter are recorded in
[Security operations — 2026-10-03](SECURITY_OPERATIONS_2026-10-03.md). That follow-up supersedes
the process-local rate-limit and unavailable-lint limitations below. Production hosting
and the remote database have still not been changed or verified.

## Scope and actual architecture

This review inspected and changed the owned repository. It did not probe the live site,
send provider messages, change external accounts, deploy, or modify the owner/production database.
All pre-existing uncommitted UI, package content and documentation changes were preserved.

- Next.js 16.3.6 App Router, React 19, TypeScript and next-intl EN/FR.
- Prisma 7.10.0 with the libSQL adapter; SQLite schema. Runtime accepts a local file or
  remote libSQL URL/token. Production database permissions and hosting settings were not accessed.
- Custom admin authentication: bcrypt cost 12, random session cookies whose SHA-256 hashes
  are stored in AdminSession, seven-day absolute expiry, HttpOnly/SameSite=Lax cookies and
  Secure cookies in production. Admin pages and APIs perform server-side authorization;
  mutations require a session-bound, constant-time checked CSRF token.
- Guest booking/order management uses HMAC-signed, expiring links bound to the specific
  booking/customer or order/email. There is no public customer login or password-reset endpoint.
  Administrator credential reset is the environment-driven bootstrap script.
- Booking requests remain PENDING; administrator confirmation retains the atomic overlap guard.
  Store prices, inventory and order totals remain server-authoritative.
- Media management accepts validated URL references, not binary file uploads. No arbitrary
  outbound image fetch or filesystem upload handler exists. Resend is a fixed-destination
  plain-text HTTP adapter; real delivery was not exercised. Payments retain the incomplete
  Stripe test integration boundary and production rejection of mock payments.
- Hostinger compatibility is documented in PROGRESS.md (Node/webpack/SWC WASM). No deployed
  proxy, CDN, TLS, filesystem, database or account configuration was verified.

## Threat model

| Entry / trust boundary | Sensitive assets | Relevant threats and checked controls |
| --- | --- | --- |
| Anonymous booking/contact forms → server/database/mail | Customer identity, phone, consultation notes | Existing-email overwrite, malformed/large bodies, automated abuse, unsafe logs |
| Signed management links → one record | Appointment history and order shipping details | Forgery, expired/wrong-purpose tokens, cross-record access, cancellation of finalized records |
| Guest checkout/retry key → stock/order/payment adapter | Contact/address data, historical order snapshots, stock | Retry-key disclosure, cross-request reuse, hidden demo items, client price manipulation, races |
| Admin browser → session/CSRF guards → CMS/customer records | All customer records, admin identity, owner content | Timing enumeration, login CSRF, stale credentials, session races, failed logout, missing authorization |
| Deployment environment, logs and dependencies | Signing/database/provider credentials and personal data | Example keys, raw exception data, forged proxy headers, dependency advisories, shared-cache exposure |

No SQL injection, arbitrary server URL fetch, unescaped user HTML, or missing admin route
authorization was confirmed in the reviewed code. Tagged raw SQL remains parameterized;
React renders text with escaping and JSON-LD escapes HTML delimiters. This is a scoped review,
not a claim that every possible vulnerability is absent.

## Confirmed findings and implemented fixes

Locations below identify the affected code; the working files now contain the fixes.

| ID / severity | Evidence before the fix and realistic impact | Fix / affected files |
| --- | --- | --- |
| F01 High | Public booking input selected Customer by unverified email and overwrote name/phone. Anyone knowing an email could alter historical customer contact details. Reusing that Customer in a new management page also serialized stored contact props unnecessarily. | `src/lib/booking.ts` preserves existing Customer; `prisma/schema.prisma` adds per-booking contact snapshots. Admin request views and notifications use snapshots with legacy fallback. `src/app/[locale]/booking/[ref]/page.tsx` and `src/components/booking/manage-booking.tsx` no longer load/pass customer contact props. |
| F02 High, conditional on deployment configuration | `src/lib/env.ts` accepted the publicly documented development signing key in production. A known key permits forged/refreshed guest capabilities when record identifiers are known. The local example configuration used the placeholder; deployed credentials were not inspected. | Production rejects blank, short and recognizable placeholder keys; `.env.example` leaves the key blank. Booking/checkout check the signing configuration before writes. `src/lib/tokens.ts` pins HS256, requires expiry/issued-at/subject/issuer, bounds input and separates purposes while retaining valid legacy links. |
| F03 Medium | `src/lib/order.ts` returned the order for any supplied idempotency UUID without comparing its original request. A disclosed retry key exposed order metadata and could mint a usable status link if its recipient email was also supplied. | Both normal and racing retry paths compare original contact/address/locale/note and normalized cart quantities; mismatch returns generic 409 through `src/app/api/store/orders/route.ts`, without signing a link. |
| F04 Medium | The login dummy bcrypt hash was malformed and returned immediately for unknown accounts, while existing-account failures performed cost-12 work. | Valid synthetic cost-12 dummy hash in `src/app/api/admin/login/route.ts`. No statistical live timing attack was performed. |
| F05 Medium | Login parsed JSON from simple cross-origin request types and lacked Origin/Fetch Metadata checks. A browser could be signed into an attacker's existing admin account. | Login requires JSON Content-Type and rejects mismatched Origin or cross-site Fetch Metadata before credentials/cookies. |
| F06 Medium | Session replacement deleted and inserted in separate writes. Concurrent sign-ins could leave multiple live sessions despite the stated one-session policy. | `src/lib/sessions.ts` replaces sessions in one transaction; concurrent isolated SQLite regression covers this. |
| F07 Medium | Bootstrap reset changed passwordHash without revoking sessions. Also, an old-password login already awaiting bcrypt could create a fresh session after reset revoked existing sessions. | `src/lib/admin-password.ts` atomically updates credentials, revokes sessions and clears failures; bootstrap uses it. Login passes the observed hash; session creation rechecks it after acquiring the transaction write lock and rolls back on change. |
| F08 Medium | `deleteSession` swallowed database errors, and browser logout navigated away regardless of revocation success. A surviving stolen token could remain usable while the UI claimed sign-out. | Idempotent deleteMany propagates failures; logout returns sanitized 500 without clearing the cookie. `src/lib/admin-client.ts`/`admin-account.tsx` preserve state and show an EN/FR retry error. Logout fetches fresh CSRF to recover from another tab replacing the session. |
| F09 Medium | Customer DELETE unconditionally changed every non-CANCELLED booking, including COMPLETED/NO_SHOW, to CANCELLED. | `src/app/api/bookings/[ref]/route.ts` conditionally updates only PENDING/CONFIRMED, returns 409 for finalized records, and sends one notification for concurrent duplicates. UI matches these statuses. |
| F10 Medium | `clientIpFromHeaders` trusted arbitrary X-Forwarded-For/X-Real-IP input. Changing client-supplied values changed abuse budgets; the bucket map retained arbitrary keys indefinitely. | `src/lib/rate-limit.ts` trusts only an explicitly configured proxy-sanitized header, validates IPs, uses the rightmost XFF hop, expires buckets, caps cardinality and refuses new keys rather than evicting active limits. No configuration uses a shared safe budget. Production proxy verification remains required. |
| F11 Low | Login failure upsert replaced windowStart before evaluating expiry, so failures outside the intended 15-minute window were still accumulated; separate updates also permitted counter races. | `src/lib/login-limit.ts` uses a single parameterized SQLite UPSERT preserving fixed windows and live lock deadlines. |
| F12 Low | Checkout/quote accepted active demo products while the public catalog intentionally hid them. | `src/lib/order.ts` rejects demo products at resolution and conditional stock reservation; quote marks them unavailable without hidden details. |
| F13 Low, privacy risk | API/audit handlers logged entire exception objects. Prisma/provider errors can carry parameter-bearing messages, SQL context or personal data. No actual customer leakage was reproduced. | `src/lib/safe-log.ts` retains only a static event and recognized Prisma code; callers no longer emit raw errors. Prisma uses minimal error format. Synthetic error regression proves log redaction. |
| F14 Low, availability risk | Route handlers parsed full JSON bodies before field validation, including chunked requests without declared length. | Shared `src/lib/request-body.ts` limits actual streamed bytes to 64 KiB before JSON decoding; all JSON mutation handlers use it and return generic 400 on invalid/oversized input. Email/phone/login-password limits and bcrypt's 72-byte boundary were added. Hosting must also limit bodies before proxy buffering. |

## Additional improvements

- Server-only module boundaries protect credentials, database access, tokens, notifications
  and booking logic from client imports. Shared date formatting imports only its non-secret timezone.
- `next.config.mjs` adds nosniff, DENY framing, no-referrer (including signed-link queries),
  permissions restrictions and production HSTS. The minimal CSP restricts framing, objects,
  base URLs and form destinations; it is **not** a complete nonce/script XSS policy.
- Admin and guest management paths have private/no-store response policy. Local production
  tests inspect real HTTP responses, including rejected requests and management pages.
- Playwright uses generated synthetic credentials and a unique isolated database. Browser
  requests to external origins and external image-optimizer sources are blocked. Suites are
  serialized because CMS mutations/crawls and single-session accounts share one run database;
  real concurrency assertions remain in the unit tests.

## Dependencies

The original npm audit reported four High entries through Prisma CLI's pinned transitive
`deepmerge-ts@7.1.5` and `mysql2@3.15.3`. No attacker-controlled Prisma config merge or MySQL
connection was found in this libSQL application; runtime exploitability was not established.
Scoped overrides retain Prisma/client/adapter 7.10.0 and use deepmerge-ts 8.0.2/mysql2 3.24.5.

Compatibility is specific to this repository's plain-object Prisma configuration. Actual
config loading, required exports, Prisma validation and client generation were checked.
Upstream changes: [deepmerge 8 release notes](https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0),
[mysql2 authentication change](https://github.com/sidorares/node-mysql2/releases/tag/v3.22.0),
[mysql2 decompression fix](https://github.com/sidorares/node-mysql2/releases/tag/v3.23.1).
`npm install --ignore-scripts` was used; no force upgrade or Prisma major downgrade occurred.
Final audit outcome is recorded below. Future upstream-compatible Prisma updates should
reassess and remove these overrides when possible.

## First-pass verification

Final-version checks completed on 2026-10-03. Logs are in ignored
`artifacts/security-verification/*-final-version.log`; only synthetic test records were used.

| Check | Final outcome |
| --- | --- |
| `npm run typecheck` | Passed, exit 0 |
| `npm run lint` | Failed: existing script invokes removed `next lint`; Next interprets `lint` as a missing project directory. No source lint verdict is available. |
| `npm test -- --run` | Passed, exit 0: 412 tests in 22 files, zero failures (17.22 seconds) |
| `npm run build` | Passed, exit 0: 85 generated pages |
| `npx playwright test` with `E2E_USE_PRODUCTION=1`, `E2E_PORT=3060` | Passed, exit 0: 89 passed, 3 intentional desktop skips of mobile-only tests, zero failures; default one-worker configuration (3.7 minutes) |
| `npm audit --json` | 0 vulnerabilities after scoped overrides |
| `npx prisma validate`, `npx prisma generate --no-hints` | Passed; validation used an unused isolated datasource, with no DB push or data access |
| `git diff --check` | Passed, exit 0; final review preserved pre-existing changes and found no added credentials or weakened authorization checks |

The initial parallel production browser run had four failures from shared admin sessions
and concurrent CMS deactivation during public crawling (82 passed, 3 skips, 3 did not run).
A fresh one-worker repeat passed 89 with 3 intentional desktop skips. The harness now
serializes these shared fixtures. Those earlier results precede the final contact snapshots
and password-reset race fix; only the final-version results above describe the delivered code.

Security regressions cover unauthorized admin handlers/customer records, missing/wrong CSRF,
oversized declared and chunked JSON, expired/tampered/cross-purpose/legacy links, canonical
customer preservation and request snapshots, cancellation races/finalized records, order
retry mismatch/races, hidden demo items, login origin/timing work, bcrypt boundaries,
session replacement/expiry/revocation/reset races, logout failures and log redaction.

## First-pass limits and manual production actions

1. **Medium deployment-dependent abuse limit:** per-IP/form budgets are process-local and
   reset on restart. Multi-instance deployments need a shared edge/Redis rate limit; the
   database-backed per-account login lock is durable. Configure edge budgets for login,
   contact, booking, cancellation, quote and checkout; apply request-size limits there too.
   This repository does not include an approved shared limiter/storage service.
2. **Required schema action:** back up and verify the target database, review the additive
   schema change, then apply the existing controlled `npx prisma db push` workflow and
   `npx prisma generate` before deploying this code. The new Booking fields are nullable
   `customerNameSnapshot`, `customerEmailSnapshot`, `customerPhoneSnapshot`; existing rows
   retain legacy contact fallback. Never force-reset, accept unrelated data loss, or use the
   general seed script to upgrade an owner database. Only isolated test schema was changed here.
3. Set a unique signing key generated from at least 32 cryptographically random bytes in
   the deployment secret store. If the example key was deployed, replace it; previous guest
   links will be invalid and authorized replacement links need a controlled support process.
   Do not print keys or paste them into Git. No production key was changed in this review.
4. Verify HTTPS, correct HTTPS public base URL, production Secure cookies and CDN private
   response behavior. Ensure the deployed proxy preserves Origin/Host for login checks.
   Verify it strips/overwrites the chosen client-IP header before setting
   `TRUSTED_CLIENT_IP_HEADER`. Leaving it unset safely shares budgets across visitors, which
   can throttle legitimate users. Do not trust an arbitrary forwarded header by assumption.
5. Verify least-privilege database tokens, private local DB/backup filesystem permissions,
   encrypted backups/restore process, retention and restricted log access. Redact signed `t`
   query values in host/CDN access logs and monitoring. Application no-referrer/no-store
   headers cannot prevent hosting systems from recording full incoming URLs.
6. Real email delivery, sender DNS/authentication, payment webhooks/live charges, external
   media permissions and deployment configuration remain unverified. URL references do not
   inspect external file bytes, actual MIME or size; binary uploads remain disabled until an
   approved storage adapter provides those controls. Guest emails remain unverified inputs.
7. **Low verification/tooling gap:** source lint could not run because no compatible linter
   is configured. TypeScript/build/tests passed as recorded above; they do not replace
   a lint verdict. A strict nonce/script CSP and further infrastructure review are future
   defense improvements, not confirmed exploitable XSS findings from this pass.

No deployment, live security test, credential reset, production schema operation or external
account change was performed. No claim of complete security is made.
