import useSWR from 'swr';
import { apiClient } from '@/lib/api/client';

const INDEXERS_KEY = '/api/prowlarr/indexer';

async function getIndexers() {
  const response = await apiClient.get(INDEXERS_KEY);
  return response.data;
}

export function useIndexers() {
  const { data, error, isLoading } = useSWR(INDEXERS_KEY, getIndexers);

  return {
    indexers: data || [],
    isLoading,
    error,
  };
}
