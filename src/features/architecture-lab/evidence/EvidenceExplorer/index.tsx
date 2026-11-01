import { useState } from 'react';
import { CodeBlock } from '../../code/CodeBlock';
import { ExampleContent } from './ExampleContent';
import { exampleOptions, type ExampleId } from './example-options';
import { useEvidence } from './useEvidence';
import styles from './EvidenceExplorer.module.css';

const base = import.meta.env.BASE_URL;

export function EvidenceExplorer() {
  const { evidence, loadError } = useEvidence();
  const [example, setExample] = useState<ExampleId>('domain-to-ui');

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
        {exampleOptions.map(({ id, label }) => (
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
      <ExampleContent example={example} evidence={evidence} loadError={loadError} />
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
