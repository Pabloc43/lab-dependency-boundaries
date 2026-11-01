import { CodeBlock } from '../../code/CodeBlock';
import { PersistenceWalkthrough } from '../PersistenceWalkthrough';
import { AnalysisReport } from '../AnalysisReport';
import type { Evidence } from '../evidence.types';
import { persistenceVariants, persistenceSourcePaths } from './persistence-data';
import styles from './PersistenceExample.module.css';

export function PersistenceExample({ evidence }: { evidence: Evidence }) {
  const sourcePaths = persistenceSourcePaths(evidence.snippets);

  return (
    <div className={styles.example}>
      <h3>Guardar funciona. El acoplamiento sigue siendo un problema.</h3>
      <p>
        Las dos variantes guardan, recuperan y borran el mismo pedido. La primera importa
        y construye el adaptador de localStorage desde aplicación; cambiar el
        almacenamiento obliga a modificar el caso de uso. La segunda recibe un
        repositorio: la raíz de composición elige el adaptador.
      </p>
      <p>
        La regla <code>no-application-outward</code> rechaza el import directo de
        aplicación a infraestructura. No detecta si localStorage funciona: eso lo
        comprueban las pruebas de comportamiento.
      </p>
      <PersistenceWalkthrough evidence={evidence} />
      {persistenceVariants.map((variant) => {
        const result = evidence.results.find((item) => item.id === variant.id);
        return (
          <article key={variant.id} className={styles.variant}>
            <h4>{variant.title}</h4>
            <p className={styles.path}>{variant.path}</p>
            {evidence.snippets[variant.path] !== undefined ? (
              <CodeBlock
                label={`Código de persistencia: ${variant.id}`}
                source={evidence.snippets[variant.path]}
                code={evidence.highlightedSnippets?.[variant.path]}
              />
            ) : (
              <p>Esta versión de la evidencia no incluye el código de esta variante.</p>
            )}
            {result ? (
              <>
                <p>
                  {result.verification?.typecheck && result.verification.saveRecoverClear
                    ? 'Verificado en el build: compila y supera guardado, recuperación con otra instancia y borrado.'
                    : 'Esta versión no incluye comprobación funcional de esta variante.'}
                </p>
                <AnalysisReport result={result} />
              </>
            ) : (
              <p>Esta versión de la evidencia no incluye el informe de esta variante.</p>
            )}
          </article>
        );
      })}
      <details>
        <summary>Ver el contrato, el adaptador y la composición reales</summary>
        {sourcePaths.map((path) => (
          <div key={path}>
            <p className={styles.path}>{path}</p>
            {evidence.snippets[path] !== undefined ? (
              <CodeBlock
                label={`Código real: ${path}`}
                source={evidence.snippets[path]}
                code={evidence.highlightedSnippets?.[path]}
              />
            ) : (
              <p>Código no incluido en esta versión.</p>
            )}
          </div>
        ))}
      </details>
      <p>
        Los informes se generan en un directorio temporal con copias del dominio, los
        puertos y el adaptador reales. Solo se sustituye el caso de uso. El navegador
        muestra evidencia del build, no ejecuta el analizador ni prueba el almacenamiento
        en línea.
      </p>
    </div>
  );
}
