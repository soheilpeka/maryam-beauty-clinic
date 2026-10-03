# Final local QA and content release — 2026-10-03

The working tree was clean at the start, at commit 1a2348a. Existing code, records and the protected request-and-approve flow were retained. No admin password or credential was changed or printed.

## Confirmed defects and corrections

| Defect | Evidence | Correction |
| --- | --- | --- |
| Broken local styling, including the sign-in page | Existing port 3050 HTML referenced a CSS file returning 404; all 162 viewport checks showed unstyled overflow. | Isolated `.next-preview` build/serve command, restarted preview; static asset failures included in QA. A concurrent ordinary build and browser tests no longer invalidate this preview. |
| Login server/network failures reported as wrong credentials | Client mapped HTTP 503, parse failures and network errors to `invalidCredentials`. | Localized temporary-unavailability message. Actual 401 retains the generic credentials error. EN/FR desktop/mobile tests cover server and network failures. |
| Online gallery server failure | Remote schema inspection found no ComparisonItem table; public gallery reads it directly. | Explicit additive, validated table/index upgrade after a verified encrypted snapshot. Imported 18 approved source comparisons. |
| Empty online packages and old gallery content | Remote active Package count was 0; GalleryItem count was 4. | Imported the five approved programs and upgraded nine untouched gallery entries using idempotent existing content rules. Saved edits/inactive records take precedence. |

After the remote operation, all generated Prisma model columns exist. Active content counts: Package 5, ComparisonItem 18, GalleryItem 9. The English public gallery and package pages displayed their expected content through the ordinary browser. No synthetic records were inserted into the live database as tests.

## Verification

| Check | Final result |
| --- | --- |
| `npm test -- --run` | Exit 0: 453 tests, 30 files. Final focused content-maintenance check also passed after extending only its remote transaction timeout. |
| Full production Playwright suite, isolated DB/port 3060 | Exit 0: 117 passed, 3 intentional desktop skips, zero failed; 4.2 minutes. Includes booking/manage/cancel, admin authorization/content, packages/gallery/comparisons, customer/team/store and binary uploads, EN/FR and desktop/mobile. |
| `node scripts/qa-preview.mjs http://localhost:3050` | Exit 0: 162 combinations, widths 320/390/1280, zero reported page/runtime/image/static-asset/overflow problems. Owner DB read-only. |
| `npm run build` | Exit 0: compiled/typechecked, 86 pages. |
| `npm run preview` | Separate production build passed, served current owner preview at port 3050. |
| `npm run typecheck` | Exit 0. |
| `npm run lint` | Exit 0: 0 errors, 63 existing warnings. |
| `npm audit --omit=dev --json` | Exit 0: zero reported vulnerabilities. Development dependency advisories documented in the previous upload entry are not a runtime audit result. |
| `git diff --check` | Passed. |
| Local owner login diagnostic | HTTP 200 for login, dashboard, gallery/packages and their APIs with the issued cookie; credentials suppressed. |
| Remote maintenance | Exit 0 after encrypted snapshot, authenticated decryption and isolated restore integrity succeeded. Explicit endpoint fingerprint matched the previously verified host target. |

Initial new sign-in error tests failed because their broad alert selector also matched Next's route announcer. Scoping to the form fixed that test ambiguity: four focused checks and the final complete suite passed. No security control was weakened.

Logs and local screenshots are in ignored `artifacts/qa-final-*` and `artifacts/qa-preview-2026-10-03/`. Backups and their keys remain private/ignored; do not publish them.

## Practical limits

This verifies the tested behavior, not the absence of every possible bug. Real email delivery/inbox placement, provider logs/proxy settings and payment transactions were not tested by the local mock integrations. Online payment remains deliberately unavailable until its production integration is complete. This release does not connect the main WordPress domain or alter that old site. The release must be confirmed against its matching commit in Hostinger before reporting deployment complete.
