/* eslint-disable react-hooks/refs, react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
import { useCallback, useEffect, useRef, useState } from 'react';
import { errMsg } from '../lib/format';

export function useApi<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const depsRef = useRef(deps as any);

  const load = useCallback(async (silent = false): Promise<T | null> => {
    if (!silent) setLoading(true);
    try {
      const result = await fnRef.current();
      setData(result);
      setError(null);
      return result;
    } catch (e) {
      setError(errMsg(e));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
     
  }, depsRef.current);

  return { data, loading, error, reload: load, setData };
}
