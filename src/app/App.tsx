import { ArchitectureGuide } from '../features/architecture-lab/ArchitectureGuide';
import { OrderDemo } from '../features/orders/ui/OrderDemo';
import type { OrderDemoServices } from '../features/orders/ui/useOrderDemo';
import styles from './App.module.css';

const repo = 'https://github.com/Pabloc43/lab-dependency-boundaries';

export function App(orderServices: OrderDemoServices) {
  return (
    <>
      <a className={styles['skip-link']} href="#contenido">
        Saltar al contenido
      </a>
      <header className={styles['site-header']}>
        <a className={styles['wordmark']} href="#">
          Pabloc43<span> / LABS</span>
        </a>
        <nav className={styles.nav} aria-label="Principal">
          <a href="#demo">La demo</a>
          <a href="#limites">Los límites</a>
          <a href={repo}>
            Código <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </header>
      <main className={styles.main} id="contenido">
        <section className={styles['hero']}>
          <div className={styles['eyebrow']}>
            <span className={styles['orange-dot']} /> LAB 01 / ARQUITECTURA VERIFICABLE
          </div>
          <h1>
            Las carpetas ordenan.
            <br />
            <em>Los límites se comprueban.</em>
          </h1>
          <div className={styles['hero-bottom']}>
            <p>
              Una aplicación de pedidos, una decisión de arquitectura y una comprobación
              automática. El análisis de dependencias se ejecuta con{' '}
              <strong>dependency-cruiser</strong>.
            </p>
            <a className={styles['text-link']} href="#demo">
              Explorar el laboratorio <span aria-hidden="true">↓</span>
            </a>
          </div>
          <div className={styles['hero-strip']}>
            <span>React + TypeScript</span>
            <span>Reglas ejecutables</span>
            <span>CI real</span>
            <span>Sin servicios pagos</span>
          </div>
        </section>
        <OrderDemo {...orderServices} />
        <ArchitectureGuide />
      </main>
      <footer className={styles.footer}>
        <a className={styles['wordmark']} href="https://github.com/Pabloc43">
          Pabloc43<span> / LABS</span>
        </a>
        <p>Una prueba de concepto, no un sistema de producción.</p>
        <div>
          <a href={repo}>Repositorio</a>
          <a href={`${repo}/actions`}>Ejecuciones del CI</a>
        </div>
      </footer>
    </>
  );
}
