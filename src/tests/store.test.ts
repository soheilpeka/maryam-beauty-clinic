import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { cartCount, cartSubtotal, shippingFor, setLineQuantity, addLine } from "@/lib/cart";
import {
  createOrder,
  releaseExpiredReservations,
  StoreError,
  transitionOrderStatus,
} from "@/lib/order";
import type { PaymentProvider } from "@/lib/payment";
import { checkoutSchema, productSchema } from "@/lib/validation";
import { closeTestDb, useTestDb } from "@/tests/db";

const approved: PaymentProvider = {
  async authorize(payment) {
    return { ok: true, reference: `TEST-${payment.ref}` };
  },
};

const declined: PaymentProvider = {
  async authorize() {
    return { ok: false, reference: "TEST-DECLINED", reason: "Test decline" };
  },
};

let prisma: PrismaClient;

async function product(overrides: Partial<{
  slug: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
}> = {}) {
  const slug = overrides.slug ?? "demo-serum";
  return prisma.product.create({
    data: {
      slug,
      sku: overrides.sku ?? `SKU-${slug.toUpperCase()}`,
      name: overrides.name ?? "Demo Serum",
      nameFr: "Sérum démo",
      description: "Demo only",
      descriptionFr: "Démonstration seulement",
      category: "Skincare",
      price: overrides.price ?? 8500,
      stock: overrides.stock ?? 5,
      active: true,
    },
  });
}

function checkout(overrides: Partial<Parameters<typeof createOrder>[1]> = {}) {
  return {
    idempotencyKey: crypto.randomUUID(),
    locale: "en" as const,
    name: "Store Customer",
    email: "store@example.com",
    phone: "+1 514 555 0101",
    address: "123 Test Street",
    city: "Montreal",
    province: "Quebec",
    postalCode: "H2X 1Y4",
    country: "Canada",
    lines: [{ slug: "demo-serum", quantity: 1 }],
    ...overrides,
  };
}

beforeAll(async () => {
  prisma = await useTestDb();
});

beforeEach(async () => {
  await prisma.paymentAttempt.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.storeSetting.deleteMany();
});

afterAll(async () => {
  await closeTestDb();
});

afterEach(() => vi.restoreAllMocks());

describe("store validation and totals", () => {
  it("removes the last unit and keeps added quantities within the allowed range", () => {
    const lines = [{ slug: "a", name: "A", priceCents: 1299, quantity: 1 }];
    expect(setLineQuantity(lines, "a", 0)).toEqual([]);
    expect(setLineQuantity(lines, "a", -1)).toEqual([]);
    expect(setLineQuantity(lines, "a", 200)[0].quantity).toBe(99);
    expect(addLine([], lines[0], 0)[0].quantity).toBe(1);
  });
  it("calculates integer-cent cart totals, counts and shipping boundaries", () => {
    const lines = [
      { slug: "a", name: "A", priceCents: 1299, quantity: 2 },
      { slug: "b", name: "B", priceCents: 501, quantity: 3 },
    ];
    expect(cartCount(lines)).toBe(5);
    expect(cartSubtotal(lines)).toBe(4101);
    expect(shippingFor(14999, { shippingFeeCents: 1500, freeShippingThresholdCents: 15000 })).toBe(1500);
    expect(shippingFor(15000, { shippingFeeCents: 1500, freeShippingThresholdCents: 15000 })).toBe(0);
  });

  it("rejects unknown checkout fields and unsafe product images", () => {
    const parsedCheckout = checkoutSchema.safeParse({
      ...checkout(),
      clientTotal: 1,
    });
    expect(parsedCheckout.success).toBe(false);

    const parsedProduct = productSchema.safeParse({
      sku: "SAFE-001",
      name: "Safe Product",
      nameFr: "Produit sûr",
      price: 1000,
      imageUrl: "javascript:alert(1)",
    });
    expect(parsedProduct.success).toBe(false);
  });
});

describe("order pricing, snapshots and idempotency", () => {
  it("uses database price, shipping and purchase-time snapshots", async () => {
    await product({ price: 8500, stock: 3 });
    const result = await createOrder(prisma, checkout({ lines: [{ slug: "demo-serum", quantity: 2 }] }), {
      paymentProvider: approved,
    });

    expect(result.order.status).toBe("PAID");
    expect(result.order.subtotalCents).toBe(17000);
    expect(result.order.shippingCents).toBe(0);
    expect(result.order.items[0]).toMatchObject({
      name: "Demo Serum",
      sku: "SKU-DEMO-SERUM",
      unitPriceCents: 8500,
      quantity: 2,
      lineTotalCents: 17000,
    });
    expect((await prisma.product.findUniqueOrThrow({ where: { slug: "demo-serum" } })).stock).toBe(1);

    await prisma.product.update({
      where: { slug: "demo-serum" },
      data: { name: "Renamed", price: 9900, active: false },
    });
    const persisted = await prisma.order.findUniqueOrThrow({
      where: { id: result.order.id },
      include: { items: true },
    });
    expect(persisted.items[0].name).toBe("Demo Serum");
    expect(persisted.items[0].unitPriceCents).toBe(8500);
  });

  it("returns the same order for a repeated idempotency key without charging or decrementing twice", async () => {
    await product({ stock: 2 });
    const args = checkout();
    const first = await createOrder(prisma, args, { paymentProvider: approved });
    const second = await createOrder(prisma, args, { paymentProvider: approved });
    expect(second.reused).toBe(true);
    expect(second.order.id).toBe(first.order.id);
    expect(await prisma.order.count()).toBe(1);
    expect((await prisma.product.findUniqueOrThrow({ where: { slug: "demo-serum" } })).stock).toBe(1);
  });

  it("rejects a retry key with changed identity, address, locale, note or cart without leaking an order", async () => {
    await product({ stock: 4 });
    const args = checkout();
    await createOrder(prisma, args, { paymentProvider: approved });
    const changed: Array<Partial<typeof args>> = [
      { email: "other@example.com" }, { name: "Other Guest" }, { phone: "+1 555 9999" },
      { address: "456 Other Street" }, { city: "Other City" }, { province: "Ontario" },
      { postalCode: "K1A 0B1" }, { country: "USA" }, { locale: "fr" }, { note: "different" },
      { lines: [{ slug: "demo-serum", quantity: 2 }] },
    ];
    for (const change of changed) {
      await expect(createOrder(prisma, { ...args, ...change }, { paymentProvider: approved }))
        .rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    }
    expect(await prisma.order.count()).toBe(1);
    expect(await prisma.paymentAttempt.count()).toBe(1);
    expect((await prisma.product.findUniqueOrThrow({ where: { slug: "demo-serum" } })).stock).toBe(3);
  });

  it("accepts an equivalent cart retry with split quantities and empty optional fields", async () => {
    await product({ stock: 4 });
    const args = checkout({ province: undefined, postalCode: undefined, lines: [{ slug: "demo-serum", quantity: 2 }] });
    const first = await createOrder(prisma, args, { paymentProvider: approved });
    const retry = await createOrder(prisma, {
      ...args, province: "", postalCode: "", note: "",
      lines: [{ slug: "demo-serum", quantity: 1 }, { slug: "demo-serum", quantity: 1 }],
    }, { paymentProvider: approved });
    expect(retry.reused).toBe(true);
    expect(retry.order.id).toBe(first.order.id);
  });

  it("also rejects mismatched identity when recovering the winner of a retry race", async () => {
    await product({ stock: 4 });
    const args = checkout();
    await createOrder(prisma, args, { paymentProvider: approved });
    vi.spyOn(prisma.order, "findUnique").mockResolvedValueOnce(null);
    vi.spyOn(prisma, "$transaction").mockRejectedValueOnce(new Error("Simulated concurrent insert"));
    await expect(createOrder(prisma, { ...args, email: "other@example.com" }, { paymentProvider: approved }))
      .rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });

  it("rejects an active demo product before reserving stock or authorizing payment", async () => {
    const p = await product({ stock: 4 });
    await prisma.product.update({ where: { id: p.id }, data: { demo: true } });
    await expect(createOrder(prisma, checkout(), { paymentProvider: approved }))
      .rejects.toMatchObject({ code: "PRODUCT_UNAVAILABLE" });
    expect(await prisma.order.count()).toBe(0);
    expect(await prisma.paymentAttempt.count()).toBe(0);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).stock).toBe(4);
  });
});

describe("race-safe inventory lifecycle", () => {
  it("allows only one concurrent purchase of the final unit", async () => {
    await product({ stock: 1 });
    const settled = await Promise.allSettled([
      createOrder(prisma, checkout({ email: "one@example.com" }), { paymentProvider: approved }),
      createOrder(prisma, checkout({ email: "two@example.com" }), { paymentProvider: approved }),
    ]);
    expect(settled.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = settled.find((result) => result.status === "rejected");
    expect(rejected?.status).toBe("rejected");
    if (rejected?.status === "rejected") {
      expect(rejected.reason).toBeInstanceOf(StoreError);
      expect(rejected.reason.code).toBe("INSUFFICIENT_STOCK");
    }
    expect((await prisma.product.findUniqueOrThrow({ where: { slug: "demo-serum" } })).stock).toBe(0);
  });

  it("releases stock immediately on payment decline", async () => {
    await product({ stock: 1 });
    await expect(createOrder(prisma, checkout(), { paymentProvider: declined })).rejects.toMatchObject({
      code: "PAYMENT_DECLINED",
    });
    const order = await prisma.order.findFirstOrThrow();
    expect(order.status).toBe("PAYMENT_FAILED");
    expect(order.inventoryRestoredAt).not.toBeNull();
    expect((await prisma.product.findUniqueOrThrow({ where: { slug: "demo-serum" } })).stock).toBe(1);
  });

  it("expires abandoned pending reservations and restores stock exactly once", async () => {
    const p = await product({ stock: 0 });
    const order = await prisma.order.create({
      data: {
        ref: "MBC-S-TEST-EXPIRE",
        idempotencyKey: crypto.randomUUID(),
        locale: "en",
        status: "PENDING",
        name: "Expiry Test",
        email: "expiry@example.com",
        phone: "+1 514 555 0101",
        address: "123 Test Street",
        city: "Montreal",
        country: "Canada",
        subtotalCents: 8500,
        shippingCents: 1500,
        totalCents: 10000,
        inventoryReservedAt: new Date("2026-01-01T00:00:00Z"),
        reservationExpiresAt: new Date("2026-01-01T00:15:00Z"),
        items: {
          create: {
            productId: p.id,
            name: p.name,
            slug: p.slug,
            sku: p.sku,
            unitPriceCents: p.price,
            quantity: 1,
            lineTotalCents: p.price,
          },
        },
      },
    });
    expect(await releaseExpiredReservations(prisma, new Date("2026-01-01T00:16:00Z"))).toBe(1);
    expect(await releaseExpiredReservations(prisma, new Date("2026-01-01T00:17:00Z"))).toBe(0);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("EXPIRED");
    expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).stock).toBe(1);
  });

  it("enforces order transitions and restocks cancellation exactly once", async () => {
    await product({ stock: 2 });
    const placed = await createOrder(prisma, checkout(), { paymentProvider: approved });
    const processing = await transitionOrderStatus(prisma, placed.order.id, "PROCESSING");
    expect(processing.status).toBe("PROCESSING");
    const cancelled = await transitionOrderStatus(prisma, placed.order.id, "CANCELLED");
    expect(cancelled.status).toBe("CANCELLED");
    const same = await transitionOrderStatus(prisma, placed.order.id, "CANCELLED");
    expect(same.status).toBe("CANCELLED");
    expect((await prisma.product.findUniqueOrThrow({ where: { slug: "demo-serum" } })).stock).toBe(2);
    await expect(transitionOrderStatus(prisma, placed.order.id, "PAID")).rejects.toMatchObject({
      code: "INVALID_STATUS_TRANSITION",
    });
  });
});
