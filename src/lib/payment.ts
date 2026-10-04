/**
 * Payment provider abstraction.
 *
 * Payment boundary. Stripe test mode is the default provider selector, but this checkout
 * intentionally has no card form yet: the Stripe hosted Checkout/PaymentIntent flow must be
 * connected with owner credentials before customer payments are enabled. The mock provider is
 * available only for isolated tests and local demo flows; no PAN ever enters this application.
 */
import { env } from "@/lib/env";
import Stripe from "stripe";

export interface PaymentCapture {
  /** Order reference the capture belongs to */
  ref: string;
  /** Total in cents (CAD) */
  amountCents: number;
  /** Customer email, passed for the receipt */
  email: string;
  locale: "en" | "fr";
  orderId: string;
  orderToken: string;
  items: Array<{ name: string; quantity: number; unitAmountCents: number }>;
  shippingCents: number;
  expiresAt: Date;
}

export interface PaymentResult {
  ok: boolean;
  /** Gateway reference, stored on nothing for now but kept for the audit trail */
  reference: string;
  /** Human-readable reason when ok is false */
  reason?: string;
  checkoutUrl?: string;
  pending?: boolean;
}

export interface PaymentProvider {
  authorize(payment: PaymentCapture): Promise<PaymentResult>;
  resume?(reference: string): Promise<string | null>;
  refund?(paymentIntentId: string, orderId: string): Promise<void>;
  cancel?(reference: string): Promise<void>;
}

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  async authorize(payment: PaymentCapture): Promise<PaymentResult> {
    // Development/test simulation only. It never receives card data and always approves.
    const reference = `MOCK-${payment.ref}-${Date.now().toString(36).toUpperCase()}`;
    return { ok: true, reference };
  }
}

/**
 * Stripe hosted Checkout adapter. The browser never receives the secret key or card data.
 */
export class StripeCheckoutPaymentProvider implements PaymentProvider {
  readonly name = "stripe";
  private readonly stripe: Stripe;

  constructor() {
    if (!env.stripeSecretKey) {
      throw new PaymentConfigurationError(
        "Stripe is not configured. Add STRIPE_SECRET_KEY.",
      );
    }
    if (!env.stripeWebhookSecret) {
      throw new PaymentConfigurationError("Stripe webhook signing secret is not configured.");
    }
    if (process.env.NODE_ENV === "production" && !env.stripeSecretKey.startsWith("sk_live_")) {
      throw new PaymentConfigurationError("Production requires a live Stripe secret key.");
    }
    if (process.env.NODE_ENV === "production" && !env.baseUrl.startsWith("https://")) {
      throw new PaymentConfigurationError("Production checkout requires the public HTTPS site URL.");
    }
    this.stripe = new Stripe(env.stripeSecretKey);
  }

  async authorize(payment: PaymentCapture): Promise<PaymentResult> {
    const locale = payment.locale === "fr" ? "fr-CA" : "en-CA";
    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        ...payment.items.map((item) => ({
          quantity: item.quantity,
          price_data: { currency: "cad", unit_amount: item.unitAmountCents, product_data: { name: item.name } },
        })),
      ],
      shipping_options: [{
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: payment.shippingCents, currency: "cad" },
          display_name: payment.locale === "fr" ? "Livraison" : "Shipping",
        },
      }],
      customer_email: payment.email,
      automatic_tax: { enabled: true },
      shipping_address_collection: { allowed_countries: ["CA"] },
      locale,
      expires_at: Math.floor(payment.expiresAt.getTime() / 1000),
      metadata: { orderId: payment.orderId, orderRef: payment.ref },
      success_url: `${env.baseUrl}/${payment.locale}/store/order/${encodeURIComponent(payment.ref)}?t=${encodeURIComponent(payment.orderToken)}&checkout=success`,
      cancel_url: `${env.baseUrl}/${payment.locale}/store/order/${encodeURIComponent(payment.ref)}?t=${encodeURIComponent(payment.orderToken)}&checkout=cancelled`,
    }, { idempotencyKey: `checkout-${payment.orderId}` });
    if (!session.url) throw new PaymentConfigurationError("Stripe did not return a Checkout URL.");
    return { ok: true, pending: true, reference: session.id, checkoutUrl: session.url };
  }

  async resume(reference: string): Promise<string | null> {
    const session = await this.stripe.checkout.sessions.retrieve(reference);
    return session.status === "open" ? session.url : null;
  }

  async cancel(reference: string): Promise<void> {
    const session = await this.stripe.checkout.sessions.retrieve(reference);
    if (session.status === "open") await this.stripe.checkout.sessions.expire(reference);
  }

  async refund(paymentIntentId: string, orderId: string): Promise<void> {
    await this.stripe.refunds.create({ payment_intent: paymentIntentId }, { idempotencyKey: `refund-${orderId}` });
  }
}

export function assertPaymentProviderSafe(): void {
  if (
    process.env.NODE_ENV === "production" &&
    env.paymentProvider === "mock"
  ) {
    throw new PaymentConfigurationError(
      "Production checkout is disabled until a real payment provider is configured.",
    );
  }
}

export class PaymentConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentConfigurationError";
  }
}

export function getPaymentProvider(): PaymentProvider {
  assertPaymentProviderSafe();
  return env.paymentProvider === "mock" ? new MockPaymentProvider() : new StripeCheckoutPaymentProvider();
}

export const PAYMENT_PROVIDER_NAME = env.paymentProvider;
