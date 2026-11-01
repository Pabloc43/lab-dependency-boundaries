import { CodeBlock } from '../../../code/CodeBlock';
import { AnalysisReport } from '../../AnalysisReport';
import { PersistenceExample } from '../../PersistenceExample';
import { CycleExample } from '../../CycleExample';
import type { Evidence } from '../../evidence.types';
import { exampleSourcePath, type ExampleId } from '../example-options';
import styles from './ExampleContent.module.css';

interface Props {
  example: ExampleId;
  evidence: Evidence | null;
  loadError: boolean;
}

export function ExampleContent({ example, evidence, loadError }: Props) {
  if (loadError) {
    return (
      <p role="alert">
        No fue posible cargar la evidencia. Puedes reproducirla con pnpm architecture.
      </p>
    );
  }

  if (!evidence) {
    return <p role="status">Cargando el informe generado…</p>;
  }

  const result = evidence.results.find((item) => item.id === example);

  switch (example) {
    case 'persistence-coupling':
      return <PersistenceExample evidence={evidence} />;
    case 'cycle':
      return <CycleExample evidence={evidence} result={result} />;
    default: {
      const sourcePath = exampleSourcePath(example, evidence);
      return (
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
      );
    }
  }
}
