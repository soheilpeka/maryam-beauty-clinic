# Security review history

Latest implementation and verification: [2026-10-02 to 2026-10-03 security hardening](SECURITY_HARDENING_2026-10-02.md).
Local operations and current checks: [2026-10-03 security operations](SECURITY_OPERATIONS_2026-10-03.md).
The dependency advisories below are historical; the current scoped overrides remove them.

## Continuation security review — 2026-09-30

Scope: this owned Next.js application, its protected CMS, manual booking workflow and store. No deployment or external-account changes were performed.

## Controls inspected and tested

- Admin APIs enforce server-side sessions; mutations validate CSRF tokens and Zod schemas and emit audit records.
- Public booking requests remain PENDING. Confirmation uses the existing atomic conflict guard; service names, price and duration are historical snapshots.
- Store quotes and stock reservations are server-authoritative. Editing products does not rewrite order snapshots. Mock payments are rejected in production; no card details are collected by this application.
- Signed booking/order management links are scoped to their records. Private/admin routes are excluded from indexing.
- Media URLs are validated without outbound fetching. The URL-only adapter does not claim to inspect remote file bytes or offer production filesystem uploads. A storage adapter must verify actual MIME types and size before enabling uploads.
- JSON-LD escapes HTML delimiters. SQL mutation parameters are bound rather than concatenated. Mock notifications no longer log customer data or signed management URLs.

## Remaining dependency advisory

Continuation on 2026-10-01: updated Next.js from 16.3.5 to 16.3.6 to address GHSA-vcvr-r3jv-pc5j. The application does not use `next/og` ImageResponse, but the patched release removes the dependency alert. The final audit has no critical entries. Source: https://github.com/advisories/GHSA-vcvr-r3jv-pc5j.

The installed Prisma dependency graph reports four high-severity npm audit entries, including deepmerge-ts recursive input handling and mysql2 connection/decompression issues. This application uses libSQL rather than mysql2 and does not merge untrusted Prisma configuration. The suggested automatic fix downgrades Prisma across a major-version boundary; it was not applied blindly. These advisories remain tracked and must be reassessed with an upstream-compatible update before deployment. This is not a guarantee that every possible runtime exposure is absent.

## Production gates

Owner-approved content and commercial policies, a verified mail sender, payment provider credentials and hosted checkout/webhook integration, durable production database/storage and deployment-specific rate limiting remain deployment prerequisites. Local mock delivery/payment tests are not real deliveries or charges.
