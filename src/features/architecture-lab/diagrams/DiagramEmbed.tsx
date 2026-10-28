import { useId, useState, type SyntheticEvent } from 'react';
import styles from './DiagramEmbed.module.css';

interface Props {
  src: string;
  title: string;
  summary: string;
  heading: string;
  description: string;
  linkLabel: string;
}

export function DiagramEmbed({
  src,
  title,
  summary,
  heading,
  description,
  linkLabel,
}: Props) {
  const descriptionId = useId();
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');

  function prepareViewer(event: SyntheticEvent<HTMLIFrameElement>) {
    try {
      const document = event.currentTarget.contentDocument;
      const diagram = document?.querySelector('svg[data-quality-profile="showcase"]');
      const labelledBy = diagram?.getAttribute('aria-labelledby')?.split(/\s+/);
      const hasDescription = labelledBy?.every((id) => document?.getElementById(id));
      const hasInteractiveNodes = diagram?.querySelector('[data-node-id][role="button"]');
      const role = diagram?.getAttribute('role');

      if (
        !diagram ||
        !labelledBy?.length ||
        !hasDescription ||
        !hasInteractiveNodes ||
        (role !== 'img' && role !== 'group')
      ) {
        setState('failed');
        return;
      }

      // An image is atomic in the accessibility tree, but this SVG contains controls.
      // Correct only the embedded container role; retain its name and all node behavior.
      diagram.setAttribute('role', 'group');
      setState('ready');
    } catch {
      // The adapter intentionally supports only the checked same-origin viewer.
      setState('failed');
    }
  }

  return (
    <section className={styles['diagram-card']} aria-label={title}>
      <div className={styles['diagram-header']}>
        <h3>{heading}</h3>
        <p>{description}</p>
        <a className={styles['text-link']} href={src} target="_blank" rel="noreferrer">
          {linkLabel}
        </a>
      </div>
      <div className={styles['diagram-embed']} data-viewer-state={state}>
        <p id={descriptionId} className={styles['diagram-summary']}>
          {summary}
        </p>
        {state !== 'failed' ? (
          <iframe
            src={src}
            className={styles.viewer}
            title={title}
            aria-describedby={descriptionId}
            loading="lazy"
            onLoad={prepareViewer}
            onError={() => setState('failed')}
          />
        ) : (
          <p className={styles['diagram-fallback']} role="status">
            No fue posible preparar el visor integrado. El resumen sigue disponible y
            puedes abrir el diagrama en una pestaña independiente con el enlace anterior.
          </p>
        )}
        {state === 'loading' ? (
          <p className={styles['diagram-loading']} role="status">
            Cargando diagrama interactivo…
          </p>
        ) : null}
      </div>
    </section>
  );
}
