import { useState, type FormEvent } from 'react';
import {
  OrderValidationError,
  type Order,
  type OrderLine,
  type Product,
} from '../domain/order';
interface Props {
  catalog: readonly Product[];
  submitOrder: (lines: readonly OrderLine[]) => Promise<Order>;
  simulateFailure: () => void;
}
const money = (cents: number) =>
  new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'USD' }).format(
    cents / 100,
  );
export function OrderDemo({ catalog, submitOrder, simulateFailure }: Props) {
  const [quantities, setQuantities] = useState<Record<string, string>>({
    notebook: '1',
    pencil: '2',
    ruler: '0',
  });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [failure, setFailure] = useState(false);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    setMessage('');
    const lines = catalog
      .filter(
        (product) =>
          Number(quantities[product.id]) !== 0 || quantities[product.id] === '',
      )
      .map((product) => ({
        productId: product.id,
        quantity: Number(quantities[product.id]),
      }));
    if (failure) {
      simulateFailure();
    }
    try {
      const order = await submitOrder(lines);
      setMessage(
        `Pedido creado por ${money(order.totalCents)}. ${order.lines.length} productos distintos guardados en memoria.`,
      );
    } catch (cause) {
      setError(
        cause instanceof OrderValidationError
          ? cause.message
          : 'No se pudo guardar el pedido. La falla es simulada; puedes volver a intentarlo.',
      );
    } finally {
      setPending(false);
      setFailure(false);
    }
  }
  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="demo-toolbar">
        <span className="pill">Sin backend</span>
        <span className="muted">USD · datos de ejemplo</span>
      </div>
      <div className="product-list">
        {catalog.map((product, index) => (
          <div className="product" key={product.id}>
            <span className="product-number" aria-hidden="true">
              0{index + 1}
            </span>
            <div>
              <strong>{product.name}</strong>
              <span className="product-price">{money(product.priceCents)} / unidad</span>
            </div>
            <label className="quantity">
              <span className="sr-only">Cantidad de {product.name}</span>
              <input
                type="number"
                min="0"
                max="20"
                step="1"
                value={quantities[product.id] ?? '0'}
                onChange={(event) =>
                  setQuantities((current) => ({
                    ...current,
                    [product.id]: event.target.value,
                  }))
                }
              />
            </label>
          </div>
        ))}
      </div>
      <label className="failure-option">
        <input
          type="checkbox"
          checked={failure}
          onChange={(event) => setFailure(event.target.checked)}
        />{' '}
        Simular una falla al guardar
      </label>
      <button className="button" disabled={pending} type="submit">
        {pending ? 'Creando pedido…' : 'Crear pedido'} <span aria-hidden="true">↗</span>
      </button>
      <p className="form-note">
        Cantidad 0 elimina el producto. Las cantidades elegidas deben ser enteros de 1 a
        20. Los pedidos desaparecen al recargar.
      </p>
      <div aria-live="polite" role="status" className={message ? 'notice success' : ''}>
        {message}
      </div>
      {error ? (
        <p role="alert" className="notice error">
          {error}
        </p>
      ) : null}
    </form>
  );
}
