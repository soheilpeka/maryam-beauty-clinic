import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  bookingFindUnique: vi.fn(), productsFindMany: vi.fn(), createOrder: vi.fn(),
  verifyBookingToken: vi.fn(), signOrderToken: vi.fn(),
  getStoreSettings: vi.fn(), releaseExpiredReservations: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: {
  booking: { findUnique: mocks.bookingFindUnique }, product: { findMany: mocks.productsFindMany },
} }));
vi.mock("@/lib/order", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/order")>();
  return { ...actual, createOrder: mocks.createOrder, getStoreSettings: mocks.getStoreSettings,
    releaseExpiredReservations: mocks.releaseExpiredReservations };
});
vi.mock("@/lib/tokens", () => ({ verifyBookingToken: mocks.verifyBookingToken, signOrderToken: mocks.signOrderToken }));
vi.mock("next-intl/server", () => ({ setRequestLocale: vi.fn(), getTranslations: vi.fn() }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key, useLocale: () => "en" }));

import ManageBookingPage from "@/app/[locale]/booking/[ref]/page";
import { ManageBooking } from "@/components/booking/manage-booking";
import { POST as checkout } from "@/app/api/store/orders/route";
import { POST as quote } from "@/app/api/store/cart/quote/route";
import { StoreError } from "@/lib/order";
import { resetRateLimiter } from "@/lib/rate-limit";

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimiter();
  mocks.getStoreSettings.mockResolvedValue({ enabled: true, shippingFeeCents: 1500, freeShippingThresholdCents: 15000 });
  mocks.releaseExpiredReservations.mockResolvedValue(0);
});

describe("public response privacy", () => {
  it("does not load or serialize canonical customer contact into booking client props", async () => {
    mocks.verifyBookingToken.mockResolvedValue({ sub: "booking-fixture", cust: "customer-fixture" });
    mocks.bookingFindUnique.mockResolvedValue({
      id: "booking-fixture", customerId: "customer-fixture", ref: "MBC-FIXTURE",
      status: "PENDING", startUtc: new Date("2030-01-01T15:00:00Z"), endUtc: new Date("2030-01-01T16:00:00Z"),
      service: { name: "Fixture Service", duration: 60 }, staff: { name: "Fixture Staff" },
      customer: { name: "Private Stored Name", email: "private@example.test", phone: "+1 555 0123", notes: "Private note" },
      customerNameSnapshot: "Private Submitted Name", customerEmailSnapshot: "submitted@example.test", customerPhoneSnapshot: "+1 555 9999",
    });
    const element = await ManageBookingPage({
      params: Promise.resolve({ locale: "en", ref: "MBC-FIXTURE" }), searchParams: Promise.resolve({ t: "fixture-token" }),
    });
    expect(mocks.bookingFindUnique).toHaveBeenCalledWith({ where: { ref: "MBC-FIXTURE" }, include: { service: true, staff: true } });
    const clientBooking = element.props.children.props.booking;
    for (const field of ["customerName", "customerEmail", "customerPhone"]) expect(clientBooking).not.toHaveProperty(field);
    expect(JSON.stringify(clientBooking)).not.toContain("Private");
    expect(JSON.stringify(clientBooking)).not.toContain("private@example.test");
    expect(JSON.stringify(clientBooking)).not.toContain("submitted@example.test");
  });

  it.each(["COMPLETED", "NO_SHOW"])("hides customer cancellation controls for %s", (status) => {
    const markup = renderToStaticMarkup(createElement(ManageBooking, {
      locale: "en", token: "fixture-token", booking: {
        ref: "MBC-FIXTURE", status, startUtc: "2030-01-01T15:00:00Z", endUtc: "2030-01-01T16:00:00Z",
        serviceName: "Fixture Service", staffName: "Fixture Staff", durationMin: 60,
      },
    }));
    expect(markup).not.toContain("cancel-request-title");
    expect(markup).not.toContain("confirmCancel");
  });

  it("returns a generic 409 for a mismatched checkout retry without minting a link or exposing order metadata", async () => {
    mocks.createOrder.mockRejectedValue(new StoreError("IDEMPOTENCY_CONFLICT", "Sensitive internal fixture detail"));
    const res = await checkout(new NextRequest("http://localhost:3000/api/store/orders", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        idempotencyKey: "a82d3446-1d61-48eb-928a-bff9c7c74c64", locale: "en", name: "Fixture Guest",
        email: "fixture@example.test", phone: "+1 555 0100", address: "123 Fixture Street", city: "Montreal", postalCode: "H2X 1Y4", country: "Canada",
        lines: [{ slug: "fixture-serum", quantity: 1 }],
      }),
    }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "IDEMPOTENCY_CONFLICT", message: "We could not place your order. Please check your details and try again.",
    });
    expect(mocks.signOrderToken).not.toHaveBeenCalled();
  });

  it("quotes an active demo product as unavailable without exposing hidden details", async () => {
    mocks.productsFindMany.mockResolvedValue([{ slug: "hidden-fixture", active: true, demo: true, stock: 10, price: 8500, name: "Hidden Fixture" }]);
    const res = await quote(new NextRequest("http://localhost:3000/api/store/cart/quote", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale: "en", lines: [{ slug: "hidden-fixture", quantity: 1 }] }),
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lines).toEqual([{ slug: "hidden-fixture", quantity: 1, available: false }]);
    expect(body.subtotalCents).toBe(0);
    expect(JSON.stringify(body)).not.toContain("Hidden Fixture");
  });
});
