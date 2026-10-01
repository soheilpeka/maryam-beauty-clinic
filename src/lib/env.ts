// Central place for environment variables. Fails loudly on missing required values in prod.

export const env = {
  get databaseUrl(): string {
    const v = process.env.DATABASE_URL;
    if (!v) throw new Error("DATABASE_URL is not set");
    return v;
  },
  get salonTimezone(): string {
    return process.env.SALON_TIMEZONE ?? "America/Toronto";
  },
  get baseUrl(): string {
    return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  },
  /** Secret used to sign manage/cancel links. Must be set in production. */
  get bookingLinkSecret(): string {
    const v = process.env.BOOKING_LINK_SECRET;
    if (!v) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("BOOKING_LINK_SECRET is not set");
      }
      return "dev-only-change-me-in-production";
    }
    return v;
  },
  get notificationProvider(): "mock" | "console" | "resend" {
    const v = process.env.NOTIFICATION_PROVIDER;
    if (v === "resend") return "resend";
    return v === "console" ? "console" : "mock";
  },
  get notificationAdminEmail(): string {
    return process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || "Maryam_champir@yahoo.com";
  },
  get resendApiKey(): string {
    return process.env.RESEND_API_KEY?.trim() || "";
  },
  get notificationFromEmail(): string {
    return process.env.NOTIFICATION_FROM_EMAIL?.trim() || "";
  },
  /** Payment gateway selector. Stripe test mode is the safe default; mock is test-only. */
  get paymentProvider(): "stripe" | "mock" {
    return process.env.PAYMENT_PROVIDER === "mock" ? "mock" : "stripe";
  },
  get stripeSecretKey(): string {
    return process.env.STRIPE_SECRET_KEY?.trim() || "";
  },
  get stripeWebhookSecret(): string {
    return process.env.STRIPE_WEBHOOK_SECRET?.trim() || "";
  },
  /**
   * Per-IP limit on store checkouts per 60s. The e2e suite raises it via
   * STORE_RATE_LIMIT_PER_MINUTE so parallel checkouts from one localhost IP are not
   * throttled, exactly like the booking limiter.
   */
  get storeRateLimitPerMinute(): number {
    const parsed = Number(process.env.STORE_RATE_LIMIT_PER_MINUTE);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
  },
  /** Name of the admin session cookie. */
  get sessionCookieName(): string {
    return process.env.ADMIN_SESSION_COOKIE ?? "mbc_admin_session";
  },
  /**
   * Initial admin account for the bootstrap script (prisma/bootstrap-admin.ts). There is no
   * default password anywhere in the codebase; the script refuses to run without these.
   */
  get adminInitialEmail(): string {
    const v = process.env.ADMIN_INITIAL_EMAIL;
    if (!v) throw new Error("ADMIN_INITIAL_EMAIL is not set (needed to create the first admin)");
    return v.trim().toLowerCase();
  },
  get adminInitialPassword(): string {
    const v = process.env.ADMIN_INITIAL_PASSWORD;
    if (!v) throw new Error("ADMIN_INITIAL_PASSWORD is not set (needed to create the first admin)");
    return v;
  },
  /**
   * Per-IP limit on booking submissions per 60s. The default is a tight anti-abuse budget;
   * the parallel e2e suite raises it via BOOKING_RATE_LIMIT_PER_MINUTE so its many
   * submissions from one localhost IP are not throttled.
   */
  get bookingRateLimitPerMinute(): number {
    const parsed = Number(process.env.BOOKING_RATE_LIMIT_PER_MINUTE);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
  },
} as const;
