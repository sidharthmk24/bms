"use client";

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export function useApiData<T>(endpoint: string, initialData: T | null = null) {
  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(endpoint);
      if (res.success) {
        setData(res.data);
        setError(null);
      } else {
        setError('Failed to fetch data');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchData();

    // Listen to global mutations broadcast by RealTimeSync or POST/PATCH requests
    const handleMutation = () => {
      fetchData();
    };

    window.addEventListener('app:data-mutated', handleMutation);
    return () => {
      window.removeEventListener('app:data-mutated', handleMutation);
    };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
