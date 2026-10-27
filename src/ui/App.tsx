import { useEffect, useState } from 'react';
import type { Product } from '../domain/order';
import type { createOrder } from '../application/create-order';
import { OrderDemo } from './OrderDemo';
interface Evidence {
  generatedAt: string;
  results: {
    id: string;
    exitCode: number;
    moduleCount: number;
    violations: { from: string; to: string; rule: string }[];
  }[];
  snippets: Record<string, string>;
}
interface Props {
  catalog: readonly Product[];
  submitOrder: ReturnType<typeof createOrder>;
  simulateFailure: () => void;
}
const base = import.meta.env.BASE_URL;
const repo = 'https://github.com/Pabloc43/lab-dependency-boundaries';
export function App(props: Props) {
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [example, setExample] = useState('domain-to-ui');
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${base}evidence.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Evidence unavailable');
        }
        return response.json() as Promise<Evidence>;
      })
      .then(setEvidence)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setLoadError(true);
        }
      });
    return () => controller.abort();
  }, []);
  const result = evidence?.results.find((item) => item.id === example);
  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <header className="site-header">
        <a className="wordmark" href="#">
          Pabloc43<span> / LABS</span>
        </a>
        <nav aria-label="Principal">
          <a href="#demo">La demo</a>
          <a href="#limites">Los límites</a>
          <a href={repo}>
            Código <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </header>
      <main id="contenido">
        <section className="hero">
          <div className="eyebrow">
            <span className="orange-dot" /> LAB 01 / ARQUITECTURA VERIFICABLE
          </div>
          <h1>
            Las carpetas ordenan.
            <br />
            <em>Los límites se comprueban.</em>
          </h1>
          <div className="hero-bottom">
            <p>
              Una aplicación de pedidos, una decisión de arquitectura y una comprobación
              automática. El análisis de dependencias se ejecuta con{' '}
              <strong>dependency-cruiser</strong>.
            </p>
            <a className="text-link" href="#demo">
              Explorar el laboratorio <span aria-hidden="true">↓</span>
            </a>
          </div>
          <div className="hero-strip">
            <span>React + TypeScript</span>
            <span>Reglas ejecutables</span>
            <span>CI real</span>
            <span>Sin servicios pagos</span>
          </div>
        </section>
        <section className="section demo-section" id="demo">
          <div className="section-intro">
            <span className="section-number">01 / EL CASO</span>
            <h2>
              Un pedido sencillo.
              <br />
              Un límite útil.
            </h2>
            <p>
              El dominio calcula el pedido. El caso de uso coordina su guardado. La
              interfaz recoge cantidades y muestra el resultado.
            </p>
            <p>
              El almacenamiento es un adaptador en memoria. Cambiarlo no debería
              obligarnos a modificar el cálculo ni introducir React en las reglas de
              negocio.
            </p>
            <aside className="margin-note">
              No es una tienda: no hay pagos, inventario ni persistencia. La aplicación
              existe para poner una decisión a prueba.
            </aside>
          </div>
          <div className="demo-card">
            <div className="card-heading">
              <h3>Mesa de pedidos</h3>
              <span aria-hidden="true">↗</span>
            </div>
            <OrderDemo {...props} />
          </div>
        </section>
        <section className="section" id="limites">
          <div className="wide-intro">
            <span className="section-number">02 / LA DECISIÓN</span>
            <h2>El dominio no conoce la interfaz.</h2>
            <p>
              Podemos escribirlo en un README. También podemos comprobar los imports. Aquí
              protegemos ese límite y dejamos la composición de dependencias fuera del
              dominio.
            </p>
          </div>
          <div className="layer-grid">
            <article>
              <span className="layer-label">DOMINIO</span>
              <h3>Reglas, no pantallas</h3>
              <p>
                Valida cantidades, busca precios y calcula el total en centavos. No
                importa React, repositorios ni notificaciones.
              </p>
            </article>
            <article>
              <span className="layer-label">APLICACIÓN</span>
              <h3>Coordinar, no implementar</h3>
              <p>
                El caso de uso depende de un contrato de guardado. Recibe el adaptador por
                parámetro.
              </p>
            </article>
            <article>
              <span className="layer-label">ADAPTADORES</span>
              <h3>Detalles reemplazables</h3>
              <p>
                React presenta. El repositorio guarda en memoria. La raíz de composición
                conecta ambos con el caso de uso.
              </p>
            </article>
          </div>
          <div className="diagram-card">
            <div>
              <h3>Mapa de dependencias</h3>
              <p>
                El mapa resume las dependencias principales. Las flechas representan
                imports, no el recorrido de una petición.
              </p>
              <a
                className="text-link"
                href={`${base}diagrams/architecture.html`}
                target="_blank"
                rel="noreferrer"
              >
                Abrir diagrama interactivo ↗
              </a>
            </div>
            <img
              loading="lazy"
              width="1440"
              height="900"
              alt="Dependencias: interfaz hacia aplicación y dominio; aplicación hacia dominio; infraestructura implementa el puerto de aplicación. El dominio no importa adaptadores."
              src={`${base}diagrams/architecture.png`}
            />
          </div>
        </section>
        <section className="section evidence-section" id="evidencia">
          <div className="wide-intro">
            <span className="section-number">03 / LA COMPROBACIÓN</span>
            <h2>Romperlo también es una prueba.</h2>
            <p>
              La aplicación válida debe pasar. Los ejemplos incorrectos deben fallar por
              la regla y la dependencia esperadas. Un error de configuración no cuenta
              como éxito.
            </p>
          </div>
          <div
            className="example-switch"
            role="group"
            aria-label="Elegir ejemplo de análisis"
          >
            {[
              ['domain-to-ui', 'Import incorrecto'],
              ['cycle', 'Dependencia circular'],
              ['valid', 'Aplicación válida'],
            ].map(([id, label]) => (
              <button
                type="button"
                key={id}
                aria-pressed={example === id}
                onClick={() => setExample(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {loadError ? (
            <p role="alert">
              No fue posible cargar la evidencia. Puedes reproducirla con pnpm
              architecture.
            </p>
          ) : !evidence ? (
            <p role="status">Cargando el informe generado…</p>
          ) : (
            <div className="evidence-grid">
              <div className="code-card">
                <div className="code-label">
                  {example === 'domain-to-ui'
                    ? 'fixtures/domain-to-ui/src/domain/order.ts'
                    : example === 'cycle'
                      ? 'Resultado del análisis del fixture circular'
                      : 'src/application/create-order.ts'}
                </div>
                <pre>
                  <code>
                    {example === 'domain-to-ui'
                      ? evidence.snippets['fixtures/domain-to-ui/src/domain/order.ts']
                      : example === 'valid'
                        ? evidence.snippets['src/application/create-order.ts']
                        : JSON.stringify(result?.violations, null, 2)}
                  </code>
                </pre>
              </div>
              <div className="report-card">
                <span className={`report-label ${example === 'valid' ? 'valid' : ''}`}>
                  {example === 'valid' ? 'SIN INFRACCIONES' : 'INFRACCIÓN ESPERADA'}
                </span>
                <h3>
                  {result?.violations.length ?? 0}{' '}
                  {result?.violations.length === 1 ? 'infracción' : 'infracciones'}
                </h3>
                <p>
                  Exit code: <strong>{result?.exitCode}</strong> · Módulos analizados:{' '}
                  <strong>{result?.moduleCount}</strong>
                </p>
                {result?.violations.map((violation, index) => (
                  <div className="violation" key={`${violation.rule}-${index}`}>
                    <strong>{violation.rule}</strong>
                    <code>
                      {violation.from} → {violation.to}
                    </code>
                  </div>
                ))}
                <p className="small">
                  Informe real generado durante el build. El navegador muestra el
                  resultado; no ejecuta dependency-cruiser ni consulta el estado actual de
                  GitHub Actions.
                </p>
              </div>
            </div>
          )}
          <details className="config-details">
            <summary>Ver la configuración que usa este proyecto</summary>
            <pre>
              <code>{evidence?.snippets['.dependency-cruiser.cjs'] ?? 'Cargando…'}</code>
            </pre>
          </details>
          <p className="evidence-date">
            {evidence
              ? `Evidencia generada: ${new Date(evidence.generatedAt).toLocaleString('es-UY', { timeZone: 'UTC' })} UTC.`
              : ''}{' '}
            <a href={`${base}evidence.json`}>Consultar JSON completo ↗</a>
          </p>
        </section>
        <section className="section">
          <div className="wide-intro">
            <span className="section-number">04 / DEL COMMIT A LA DEMO</span>
            <h2>Una comprobación que llega al CI.</h2>
            <p>
              Tipos, lint, pruebas y límites arquitectónicos antes del build. La
              publicación en GitHub Pages ocurre solamente después de validar main.
            </p>
          </div>
          <div className="diagram-card">
            <div>
              <h3>La ruta de validación</h3>
              <p>
                Los fixtures incorrectos son pruebas negativas controladas. No se mezclan
                con el código productivo.
              </p>
              <a
                className="text-link"
                href={`${base}diagrams/ci.html`}
                target="_blank"
                rel="noreferrer"
              >
                Abrir diagrama del CI ↗
              </a>
            </div>
            <img
              loading="lazy"
              width="1440"
              height="900"
              alt="El CI instala dependencias, valida tipos y lint, ejecuta pruebas y reglas, construye el sitio y lo publica solo desde main."
              src={`${base}diagrams/ci.png`}
            />
          </div>
          <div className="closing-grid">
            <div>
              <h3>Lo que esto sí demuestra</h3>
              <p>
                Una decisión concreta puede convertirse en una regla reproducible y
                verificarse en cada cambio.
              </p>
            </div>
            <div>
              <h3>Lo que no demuestra</h3>
              <p>
                Que esta arquitectura sea universalmente correcta. La herramienta observa
                dependencias estáticas: no sustituye pruebas de comportamiento ni criterio
                de diseño.
              </p>
            </div>
          </div>
          <div className="reproduce">
            <div>
              <h3>Reproducir en tu equipo</h3>
              <p>Node.js 24 · pnpm · sin credenciales</p>
            </div>
            <pre>
              <code>
                pnpm install --frozen-lockfile{'\n'}pnpm check{'\n'}pnpm dev
              </code>
            </pre>
          </div>
        </section>
      </main>
      <footer>
        <a className="wordmark" href="https://github.com/Pabloc43">
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
