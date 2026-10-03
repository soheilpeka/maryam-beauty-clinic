# Security operations — 2026-10-03

This owner-authorized follow-up completes repository/local work left by
`SECURITY_HARDENING_2026-10-02.md`. It does not deploy, change production data or external
credentials, send provider messages, or probe the live site. Existing uncommitted work,
including concurrent cart/customer changes, has been preserved.

## Implemented follow-up

| Evidence | Severity and impact | Implementation |
| --- | --- | --- |
| Public/login IP budgets existed only in a process-local Map; restart or another instance reset the allowance. Quote had no budget. | Medium: abusive submissions and expensive login work across instances/restarts. | `src/lib/durable-rate-limit.ts`, `src/lib/rate-limit.ts`, `src/lib/login-limit.ts`, `prisma/schema.prisma`; login, booking, contact, cancellation, quote and checkout routes now consume a shared production budget. |
| Local environment files still contained the weak signing-key placeholder described in F02. | High if deployed without the new production guard; deployed secrets were not inspected. | `scripts/security-maintenance.ts` replaced only weak local keys with distinct values generated from 32 random bytes. Original configuration was encrypted first. Editing local `.env.staging` does not change external host settings. |
| Lint used removed `next lint`. | Low verification gap. | Flat ESLint/Next configuration now runs. TypeScript 6 supplies the API needed by build/lint; explicit native TypeScript 7 remains the typecheck compiler. |

The shared limiter uses a parameterized atomic SQLite UPSERT, individual sliding-window
hits, database clock, HMAC keys and a 10,000-key cap. Expired buckets are pruned; live budgets
are not evicted. Database errors refuse operations with 503 and Retry-After; production
never falls back to memory. Development/unit-test budgets still use memory. Independent
local SQLite clients and the actual local production server were verified; the remote
libSQL service has not been exercised.

## Actual local maintenance

`npm run security:maintain-local` completed successfully against the existing local
database inside `prisma/`. It refuses remote URLs and paths outside that directory.

- Created a consistent SQLite online backup including committed WAL pages;
  `PRAGMA integrity_check` returned `ok` on the copy.
- Encrypted it with authenticated AES-256-GCM; decrypting the saved file reproduced
  exactly the verified snapshot bytes. Temporary plaintext copies were removed.
- Applied only additive security DDL. All three Booking contact columns already existed
  at the successful run, so zero columns were added. The shared budget table/index are ready.
  Existing booking/customer/content records were not rewritten or removed.
- Replaced weak signing keys in `.env` and `.env.staging`. Valid keys are retained on repeat.
  Previously issued local guest links are invalid after rotation. No admin password changed.
- Restricted environment files (including `.env.staging.txt`), database, backup directories
  and decryption key to the Windows owner and SYSTEM. The protected files have inheritance
  disabled and two permission rules. `.private/`, env files and SQLite WAL/SHM are Git-ignored.

Encrypted files are under ignored `.private/backups/`; the protected key is under
`.private/keys/`. Do not publish or attach them to chats. Keep an independently protected
copy of the key separate from backups; losing it prevents recovery. These local files are
not an off-machine or production backup service.

For recovery, use the authenticated `decryptBackup` helper in a restricted local directory
and write to a **new** database filename. Check integrity before pointing a temporary local
instance at that copy. Never overwrite the running database to test recovery. Current
verification proves creation, integrity and authenticated decryption, not a production restore.

## Current verification

Mutation tests used isolated databases/generated synthetic credentials. Browser requests
to external origins were blocked; notification/payment adapters were mocked. Logs are in
ignored `artifacts/security-verification/*-followup.log` and `audit-followup.json`.

| Command | Exact outcome |
| --- | --- |
| `npm run prisma:generate` | Passed, exit 0 |
| `npm run typecheck` | Passed, exit 0; explicit TypeScript 7.0.2 native compiler |
| `npm run lint` | Passed, exit 0: 0 errors, 63 warnings; image/unused-variable/React effect quality advisories remain visible |
| `npm test -- --run` | Passed, exit 0: 428 tests, 25 files, zero failures |
| `npm run build` | Passed, exit 0: 85 generated pages |
| `E2E_USE_PRODUCTION=1 E2E_PORT=3060 npx playwright test` | Passed, exit 0: 99 passed, 3 intentional desktop skips of mobile-only tests, zero failures; 3.8 minutes |
| `npm audit --json` | Passed, exit 0: 0 known advisories across all reported severities |
| `git diff --check` | Passed, exit 0 |

Eight new limiter tests cover independent clients, reconnection, concurrent consumption,
clock skew, expiry, production dispatch/error refusal, key capacity and individual-hit
expiry. Three maintenance tests cover encryption/tampering, selective key replacement and
repeatable additive DDL preserving synthetic rows. Existing authorization/customer isolation,
tokens, sessions, CSRF and race regressions were included in the full suite.

ESLint 9 is retained because this Next/React configuration does not support ESLint 10's peer
contract. Its lifecycle warning remains a maintenance item despite audit reporting no known
advisory. `set-state-in-effect` is a visible warning; runtime security checks were not relaxed.

References: [SQLite backup API](https://sqlite.org/backup.html),
[SQLite UPSERT](https://www.sqlite.org/lang_upsert.html),
[official TypeScript 7/6 side-by-side guidance](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0),
[ESLint lifecycle](https://eslint.org/version-support/).

## Remaining production work and unverified areas

Hostinger hPanel returned a Cloudflare blocked page. The owner has not identified whether
the remote URL in `.env.staging` contains real customer records or only test data; the
filename alone cannot establish that. No remote backup, schema write, credential rotation
or external settings change was attempted.

1. **Required deployment dependency:** identify the deployed DB from the site's actual
   runtime settings. Back it up and verify recovery before applying the three nullable
   Booking contact columns and RateLimitBucket table/index. Review only additive changes;
   never reset/seed an owner DB or accept unrelated data loss. Regenerate Prisma afterward.
   Missing shared-budget storage intentionally produces 503.
2. **Production key:** set a strong unique key in the actual host secret store. Editing
   local `.env.staging` does not apply it there. Rotation invalidates guest links and needs
   a controlled replacement-link process. Deployed key strength is unknown.
3. **Proxy/availability:** verify HTTPS/base URL, Secure cookies, Origin/Host handling,
   private cache, proxy body-size limits and a client-IP header the proxy overwrites. Only
   then set TRUSTED_CLIENT_IP_HEADER. Unset headers safely share one budget across visitors
   and may throttle legitimate users; unsanitized trusted headers reopen bypasses.
4. **Privacy/operations:** verify least-privilege DB tokens, encrypted off-machine backups,
   retention, restricted access and restore procedures. Redact signed `t` query parameters
   from host/CDN logs; no-referrer headers cannot prevent the receiving host from logging URLs.
5. Real mail/sender authentication, live payments/webhooks, external image bytes and media
   permissions remain unverified. Binary upload stays disabled. The partial Stripe integration
   remains a launch limitation. No third-party test messages or charges were sent.
6. **Low tooling maintenance:** address lint quality warnings and upgrade ESLint when the
   framework configuration supports its next major. The minimal CSP still lacks a nonce-based
   script policy; no exploitable XSS was confirmed.

No new confirmed exploitable application defect is being left unfixed by this follow-up.
Unknown infrastructure/provider behavior has not been certified secure. No deployment,
commit, push, live security scan or production configuration change occurred.
