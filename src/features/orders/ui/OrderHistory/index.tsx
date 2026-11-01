import type { Order } from '../../domain/order';
import type { OrderDemoServices } from '../order-services.types';
import { useOrderHistory } from './useOrderHistory';
import styles from './OrderHistory.module.css';

const money = (cents: number) =>
  new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'USD' }).format(
    cents / 100,
  );

export function OrderHistory({
  services,
  saved,
  onCleared,
}: {
  services: OrderDemoServices;
  saved: Order | null;
  onCleared: () => void;
}) {
  const { orders, pending, error, notice, clear } = useOrderHistory(services, saved);
  return (
    <section className={styles.history} aria-labelledby="order-history-heading">
      <h3 id="order-history-heading">Historial de este navegador</h3>
      <p>
        Más recientes primero. Se conserva al recargar; no se sincroniza con otros
        dispositivos ni pestañas.
      </p>
      {pending ? <p role="status">Leyendo historial…</p> : null}
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
      {!pending && !error && orders.length === 0 ? (
        <p>No hay pedidos guardados.</p>
      ) : null}
      {orders.length ? (
        <ol className={styles.orders}>
          {orders.map((order) => (
            <li key={order.id}>
              <strong>{money(order.totalCents)}</strong>
              <ul>
                {order.lines.map((line) => (
                  <li key={line.productId}>
                    {line.quantity} × {line.name}
                  </li>
                ))}
              </ul>
              <small>ID: {order.id}</small>
            </li>
          ))}
        </ol>
      ) : null}
      <button
        type="button"
        onClick={async () => {
          if (await clear()) {
            onCleared();
          }
        }}
        disabled={pending}
        className={styles.clear}
      >
        Borrar historial de este lab
      </button>
      <p className={styles.note}>
        Borra únicamente la clave de pedidos del lab, también si contiene datos
        incompatibles. Esta acción no se puede deshacer.
      </p>
      <p role="status">{saved ? '' : notice}</p>
    </section>
  );
}
