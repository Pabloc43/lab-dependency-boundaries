import type { ReactNode } from 'react';
import type { AnalysisResult } from './evidence.types';
import styles from './AnalysisReport.module.css';
interface Props {
  result?: AnalysisResult;
  children?: ReactNode;
}
export function AnalysisReport({ result, children }: Props) {
  const valid = result?.id === 'valid';
  return (
    <div className={styles['report-card']}>
      <span className={[styles['report-label'], valid ? styles.valid : ''].join(' ')}>
        {valid ? 'SIN INFRACCIONES' : 'INFRACCIÓN ESPERADA'}
      </span>
      <h3>
        {result?.violations.length ?? 0}{' '}
        {result?.violations.length === 1 ? 'infracción' : 'infracciones'}
      </h3>
      <p>
        Exit code: <strong>{result?.exitCode}</strong> · Módulos analizados:{' '}
        <strong>{result?.moduleCount}</strong>
      </p>
      {children ??
        result?.violations.map((violation, index) => (
          <div className={styles['violation']} key={`${violation.rule}-${index}`}>
            <strong>{violation.rule}</strong>
            <code>
              {violation.from} → {violation.to}
            </code>
          </div>
        ))}
      <p className={styles['small']}>
        Informe real generado durante el build. El navegador muestra el resultado; no
        ejecuta dependency-cruiser ni consulta el estado actual de GitHub Actions.
      </p>
    </div>
  );
}
