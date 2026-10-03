import createNextIntlPlugin from "next-intl/plugin";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    const headers = [
      // This limits framing, objects, base URLs and form destinations. It is not a
      // script/style CSP; stricter XSS controls need a separate nonce rollout.
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    if (process.env.NODE_ENV === "production") {
      headers.push({ key: "Strict-Transport-Security", value: "max-age=31536000" });
    }
    const privatePaths = [
      "/api/admin/:path*", "/api/bookings/:path*", "/api/store/orders/:path*",
      "/admin/:path*", "/booking/:path*", "/store/order/:path*",
      "/:locale(en|fr)/admin/:path*", "/:locale(en|fr)/booking/:path*",
      "/:locale(en|fr)/store/order/:path*",
      "/media/uploads/:path*",
    ];
    return [
      { source: "/:path*", headers },
      ...privatePaths.map(source => ({ source, headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }] })),
    ];
  },
  async redirects() {
    return [{ source: "/", destination: "/en", permanent: false }];
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
