# Website-wide visual consistency pass

Reference: approved homepage, ivory #f6f4f1, stone #e9e6e2, ink #171615,
light Fraunces display typography, Inter body, generous editorial spacing and hairline rules.

## Initial inventory (2026-10-01)

All entries apply to both `/en` and `/fr`. Preserve APIs, permissions and data.

| Route family | Initial finding | Verification status |
| --- | --- | --- |
| `/`, `/preview` | Approved editorial reference retained | Home screenshots EN/FR desktop/mobile; preview shares the home component |
| `/about` | Open editorial composition, square video frame | EN/FR desktop/mobile screenshots; video playback tested |
| `/book-online` | Unboxed portrait catalog, ruled controls | EN/FR rendered and screenshot checked |
| `/service-page/[slug]` (16) | Stone hero, portrait treatment image, hairline sidebars | All 32 localized routes exercised; RF representative screenshots |
| `/gallery` | Unboxed images with captions below, restrained filters | EN/FR desktop/mobile screenshots |
| `/contact` | Stone heading, square fields, clear validation | EN/FR desktop/mobile normal and validation screenshots |
| `/booking` | Ruled service choices, open workspace, stone summary | EN/FR desktop/mobile; preferred date/time, details, validation and success workflows |
| `/booking/[ref]` | Editorial heading/details and keyboard-operable cancel dialog | Pending, confirmed, declined, cancellation dialog and cancelled screenshots |
| `/store` | Editorial interior hero and unboxed product catalog | Empty owner catalog retained; populated isolated catalog exercised |
| `/store/[slug]` | Shared typography, square gallery/actions | Isolated product detail screenshots; demo records excluded from public detail/related products |
| `/store/cart` | Split image-led empty state; ruled item list and stone totals | EN/FR empty and populated screenshots; quantity/removal and quote-error controls tested |
| `/store/checkout` | Split empty state; open fieldsets and stone summary | EN/FR populated screenshots; native validation and isolated mock order tested |
| `/store/order/[ref]` | Stone confirmation panel, branded invalid/loading states | Signed confirmation and invalid-link screenshots |
| `/pricing-plans/packages` | Shared editorial heading and square panels | EN/FR; isolated published package exercised, no owner package invented |
| `/blog`, `/blog/categories/[slug]`, `/post/[slug]`, `/gift-card` | Intentional unavailable/noindex states and localized 404 retained | EN/FR desktop/mobile screenshots |
| `/admin/login` | Split studio-management introduction/form | EN/FR desktop/mobile; unauthenticated gates tested |
| `/admin`, `/admin/requests` | Editorial heading, practical sidebar and square dashboard | EN/FR desktop/mobile; confirmation/decline workflows and API-error state tested |
| `/admin/services`, `/admin/products`, `/admin/packages`, `/admin/gallery` | Shared paper dialogs, rectangular fields, ruled lists | EN/FR editing screenshots; create/update/publication/deactivation covered by isolated tests |
| `/admin/staff`, `/admin/customers`, `/admin/orders` | Branded list/table surfaces, responsive navigation | EN/FR route screenshots; schedule, history and expanded order details covered |
| Not-found / loading / error | Locale-correct branded 404, client loading states and retry boundary | Invalid URLs rendered in both locales; error boundary compiled, not force-triggered with a real production fault |
| Shared navigation / footer / dialogs | Preserve interactions, consistent gutters/controls and focus | Mobile keyboard menu, desktop treatments dropdown, language menu and Escape checks |

## Verification rules

Screenshots and workflow mutations use isolated E2E data, never the owner preview database.
Record actual routes, states and viewports after inspection; a test pass alone is not visual approval.
Email, payment and storage integrations remain configuration-gated.

## Responsive decisions

- Shared maximum width is 80rem; gutters scale from 1.25rem to 6rem.
- Admin uses a 12rem sidebar above 900px and wrapped navigation below it; content remains `minmax(0, 1fr)`.
- Editorial split empty/login layouts stack below 640px. Treatment portraits become 4:3 on narrow screens rather than consuming most of the viewport.
- Tables retain readable columns inside local horizontal scroll containers; the page itself must not overflow.
- The 320px bilingual regression covers home, booking, service detail, contact, cart, checkout and login. Tablet checks use 768px; desktop uses 1280px and mobile uses 390px.
- A locale-level loading boundary was deliberately not retained: it changed missing-service responses to streamed HTTP 200. Existing component loading states preserve correct 404 semantics.
- Mobile dashboard grids use explicit minmax tracks; the chart has a positioned, keyboard-accessible local scroll region. This confines visually hidden chart labels as well as the bars. Staff action groups can wrap within the card width, including longer French labels.
- Dark mode is retained with neutral ink/ivory and champagne tokens instead of the previous pink/brown theme. Reduced-motion rendering is covered in the browser suite.

## Evidence and limits

`test-results/` contains per-test PNGs for desktop/mobile route families, empty/populated commerce, booking status decisions and admin dialogs. These are local verification artifacts, not production content. A final screenshot index and exact verification totals are recorded below after the final run.

Owner content, final prices/durations, real products/packages, Facebook URL, live email credentials, approved storage and live payment/fulfilment settings remain owner-supplied. Stripe hosted checkout remains intentionally unavailable until its integration is implemented and configured; a passing mock order is not a real payment. Four previously documented high transitive Prisma dependency advisories remain in SECURITY_REVIEW.md.

## Final results and retained screenshots

- `npm run typecheck`: passed, 0 errors.
- `npm test -- --run`: 159 passed, 0 failed, 9 files.
- `npm run build`: passed, Next.js 16.3.6, 83 generated pages.
- `npx playwright test --workers=1`: 46 passed, 2 skipped, 0 failed (48 total). The two skips are mobile-specific tests excluded on the desktop project.
- No reset, commit, push or deployment. All workflow mutations used isolated E2E databases.

58 selected PNGs are retained in `artifacts/visual-review-2026-10-01/`. Prefixes `desktop-` and `mobile-` identify the viewport. Representative filenames:

| Area | Screenshot suffix (both prefixes available) |
| --- | --- |
| About and video | `en-about.png` |
| Service detail | `en-service.png` |
| Booking form / confirmation / management | `en-booking.png`, `booking-confirmation.png`, `booking-management.png` |
| Confirmed / declined / customer cancellation | `customer-confirmed.png`, `customer-declined.png`, `booking-cancelled.png` |
| Store / product / order | `en-store.png`, `product-detail.png`, `order-confirmation.png` |
| Empty commerce | `en-cart-empty.png`, `en-checkout-empty.png` |
| Populated bilingual commerce | `cart-populated.png`, `checkout-populated.png`, `fr-cart-populated.png`, `fr-checkout-populated.png` |
| Contact | `en-contact.png` |
| Admin | `en-admin-dashboard.png`, `en-admin-services-form.png`, `en-admin-staff.png`, `fr-admin-products-form.png` |
| Admin schedule / history / error | `fr-admin-schedule.png`, `fr-admin-customer-history.png`, `fr-admin-server-error.png` |
| Sold-out / loading / dark mode | `en-sold-out-cart.png`, `fr-order-loading.png`, `dark-en-store.png`, `dark-en-admin-login.png` |

Mock sold-out/order fixtures are labelled visual examples and do not represent owner products or real purchases. All remaining route screenshots are available under `test-results/`; only the selected evidence was copied to the retained artifact directory.

The retained directory also includes `overview.png`, a six-panel comparison of the implemented layouts. The restored normal owner preview passed 42 read-only EN/FR route/viewport checks at 320/390/1280px (HTTP 200, no overflow or runtime errors). Final dark sign-in screenshots were recaptured after the contrast correction.
