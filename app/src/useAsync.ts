import { DependencyList, useCallback, useEffect, useRef, useState } from 'react';
import { errorText } from './client';

/** Runs an async loader on mount and when `deps` change. `set` lets a screen update the loaded value after an edit. */
export function useAsync<T>(load: () => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const run = useRef(load);
  run.current = load;
  const live = useRef(0);

  const reload = useCallback(async () => {
    const id = ++live.current;
    setLoading(true);
    setError('');
    try {
      const v = await run.current();
      if (id === live.current) setData(v);
    } catch (e) {
      if (id === live.current) setError(errorText(e));
    } finally {
      if (id === live.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    return () => {
      live.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the caller's deps change
  }, deps);

  return { data, error, loading, reload, set: setData };
}
