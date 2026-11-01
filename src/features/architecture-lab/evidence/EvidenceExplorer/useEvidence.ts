import { useEffect, useState } from 'react';
import type { Evidence } from '../evidence.types';
import { isEvidence } from './evidence-validation';

export function useEvidence() {
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadEvidence() {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}evidence.json`, {
          signal: controller.signal,
          cache: 'no-cache',
        });

        if (!response.ok) {
          throw new Error('Evidence unavailable');
        }

        const data: unknown = await response.json();

        if (!isEvidence(data)) {
          throw new Error('Invalid evidence');
        }

        if (active) {
          setEvidence(data);
        }
      } catch (cause: unknown) {
        if (active && !(cause instanceof DOMException && cause.name === 'AbortError')) {
          setLoadError(true);
        }
      }
    }

    void loadEvidence();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return { evidence, loadError };
}
