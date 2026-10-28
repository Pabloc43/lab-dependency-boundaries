import { useState } from 'react';
import { CodeBlock } from '../code/CodeBlock';
import { AnalysisReport } from './AnalysisReport';
import { CycleExample } from './CycleExample';
import { useEvidence } from './useEvidence';
import styles from './EvidenceExplorer.module.css';
const base = import.meta.env.BASE_URL;
const currentUseCase = 'src/features/orders/application/create-order.ts';
const legacyUseCase = 'src/application/create-order.ts';
export function EvidenceExplorer() {
  const { evidence, loadError } = useEvidence();
  const [example, setExample] = useState('domain-to-ui');
  const result = evidence?.results.find((item) => item.id === example);
  const sourcePath =
    example === 'domain-to-ui'
      ? 'fixtures/domain-to-ui/src/domain/order.ts'
      : evidence?.snippets[currentUseCase] !== undefined
        ? currentUseCase
        : legacyUseCase;
  return (
    <section
      className={[styles['section'], styles['evidence-section']].join(' ')}
      id="evidencia"
    >
      <div className={styles['wide-intro']}>
        <span className={styles['section-number']}>03 / LA COMPROBACIÓN</span>
        <h2>Romperlo también es una prueba.</h2>
        <p>
          La aplicación válida debe pasar. Los ejemplos incorrectos deben fallar por la
          regla y la dependencia esperadas. Un error de configuración no cuenta como
          éxito.
        </p>
      </div>
      <div
        className={styles['example-switch']}
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
          No fue posible cargar la evidencia. Puedes reproducirla con pnpm architecture.
        </p>
      ) : !evidence ? (
        <p role="status">Cargando el informe generado…</p>
      ) : example === 'cycle' ? (
        <CycleExample evidence={evidence} result={result} />
      ) : (
        <div className={styles['evidence-grid']}>
          <div className={styles['code-card']}>
            <div className={styles['code-label']}>{sourcePath}</div>
            {evidence.snippets[sourcePath] !== undefined ? (
              <CodeBlock
                label="Código del ejemplo seleccionado"
                source={evidence.snippets[sourcePath]}
                code={evidence.highlightedSnippets?.[sourcePath]}
              />
            ) : (
              <p>
                Esta versión de la evidencia no incluye el código del ejemplo
                seleccionado.
              </p>
            )}
          </div>
          <AnalysisReport result={result} />
        </div>
      )}
      <details className={styles['config-details']}>
        <summary>Ver la configuración que usa este proyecto</summary>
        {evidence ? (
          <CodeBlock
            className={styles['config-code']}
            label="Configuración de dependency-cruiser"
            source={evidence.snippets['.dependency-cruiser.cjs']}
            code={evidence.highlightedSnippets?.['.dependency-cruiser.cjs']}
          />
        ) : (
          <p>Cargando…</p>
        )}
      </details>
      <p className={styles['evidence-date']}>
        {evidence
          ? `Evidencia generada: ${new Date(evidence.generatedAt).toLocaleString('es-UY', { timeZone: 'UTC' })} UTC.`
          : ''}{' '}
        <a href={`${base}evidence.json`}>Consultar JSON completo ↗</a>
      </p>
    </section>
  );
}
