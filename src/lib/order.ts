/**
 * Server-authoritative order, payment and inventory lifecycle.
 *
 * State machine:
 * PENDING (stock reserved, expires) -> PAID (reservation committed) -> PROCESSING ->
 * SHIPPED -> DELIVERED. A declined/error payment becomes PAYMENT_FAILED and releases the
 * reservation immediately. A stale PENDING order becomes EXPIRED and releases it. A paid
 * order may be CANCELLED or REFUNDED; either restores committed stock exactly once.
 *
 * SQLite/libSQL safety: each line uses one conditional UPDATE (stock >= quantity). All
 * line updates and the order snapshot are in one transaction, so a failed line rolls the
 * whole reservation back and concurrent buyers cannot both take the final unit.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import type {
  Order,
  OrderItem,
  OrderStatus,
  PaymentAttempt,
  Prisma,
  PrismaClient,
  StoreSetting,
} from "@prisma/client";
import { cartSubtotal, shippingFor } from "@/lib/cart";
import {
  getPaymentProvider,
  PAYMENT_PROVIDER_NAME,
  PaymentConfigurationError,
  type PaymentProvider,
} from "@/lib/payment";

export interface CheckoutLineInput {
  slug: string;
  quantity: number;
}

export interface CheckoutResult {
  order: OrderWithRelations;
  paymentReference: string | null;
  reused: boolean;
}

export class StoreError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "StoreError";
  }
}

export async function getStoreSettings(prisma: PrismaClient): Promise<StoreSetting> {
  return prisma.storeSetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      shippingFeeCents: 1500,
      freeShippingThresholdCents: 15000,
      enabled: true,
      reservationMinutes: 15,
    },
  });
}

function generateOrderRef(now = new Date()): string {
  const ymd = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  return `MBC-S-${ymd}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

const ORDER_INCLUDE = {
  items: true,
  paymentAttempts: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.OrderInclude;

type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

function canonicalLines(lines: CheckoutLineInput[]): string {
  const quantities = new Map<string, number>();
  for (const line of lines) quantities.set(line.slug, (quantities.get(line.slug) ?? 0) + line.quantity);
  return JSON.stringify([...quantities].sort(([a], [b]) => a.localeCompare(b)));
}

/** A retry key identifies one checkout attempt, never permission to read a different order. */
function assertMatchingCheckout(order: OrderWithRelations, args: Parameters<typeof createOrder>[1]): void {
  const matches = order.locale === args.locale && order.name === args.name &&
    order.email === args.email && order.phone === args.phone && order.address === args.address &&
    order.city === args.city && order.province === (args.province || null) &&
    order.postalCode === (args.postalCode || null) && order.country === args.country &&
    order.note === (args.note || null) && canonicalLines(order.items) === canonicalLines(args.lines);
  if (!matches) {
    throw new StoreError("IDEMPOTENCY_CONFLICT", "We could not place your order. Please try again.");
  }
}

/**
 * Releases a reservation or committed stock exactly once and changes status atomically.
 * The conditional order update is the ownership flag: only the caller that sets
 * inventoryRestoredAt from null performs product increments.
 */
export async function restoreInventory(
  prisma: PrismaClient,
  orderId: string,
  nextStatus: Extract<OrderStatus, "PAYMENT_FAILED" | "EXPIRED" | "CANCELLED" | "REFUNDED">,
): Promise<OrderWithRelations> {
  return prisma.$transaction(async (tx) => {
    const claim = await tx.order.updateMany({
      where: {
        id: orderId,
        inventoryReservedAt: { not: null },
        inventoryRestoredAt: null,
      },
      data: { inventoryRestoredAt: new Date(), status: nextStatus },
    });

    if (claim.count === 1) {
      const items = await tx.orderItem.findMany({ where: { orderId } });
      for (const item of items) {
        if (item.productId) {
          await tx.product.updateMany({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
    } else {
      const current = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
      if (current.status !== nextStatus) {
        throw new StoreError("INVALID_STATUS_TRANSITION", "This order changed before the update completed.");
      }
    }

    return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: ORDER_INCLUDE });
  });
}

const ALLOWED_ADMIN_TRANSITIONS: Record<string, readonly OrderStatus[]> = {
  PENDING: ["CANCELLED"],
  PAID: ["PROCESSING", "CANCELLED", "REFUNDED"],
  PROCESSING: ["SHIPPED", "CANCELLED", "REFUNDED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  PAYMENT_FAILED: [],
  EXPIRED: [],
  REFUNDED: [],
};

export async function transitionOrderStatus(
  prisma: PrismaClient,
  orderId: string,
  nextStatus: OrderStatus,
): Promise<OrderWithRelations> {
  const current = await prisma.order.findUnique({ where: { id: orderId }, include: ORDER_INCLUDE });
  if (!current) throw new StoreError("NOT_FOUND", "Order not found.");
  if (current.status === nextStatus) return current;
  if (!(ALLOWED_ADMIN_TRANSITIONS[current.status] ?? []).includes(nextStatus)) {
    throw new StoreError(
      "INVALID_STATUS_TRANSITION",
      `Order cannot move from ${current.status} to ${nextStatus}.`,
    );
  }
  if (nextStatus === "CANCELLED" || nextStatus === "REFUNDED") {
    return restoreInventory(prisma, orderId, nextStatus);
  }
  return prisma.order.update({
    where: { id: orderId, status: current.status },
    data: { status: nextStatus },
    include: ORDER_INCLUDE,
  });
}

/** Release expired PENDING reservations opportunistically before catalog/checkout reads. */
export async function releaseExpiredReservations(
  prisma: PrismaClient,
  now = new Date(),
): Promise<number> {
  const expired = await prisma.order.findMany({
    where: {
      status: "PENDING",
      reservationExpiresAt: { lte: now },
      inventoryRestoredAt: null,
    },
    select: { id: true },
  });
  for (const order of expired) {
    await restoreInventory(prisma, order.id, "EXPIRED");
  }
  return expired.length;
}

export async function createOrder(
  prisma: PrismaClient,
  args: {
    idempotencyKey: string;
    locale: "en" | "fr";
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    province?: string;
    postalCode?: string;
    country: string;
    note?: string;
    lines: CheckoutLineInput[];
  },
  dependencies: { paymentProvider?: PaymentProvider; now?: Date } = {},
): Promise<CheckoutResult> {
  await releaseExpiredReservations(prisma, dependencies.now);

  const prior = await prisma.order.findUnique({
    where: { idempotencyKey: args.idempotencyKey },
    include: ORDER_INCLUDE,
  });
  if (prior) {
    assertMatchingCheckout(prior, args);
    return {
      order: prior,
      paymentReference: prior.paymentAttempts.find((p) => p.status === "APPROVED")?.reference ?? null,
      reused: true,
    };
  }

  const settings = await getStoreSettings(prisma);
  if (!settings.enabled) {
    throw new StoreError("STORE_CLOSED", "The store is temporarily closed for orders.");
  }

  const wanted = new Map<string, number>();
  for (const line of args.lines) {
    wanted.set(line.slug, (wanted.get(line.slug) ?? 0) + line.quantity);
  }
  const products = await prisma.product.findMany({
    where: { slug: { in: [...wanted.keys()] } },
  });
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  const resolved = [...wanted].map(([slug, quantity]) => {
    const product = bySlug.get(slug);
    if (!product || !product.active || product.demo) {
      throw new StoreError("PRODUCT_UNAVAILABLE", "A product in your cart is no longer available.");
    }
    return { product, quantity };
  });

  const subtotalCents = cartSubtotal(
    resolved.map(({ product, quantity }) => ({ priceCents: product.salePrice ?? product.price, quantity })),
  );
  const shippingCents = shippingFor(subtotalCents, settings);
  const now = dependencies.now ?? new Date();
  const reservationExpiresAt = new Date(now.getTime() + settings.reservationMinutes * 60_000);

  let order: OrderWithRelations;
  try {
    order = await prisma.$transaction(async (tx) => {
      for (const { product, quantity } of resolved) {
        const reserved = await tx.product.updateMany({
          where: { id: product.id, active: true, demo: false, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } },
        });
        if (reserved.count !== 1) {
          throw new StoreError("INSUFFICIENT_STOCK", `Not enough ${product.name} in stock.`);
        }
      }

      return tx.order.create({
        data: {
          ref: generateOrderRef(now),
          idempotencyKey: args.idempotencyKey,
          locale: args.locale,
          status: "PENDING",
          name: args.name,
          email: args.email,
          phone: args.phone,
          address: args.address,
          city: args.city,
          province: args.province || null,
          postalCode: args.postalCode || null,
          country: args.country,
          note: args.note || null,
          subtotalCents,
          shippingCents,
          totalCents: subtotalCents + shippingCents,
          reservationExpiresAt,
          inventoryReservedAt: now,
          items: {
            create: resolved.map(({ product, quantity }) => ({
              productId: product.id,
              name: args.locale === "fr" ? (product.nameFr ?? product.name) : product.name,
              slug: product.slug,
              sku: product.sku,
              imageUrl: product.imageUrl,
              unitPriceCents: product.salePrice ?? product.price,
              quantity,
              lineTotalCents: (product.salePrice ?? product.price) * quantity,
            })),
          },
        },
        include: ORDER_INCLUDE,
      });
    });
  } catch (error) {
    if (error instanceof StoreError) throw error;
    // A racing request with the same idempotency key returns the winner.
    const winner = await prisma.order.findUnique({
      where: { idempotencyKey: args.idempotencyKey },
      include: ORDER_INCLUDE,
    });
    if (winner) {
      assertMatchingCheckout(winner, args);
      return { order: winner, paymentReference: null, reused: true };
    }
    throw error;
  }

  let provider: PaymentProvider;
  try {
    provider = dependencies.paymentProvider ?? getPaymentProvider();
  } catch (error) {
    await restoreInventory(prisma, order.id, "PAYMENT_FAILED");
    if (error instanceof PaymentConfigurationError) {
      // Do not reflect provider/configuration details to a guest checkout response.
      throw new StoreError("PAYMENT_NOT_CONFIGURED", "Checkout is temporarily unavailable.");
    }
    throw error;
  }

  try {
    const result = await provider.authorize({
      ref: order.ref,
      amountCents: order.totalCents,
      email: order.email,
    });
    await prisma.paymentAttempt.create({
      data: {
        orderId: order.id,
        provider: PAYMENT_PROVIDER_NAME,
        status: result.ok ? "APPROVED" : "DECLINED",
        reference: result.reference || null,
        amountCents: order.totalCents,
        message: result.ok ? null : result.reason?.slice(0, 240) || "Payment declined",
      },
    });

    if (!result.ok) {
      await restoreInventory(prisma, order.id, "PAYMENT_FAILED");
      throw new StoreError("PAYMENT_DECLINED", "Payment was declined. No stock was held.");
    }

    order = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        inventoryCommittedAt: new Date(),
        reservationExpiresAt: null,
      },
      include: ORDER_INCLUDE,
    });
    return { order, paymentReference: result.reference, reused: false };
  } catch (error) {
    if (error instanceof StoreError) throw error;
    if (error instanceof PaymentConfigurationError) {
      await restoreInventory(prisma, order.id, "PAYMENT_FAILED");
      throw new StoreError("PAYMENT_NOT_CONFIGURED", "Checkout is temporarily unavailable.");
    }
    await prisma.paymentAttempt.create({
      data: {
        orderId: order.id,
        provider: PAYMENT_PROVIDER_NAME,
        status: "ERROR",
        amountCents: order.totalCents,
        message: "Payment provider error",
      },
    }).catch(() => {});
    await restoreInventory(prisma, order.id, "PAYMENT_FAILED");
    throw new StoreError("PAYMENT_FAILED", "Payment could not be completed. No stock was held.");
  }
}
