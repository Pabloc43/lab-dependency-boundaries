import { DiagramEmbed } from './diagrams/DiagramEmbed';
import { EvidenceExplorer } from './evidence/EvidenceExplorer';
import styles from './ArchitectureGuide.module.css';
const base = import.meta.env.BASE_URL;
export function ArchitectureGuide() {
  return (
    <>
      <section className={styles['section']} id="limites">
        <div className={styles['wide-intro']}>
          <span className={styles['section-number']}>02 / LA DECISIÓN</span>
          <h2>El dominio no conoce la interfaz.</h2>
          <p>
            Podemos escribirlo en un README. También podemos comprobar los imports. Aquí
            protegemos ese límite y dejamos la composición de dependencias fuera del
            dominio.
          </p>
        </div>
        <div className={styles['layer-grid']}>
          <article>
            <span className={styles['layer-label']}>DOMINIO</span>
            <h3>Reglas, no pantallas</h3>
            <p>
              Valida cantidades, busca precios y calcula el total en centavos. No importa
              React, repositorios ni notificaciones.
            </p>
          </article>
          <article>
            <span className={styles['layer-label']}>APLICACIÓN</span>
            <h3>Coordinar, no implementar</h3>
            <p>
              El caso de uso depende de un contrato de guardado. Recibe el adaptador por
              parámetro.
            </p>
          </article>
          <article>
            <span className={styles['layer-label']}>ADAPTADORES</span>
            <h3>Detalles reemplazables</h3>
            <p>
              React presenta. El repositorio guarda en memoria. La raíz de composición
              conecta ambos con el caso de uso.
            </p>
          </article>
        </div>
        <DiagramEmbed
          heading="Mapa de dependencias"
          description="El mapa resume las dependencias principales. Las flechas representan imports, no el recorrido de una petición."
          linkLabel="Abrir diagrama interactivo ↗"
          title="Mapa de dependencias"
          src={`${base}diagrams/architecture.html`}
          summary="La interfaz depende de aplicación y dominio; aplicación depende del dominio; infraestructura implementa el puerto de aplicación. El dominio no importa adaptadores. Selecciona un nodo para explorar sus relaciones."
        />
      </section>
      <EvidenceExplorer />
      <section className={styles['section']}>
        <div className={styles['wide-intro']}>
          <span className={styles['section-number']}>04 / DEL COMMIT A LA DEMO</span>
          <h2>Una comprobación que llega al CI.</h2>
          <p>
            Tipos, lint, pruebas y límites arquitectónicos antes del build. La publicación
            en GitHub Pages ocurre solamente después de validar main.
          </p>
        </div>
        <DiagramEmbed
          heading="La ruta de validación"
          description="Los fixtures incorrectos son pruebas negativas controladas. No se mezclan con el código productivo."
          linkLabel="Abrir diagrama del CI ↗"
          title="Ruta de validación del CI"
          src={`${base}diagrams/ci.html`}
          summary="El CI instala con lockfile, valida tipos y lint, ejecuta pruebas y reglas arquitectónicas, construye el sitio y publica solo desde main. Selecciona un paso para explorar sus conexiones."
        />
        <div className={styles['closing-grid']}>
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
        <div className={styles['reproduce']}>
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
    </>
  );
}
