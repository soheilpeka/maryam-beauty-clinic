/**
 * Payment provider abstraction.
 *
 * Payment boundary. Stripe test mode is the default provider selector, but this checkout
 * intentionally has no card form yet: the Stripe hosted Checkout/PaymentIntent flow must be
 * connected with owner credentials before customer payments are enabled. The mock provider is
 * available only for isolated tests and local demo flows; no PAN ever enters this application.
 */
import { env } from "@/lib/env";

export interface PaymentCapture {
  /** Order reference the capture belongs to */
  ref: string;
  /** Total in cents (CAD) */
  amountCents: number;
  /** Customer email, passed for the receipt */
  email: string;
}

export interface PaymentResult {
  ok: boolean;
  /** Gateway reference, stored on nothing for now but kept for the audit trail */
  reference: string;
  /** Human-readable reason when ok is false */
  reason?: string;
}

export interface PaymentProvider {
  authorize(payment: PaymentCapture): Promise<PaymentResult>;
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
 * Configuration-safe Stripe boundary. Keeping this explicit prevents a false impression that
 * a server-side order authorization is a payment integration. A future hosted Checkout adapter
 * can implement the same interface and webhook reconciliation without changing order logic.
 */
export class StripeTestPaymentProvider implements PaymentProvider {
  readonly name = "stripe";

  async authorize(): Promise<PaymentResult> {
    if (!env.stripeSecretKey || !env.stripeSecretKey.startsWith("sk_test_")) {
      throw new PaymentConfigurationError(
        "Stripe test mode is not configured. Add STRIPE_SECRET_KEY=sk_test_... and connect hosted checkout.",
      );
    }
    throw new PaymentConfigurationError(
      "Stripe hosted checkout is not enabled until the owner supplies and verifies the payment flow.",
    );
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
  return env.paymentProvider === "mock" ? new MockPaymentProvider() : new StripeTestPaymentProvider();
}

export const PAYMENT_PROVIDER_NAME = env.paymentProvider;
