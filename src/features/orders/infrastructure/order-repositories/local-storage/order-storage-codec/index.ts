import type { Order, PricedLine } from '../../../../domain/order';

interface OrderDocument {
  version: 1;
  orders: Order[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isSafeNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isQuantity(value: unknown): value is number {
  return isSafeNonNegativeInteger(value) && value >= 1 && value <= 20;
}

function isPricedLine(value: unknown): value is PricedLine {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonEmptyText(value.productId) &&
    isNonEmptyText(value.name) &&
    isQuantity(value.quantity) &&
    isSafeNonNegativeInteger(value.unitPriceCents)
  );
}

function hasUniqueProductIds(lines: readonly PricedLine[]): boolean {
  return new Set(lines.map((line) => line.productId)).size === lines.length;
}

function hasConsistentTotal(order: Order): boolean {
  const calculated = order.lines.reduce(
    (total, line) => total + line.quantity * line.unitPriceCents,
    0,
  );
  return Number.isSafeInteger(calculated) && calculated === order.totalCents;
}

function hasOrderShape(value: unknown): value is Order {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonEmptyText(value.id) &&
    Array.isArray(value.lines) &&
    value.lines.length > 0 &&
    Array.from(value.lines).every(isPricedLine) &&
    isSafeNonNegativeInteger(value.totalCents)
  );
}

export function isStoredOrder(value: unknown): value is Order {
  if (!hasOrderShape(value)) {
    return false;
  }

  return hasUniqueProductIds(value.lines) && hasConsistentTotal(value);
}

function hasDocumentShape(value: unknown): value is OrderDocument {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.version === 1 &&
    Array.isArray(value.orders) &&
    value.orders.every(isStoredOrder)
  );
}

function hasUniqueOrderIds(orders: readonly Order[]): boolean {
  return new Set(orders.map((order) => order.id)).size === orders.length;
}

export function decodeOrderDocument(raw: string): readonly Order[] {
  const document: unknown = JSON.parse(raw);
  if (!hasDocumentShape(document) || !hasUniqueOrderIds(document.orders)) {
    throw new Error('Invalid order document');
  }

  // Validation does not normalize text or discard additional properties.
  return document.orders;
}
