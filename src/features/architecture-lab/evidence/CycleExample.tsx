import { CodeBlock } from '../code/CodeBlock';
import { AnalysisReport } from './AnalysisReport';
import type { AnalysisResult, Evidence } from './evidence.types';
import styles from './CycleExample.module.css';
interface Props {
  evidence: Evidence;
  result?: AnalysisResult;
}
export function CycleExample({ evidence, result }: Props) {
  const cyclePath = result?.violations.find(
    ({ rule }) => rule === 'no-circular',
  )?.cyclePath;
  return (
    <div className={styles['evidence-grid']}>
      <div className={styles['code-card']}>
        {evidence.snippets['fixtures/cycle/src/domain/a.ts'] !== undefined &&
        evidence.snippets['fixtures/cycle/src/domain/b.ts'] !== undefined ? (
          ['a.ts', 'b.ts'].map((file) => {
            const path = `fixtures/cycle/src/domain/${file}`;
            return (
              <div key={file}>
                <div className={styles['code-label']}>{path}</div>
                <CodeBlock
                  label={`Código de ${file}`}
                  source={evidence.snippets[path]}
                  code={evidence.highlightedSnippets?.[path]}
                />
              </div>
            );
          })
        ) : (
          <p className={styles['cycle-note']}>
            Esta versión de la evidencia no incluye el código de los dos fixtures. Puedes
            consultar el informe técnico a continuación.
          </p>
        )}
      </div>
      <AnalysisReport result={result}>
        <div className={styles['cycle-explanation']}>
          <h4>No permitir ciclos</h4>
          <p>
            Los dos módulos pertenecen al dominio. Un import de dominio a dominio está
            permitido; el problema es que a.ts importa b.ts y b.ts vuelve a importar a.ts.
          </p>
          {cyclePath ? (
            <div
              className={styles['cycle-path']}
              role="group"
              aria-label="Ciclo detectado"
            >
              <code>{cyclePath.map((path) => path.split('/').at(-1)).join(' → ')}</code>
            </div>
          ) : (
            <p>
              Esta versión de la evidencia no incluye el recorrido completo del ciclo. No
              se reconstruye una cadena sin esos datos.
            </p>
          )}
          <p>
            La regla <code>no-circular</code> significa «No permitir ciclos». Es el nombre
            de una regla, no un valor booleano.
          </p>
          <details className={styles['cycle-report']}>
            <summary>Ver informe técnico del ciclo</summary>
            <CodeBlock
              label="Informe técnico del ciclo"
              source={JSON.stringify(result?.violations ?? [], null, 2)}
              className={styles['report-code']}
              code={evidence.highlightedReports?.cycle}
            />
          </details>
        </div>
      </AnalysisReport>
    </div>
  );
}
