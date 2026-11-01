import { CodeBlock } from '../code/CodeBlock';
import type { Evidence } from './evidence.types';
import styles from './PersistenceWalkthrough.module.css';

function Excerpt({ evidence, id }: { evidence: Evidence; id: string }) {
  const excerpt = evidence.walkthrough?.find((item) => item.id === id);
  if (!excerpt) {
    return <p>Fragmento no incluido en esta versión de la evidencia.</p>;
  }
  return (
    <div className={styles.excerpt}>
      <p className={styles.location}>
        {excerpt.path} · L{excerpt.startLine}:C{excerpt.startColumn}–L{excerpt.endLine}:C
        {excerpt.endColumn}
      </p>
      <CodeBlock
        label={`Recorrido real: ${id}`}
        source={excerpt.source}
        code={excerpt.code}
      />
    </div>
  );
}

export function PersistenceWalkthrough({ evidence }: { evidence: Evidence }) {
  if (!evidence.walkthrough?.length) {
    return (
      <section
        className={styles.walkthrough}
        aria-labelledby="persistence-walkthrough-heading"
      >
        <h4 id="persistence-walkthrough-heading">Del arranque al guardado</h4>
        <p>
          Esta versión de la evidencia no incluye el recorrido del código. Los ejemplos
          anteriores siguen disponibles.
        </p>
      </section>
    );
  }
  return (
    <section
      className={styles.walkthrough}
      aria-labelledby="persistence-walkthrough-heading"
    >
      <h4 id="persistence-walkthrough-heading">Del arranque al guardado</h4>
      <p>
        <code>buildApp()</code> se ejecuta al cargar la aplicación. Devuelve servicios, no
        componentes. Lo que recibe <code>App</code> son esos servicios como props: no se
        pasa la función <code>buildApp</code>.
      </p>
      <Excerpt evidence={evidence} id="bootstrap" />
      <p>
        <code>App</code> los reenvía a <code>OrderDemo</code>:
      </p>
      <Excerpt evidence={evidence} id="app-props" />
      <details className={styles.details}>
        <summary>Ver cómo se ensamblan y ejecutan los servicios</summary>
        <h5>1. Ensamblado al arrancar</h5>
        <p>
          Dentro de <code>buildApp</code> se construye el adaptador y se llama a la
          fábrica <code>createOrder</code>. Esa llamada prepara la operación: todavía no
          crea ni guarda un pedido.
        </p>
        <Excerpt evidence={evidence} id="repository" />
        <Excerpt evidence={evidence} id="factory" />
        <p>
          El servicio devuelto reenvía las líneas a esa operación. Su <code>finally</code>{' '}
          limpia la simulación pendiente incluso si la validación rechaza el pedido.
        </p>
        <Excerpt evidence={evidence} id="service" />
        <h5>2. Ejecución al enviar el formulario</h5>
        <ol className={styles.steps}>
          <li>
            <p>
              <code>OrderDemo</code> entrega los servicios a su hook. El formulario usa{' '}
              <code>handleSubmit</code>, que evita la navegación y llama a{' '}
              <code>submit</code>.
            </p>
            <Excerpt evidence={evidence} id="hook" />
            <Excerpt evidence={evidence} id="form" />
            <Excerpt evidence={evidence} id="handler" />
          </li>
          <li>
            <p>
              El hook convierte las cantidades en líneas y llama a{' '}
              <code>submitOrder</code>. Esa es la función devuelta por la composición, que
              reenvía la llamada a la operación preparada arriba.
            </p>
            <Excerpt evidence={evidence} id="submit" />
          </li>
          <li>
            <p>
              La operación calcula el pedido y espera a <code>repository.save</code>. Solo
              devuelve éxito cuando el guardado termina.
            </p>
            <Excerpt evidence={evidence} id="use-case" />
          </li>
          <li>
            <p>
              La implementación de <code>save</code> inyectada es el envoltorio de la
              composición: si se solicitó una falla simulada, rechaza antes de escribir.
              En el recorrido normal delega al adaptador real, como muestra el fragmento
              de ensamblado anterior.
            </p>
          </li>
          <li>
            <p>
              El adaptador valida el pedido, lee y comprueba el historial existente y
              escribe el documento versionado bajo la clave propia del lab. El cálculo no
              conoce localStorage.
            </p>
            <Excerpt evidence={evidence} id="storage" />
          </li>
        </ol>
        <p>
          Este recorrido distingue llamadas de imports. El caso de uso llama a{' '}
          <code>save</code> por el contrato de aplicación, pero no importa el adaptador.
          Infraestructura importa ese contrato para implementarlo: esa es la inversión de
          dependencias. El mapa de imports no describe el orden de ejecución.
        </p>
        <p>
          Son fragmentos literales seleccionados del código durante el build, con su
          ubicación original. No representan una traza capturada en ejecución; las pruebas
          comprueban el comportamiento por separado.
        </p>
      </details>
    </section>
  );
}
