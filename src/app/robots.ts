import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://maryamcbeaute.ca";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/en/admin", "/fr/admin", "/en/booking/", "/fr/booking/", "/en/store/order/", "/fr/store/order/", "/en/store/checkout", "/fr/store/checkout", "/en/store/cart", "/fr/store/cart"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
