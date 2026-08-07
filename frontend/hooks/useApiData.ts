"use client";

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export function useApiData<T>(endpoint: string | null | undefined, initialData: T | null = null) {
  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!endpoint) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(endpoint);
      if (res.success && res.data !== undefined) {
        setData(res.data);
      } else {
        // Fallback for direct data return
        setData(res as any);
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
