# Store launch checklist

The store code is prepared for Stripe-hosted Checkout, server-side order totals, Stripe Tax,
verified payment webhooks, expiring inventory reservations, secure guest order links, refunds,
and shipment tracking. Do not accept public orders until every owner action below is complete
and a real end-to-end test has passed. No Stripe or email secrets belong in Git or browser code.

## 1. Approve the actual store

- In Admin → Products, replace every draft/demo item with the exact approved products, SKU,
  description, CAD price, stock count, shipping weight/size if needed, and photos. Demo products
  are deliberately blocked from checkout.
- Decide which regions are served, shipping fees, free-shipping threshold, handling time,
  returns/refunds, privacy/terms, and contact route. Publish owner-approved policies; do not use
  sample prices or invented promises.
- In Admin → Store settings, set the actual CAD shipping fee/threshold and only enable orders
  after all checks pass. The payment reservation window is at least 30 minutes to match Stripe.

## 2. Configure Stripe (Canada)

- Finish Stripe business verification and payout/bank setup. Register the business for the tax
  jurisdictions where it is required to collect tax. This app turns on Stripe Tax at Checkout;
  Stripe must have the correct registrations and tax configuration or checkout must remain off.
- Test first with a Stripe test key in a staging environment. Add these server-only environment
  variables at the host:
  - `PAYMENT_PROVIDER=stripe`
  - `STRIPE_SECRET_KEY=sk_test_...` (staging only; live production needs `sk_live_...`)
  - `STRIPE_WEBHOOK_SECRET=whsec_...`
  - `NEXT_PUBLIC_BASE_URL=https://<the real site domain>`
  - `BOOKING_LINK_SECRET=<unique random secret, 32+ characters>`
- Create a Stripe webhook endpoint at
  `https://<the real site domain>/api/store/stripe/webhook` and subscribe to
  `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and
  `checkout.session.async_payment_failed`, and `checkout.session.expired`. Put that endpoint's signing secret in `STRIPE_WEBHOOK_SECRET`.
  Do not use the signing secret from Stripe CLI as the production endpoint secret.
- Run a low-value test payment through the public site, verify the signature/webhook changes the
  order to Paid, verify the tax and shipping totals/address in Admin → Orders, test cancellation
  and reservation release, then issue and verify an actual test refund. Never use a mock payment
  provider for a public or production store.

## 3. Configure customer email and fulfillment

- If order/tracking emails are wanted, verify the sending domain with Resend and add
  `NOTIFICATION_PROVIDER=resend`, `RESEND_API_KEY=re_...`, and a verified
  `NOTIFICATION_FROM_EMAIL`; set `ADMIN_NOTIFICATION_EMAIL` to the address that should receive
  new paid order alerts. Until configured and tested, no email is sent by the default mock
  notifier; customers can still use the private order link displayed after checkout.
- Fulfillment is manual, not a carrier-label API: buy/prepare the label through the carrier you
  choose, then move the order to Processing and enter carrier, tracking number, and HTTPS
  tracking link before marking it Shipped. The customer can follow the private order link or
  shipment email.
- Back up the production database, apply the updated Prisma schema to the chosen target database
  using `npm run prisma:push` during a controlled release, then deploy. Confirm environment
  variables are set and webhook delivery is healthy before enabling orders.

## 4. Owner's final launch gate

Stripe onboarding and key creation, tax registrations, verified sender domain, actual catalog,
shipping/return/legal policies, production domain and live end-to-end payment/refund tests are
external owner/provider actions. Code alone cannot complete or certify those steps. Enable the
store publicly only after the owner confirms each item.
