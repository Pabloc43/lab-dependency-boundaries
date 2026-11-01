import { CodeBlock } from '../../../code/CodeBlock';
import type { Evidence } from '../../evidence.types';
import styles from './Excerpt.module.css';

interface Props {
  evidence: Evidence;
  id: string;
}

export function Excerpt({ evidence, id }: Props) {
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
