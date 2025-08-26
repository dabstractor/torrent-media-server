import useSWR from 'swr';
import { apiClient } from '@/lib/api/client';
import { ServiceStatus } from '@/lib/types';

const SERVICE_STATUS_KEY = '/api/status';

async function getServiceStatus(): Promise<ServiceStatus[]> {
  const response = await apiClient.get<ServiceStatus[]>(SERVICE_STATUS_KEY);
  if (response.success) {
    return response.data;
  }
  throw new Error(response.error || 'Failed to fetch service status');
}

export function useServiceStatus() {
  const { data, error, isLoading } = useSWR<ServiceStatus[]>(
    SERVICE_STATUS_KEY, 
    getServiceStatus,
    { refreshInterval: 10000 }
  );

  return {
    serviceStatus: data || [],
    isLoading,
    error,
  };
}
