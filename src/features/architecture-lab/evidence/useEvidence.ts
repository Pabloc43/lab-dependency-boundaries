import { useEffect, useState } from 'react';
import type { Evidence } from './evidence.types';

export function useEvidence() {
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}evidence.json`, {
      signal: controller.signal,
      cache: 'no-cache',
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Evidence unavailable');
        }
        return response.json() as Promise<Evidence>;
      })
      .then(setEvidence)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setLoadError(true);
        }
      });
    return () => controller.abort();
  }, []);
  return { evidence, loadError };
}
