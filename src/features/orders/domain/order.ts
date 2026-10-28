export interface Product {
  readonly id: string;
  readonly name: string;
  readonly priceCents: number;
}

export interface OrderLine {
  readonly productId: string;
  readonly quantity: number;
}

export interface PricedLine extends OrderLine {
  readonly name: string;
  readonly unitPriceCents: number;
}

export interface Order {
  readonly id: string;
  readonly lines: readonly PricedLine[];
  readonly totalCents: number;
}

export class OrderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderValidationError';
  }
}

export function calculateOrder(
  lines: readonly OrderLine[],
  catalog: readonly Product[],
): Omit<Order, 'id'> {
  if (lines.length === 0) {
    throw new OrderValidationError('El pedido debe incluir al menos un producto.');
  }
  const seen = new Set<string>();
  const priced = lines.map(({ productId, quantity }) => {
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 20) {
      throw new OrderValidationError('La cantidad debe ser un entero entre 1 y 20.');
    }
    if (seen.has(productId)) {
      throw new OrderValidationError('Un producto no puede repetirse en el pedido.');
    }
    seen.add(productId);
    const product = catalog.find((item) => item.id === productId);
    if (!product) {
      throw new OrderValidationError('El producto no pertenece al catálogo.');
    }
    if (!Number.isSafeInteger(product.priceCents) || product.priceCents < 0) {
      throw new OrderValidationError('El precio del producto no es válido.');
    }
    return {
      productId,
      quantity,
      name: product.name,
      unitPriceCents: product.priceCents,
    };
  });
  // Keep arithmetic in integer cents; rounding belongs at the input boundary.
  const totalCents = priced.reduce(
    (total, line) => total + line.quantity * line.unitPriceCents,
    0,
  );
  if (!Number.isSafeInteger(totalCents)) {
    throw new OrderValidationError('El total supera el rango permitido.');
  }
  return { lines: priced, totalCents };
}
