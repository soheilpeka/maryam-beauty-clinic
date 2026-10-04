/**
 * Response shapers for the store API, mirroring src/lib/admin-views.ts: one place that
 * defines what each payload looks like so GET/POST/PATCH return the same shape and the
 * client can update a single row in place instead of reloading the whole list.
 */
import type { Product, ProductImage, Order, OrderItem, PaymentAttempt, Prisma } from "@prisma/client";

export interface ProductImageView {
  id: string;
  url: string;
  altEn: string;
  altFr: string;
  order: number;
}

export interface ProductView {
  id: string;
  slug: string;
  sku: string;
  name: string;
  nameFr: string;
  description: string | null;
  descriptionFr: string | null;
  price: number;
  compareAtPrice: number | null;
  salePrice: number | null;
  category: string;
  imageUrl: string | null;
  stock: number;
  active: boolean;
  featured: boolean;
  demo: boolean;
  order: number;
  orderCount: number;
  images: ProductImageView[];
}

type ProductWithCount = Product & {
  _count?: { orderItems: number };
  images?: ProductImage[];
};

export function shapeProduct(p: ProductWithCount): ProductView {
  return {
    id: p.id,
    slug: p.slug,
    sku: p.sku ?? p.slug.toUpperCase(),
    name: p.name,
    nameFr: p.nameFr ?? p.name,
    description: p.description,
    descriptionFr: p.descriptionFr,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    salePrice: p.salePrice,
    category: p.category,
    imageUrl: p.imageUrl,
    stock: p.stock,
    active: p.active,
    featured: p.featured,
    demo: p.demo,
    order: p.order,
    orderCount: p._count?.orderItems ?? 0,
    images: [...(p.images ?? [])]
      .sort((a, b) => a.order - b.order)
      .map(({ id, url, altEn, altFr, order }) => ({ id, url, altEn, altFr, order })),
  };
}

export function localizeProduct(product: ProductView, locale: string): ProductView {
  if (locale !== "fr") return product;
  return {
    ...product,
    name: product.nameFr,
    description: product.descriptionFr,
  };
}

export interface OrderItemView {
  id: string;
  productId: string | null;
  slug: string;
  sku: string | null;
  name: string;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

export interface OrderView {
  id: string;
  ref: string;
  status: string;
  locale: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string | null;
  postalCode: string | null;
  country: string;
  note: string | null;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  shippingCarrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  createdAt: string;
  updatedAt: string;
  reservationExpiresAt: string | null;
  inventoryRestoredAt: string | null;
  items: OrderItemView[];
  payments: Array<{
    provider: string;
    status: string;
    reference: string | null;
    amountCents: number;
    createdAt: string;
  }>;
}

type OrderWithItems = Order & { items: OrderItem[]; paymentAttempts?: PaymentAttempt[] };

export function shapeOrder(o: OrderWithItems): OrderView {
  return {
    id: o.id,
    ref: o.ref,
    status: o.status,
    locale: o.locale,
    name: o.name,
    email: o.email,
    phone: o.phone,
    address: o.address,
    city: o.city,
    province: o.province,
    postalCode: o.postalCode,
    country: o.country,
    note: o.note,
    subtotalCents: o.subtotalCents,
    shippingCents: o.shippingCents,
    taxCents: o.taxCents,
    totalCents: o.totalCents,
    shippingCarrier: o.shippingCarrier,
    trackingNumber: o.trackingNumber,
    trackingUrl: o.trackingUrl,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    reservationExpiresAt: o.reservationExpiresAt?.toISOString() ?? null,
    inventoryRestoredAt: o.inventoryRestoredAt?.toISOString() ?? null,
    items: [...o.items]
      .sort((a, b) => a.slug.localeCompare(b.slug))
      .map((i) => ({
        id: i.id,
        productId: i.productId,
        slug: i.slug,
        sku: i.sku,
        name: i.name,
        imageUrl: i.imageUrl,
        unitPriceCents: i.unitPriceCents,
        quantity: i.quantity,
        lineTotalCents: i.lineTotalCents,
      })),
    payments: [...(o.paymentAttempts ?? [])].map((payment) => ({
      provider: payment.provider,
      status: payment.status,
      reference: payment.reference,
      amountCents: payment.amountCents,
      createdAt: payment.createdAt.toISOString(),
    })),
  };
}

export type PublicOrderView = Omit<OrderView, "id" | "items" | "payments" | "inventoryRestoredAt"> & {
  items: Array<Omit<OrderItemView, "id" | "productId">>;
};

export function shapePublicOrder(order: OrderWithItems): PublicOrderView {
  const shaped = shapeOrder(order);
  return {
    ref: shaped.ref,
    status: shaped.status,
    locale: shaped.locale,
    name: shaped.name,
    email: shaped.email,
    phone: shaped.phone,
    address: shaped.address,
    city: shaped.city,
    province: shaped.province,
    postalCode: shaped.postalCode,
    country: shaped.country,
    note: shaped.note,
    subtotalCents: shaped.subtotalCents,
    shippingCents: shaped.shippingCents,
    taxCents: shaped.taxCents,
    totalCents: shaped.totalCents,
    shippingCarrier: shaped.shippingCarrier,
    trackingNumber: shaped.trackingNumber,
    trackingUrl: shaped.trackingUrl,
    createdAt: shaped.createdAt,
    updatedAt: shaped.updatedAt,
    reservationExpiresAt: shaped.reservationExpiresAt,
    items: shaped.items.map(({ id: _id, productId: _productId, ...item }) => item),
  };
}

/** Prisma include object for an order with its lines (kept here so list and detail agree). */
export const ORDER_INCLUDE = {
  items: true,
  paymentAttempts: { orderBy: { createdAt: "desc" } },
} satisfies Prisma.OrderInclude;

export const PRODUCT_SELECT = {
  id: true,
  slug: true,
  sku: true,
  name: true,
  nameFr: true,
  description: true,
  descriptionFr: true,
  price: true,
  compareAtPrice: true,
  salePrice: true,
  category: true,
  imageUrl: true,
  stock: true,
  active: true,
  featured: true,
  demo: true,
  order: true,
  images: { orderBy: { order: "asc" } },
} satisfies Prisma.ProductSelect;
