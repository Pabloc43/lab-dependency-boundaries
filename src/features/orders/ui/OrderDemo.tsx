import type { FormEvent } from 'react';
import { useOrderDemo, type OrderDemoServices } from './useOrderDemo';
import styles from './OrderDemo.module.css';

const money = (cents: number) =>
  new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'USD' }).format(
    cents / 100,
  );

export function OrderDemo(services: OrderDemoServices) {
  const { catalog } = services;
  const {
    quantities,
    changeQuantity,
    pending,
    order,
    error,
    failure,
    setFailure,
    submit,
  } = useOrderDemo(services);
  const message = order
    ? `Pedido creado por ${money(order.totalCents)}. ${order.lines.length} productos distintos guardados en memoria.`
    : '';
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }
  return (
    <section className={[styles['section'], styles['demo-section']].join(' ')} id="demo">
      <div className={styles['section-intro']}>
        <span className={styles['section-number']}>01 / EL CASO</span>
        <h2>
          Un pedido sencillo.
          <br />
          Un límite útil.
        </h2>
        <p>
          El dominio calcula el pedido. El caso de uso coordina su guardado. La interfaz
          recoge cantidades y muestra el resultado.
        </p>
        <p>
          El almacenamiento es un adaptador en memoria. Cambiarlo no debería obligarnos a
          modificar el cálculo ni introducir React en las reglas de negocio.
        </p>
        <aside className={styles['margin-note']}>
          No es una tienda: no hay pagos, inventario ni persistencia. La aplicación existe
          para poner una decisión a prueba.
        </aside>
      </div>
      <div className={styles['demo-card']}>
        <div className={styles['card-heading']}>
          <h3>Mesa de pedidos</h3>
          <span aria-hidden="true">↗</span>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className={styles['demo-toolbar']}>
            <span className={styles['pill']}>Sin backend</span>
            <span className={styles['muted']}>USD · datos de ejemplo</span>
          </div>
          <div>
            {catalog.map((product, index) => (
              <div className={styles['product']} key={product.id}>
                <span className={styles['product-number']} aria-hidden="true">
                  0{index + 1}
                </span>
                <div>
                  <strong>{product.name}</strong>
                  <span className={styles['product-price']}>
                    {money(product.priceCents)} / unidad
                  </span>
                </div>
                <label className={styles['quantity']}>
                  <span className={styles['sr-only']}>Cantidad de {product.name}</span>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="1"
                    value={quantities[product.id] ?? '0'}
                    onChange={(event) => changeQuantity(product.id, event.target.value)}
                  />
                </label>
              </div>
            ))}
          </div>
          <label className={styles['failure-option']}>
            <input
              type="checkbox"
              checked={failure}
              onChange={(event) => setFailure(event.target.checked)}
            />{' '}
            Simular una falla al guardar
          </label>
          <button className={styles['button']} disabled={pending} type="submit">
            {pending ? 'Creando pedido…' : 'Crear pedido'}{' '}
            <span aria-hidden="true">↗</span>
          </button>
          <p className={styles['form-note']}>
            Cantidad 0 elimina el producto. Las cantidades elegidas deben ser enteros de 1
            a 20. Los pedidos desaparecen al recargar.
          </p>
          <div
            aria-live="polite"
            role="status"
            className={message ? [styles.notice, styles.success].join(' ') : ''}
          >
            {message}
          </div>
          {error ? (
            <p role="alert" className={[styles['notice'], styles['error']].join(' ')}>
              {error}
            </p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
