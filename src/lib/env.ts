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
  get notificationProvider(): "mock" | "console" {
    const v = process.env.NOTIFICATION_PROVIDER;
    return v === "console" ? "console" : "mock";
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
} as const;
