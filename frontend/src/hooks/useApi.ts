import { useState, useCallback } from 'react';
import { getErrorMessage } from '../services/api';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>(
  apiCall: (...args: unknown[]) => Promise<{ data: { data: T } }>,
  options?: { onSuccess?: (data: T) => void; onError?: (err: string) => void }
) {
  const [state, setState] = useState<UseApiState<T>>({ data: null, loading: false, error: null });

  const execute = useCallback(async (...args: unknown[]) => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const response = await apiCall(...args);
      const data = response.data.data;
      setState({ data, loading: false, error: null });
      options?.onSuccess?.(data);
      return data;
    } catch (error) {
      const msg = getErrorMessage(error);
      setState(s => ({ ...s, loading: false, error: msg }));
      options?.onError?.(msg);
      throw error;
    }
  }, []);

  return { ...state, execute };
}

export function usePaginatedApi<T>() {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (
    apiCall: () => Promise<{ data: { data: T[]; total: number; page: number; totalPages: number } }>
  ) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiCall();
      setData(response.data.data);
      setTotal(response.data.total);
      setPage(response.data.page);
      setTotalPages(response.data.totalPages);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, total, page, totalPages, loading, error, execute, setPage };
}
