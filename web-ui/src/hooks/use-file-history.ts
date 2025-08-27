import { useCallback, useState } from "react";
import useSWR from "swr";
import {
  getFileHistory,
  addHistoryEntry,
  updateHistoryEntry,
  deleteHistoryEntry,
  clearFileHistory,
  getFileStats,
} from "@/lib/api/files";
import type {
  DownloadHistoryEntry,
  HistoryFilters,
  FileHistoryStats,
} from "@/lib/types/file-history";
import type { FileHistoryResponse } from "@/lib/api/files";

interface UseFileHistoryOptions {
  filters?: HistoryFilters;
  refreshInterval?: number;
  revalidateOnFocus?: boolean;
}

interface UseFileHistoryReturn {
  history: DownloadHistoryEntry[];
  stats?: FileHistoryStats;
  total: number;
  isLoading: boolean;
  error?: Error;
  refresh: () => Promise<FileHistoryResponse | undefined>;
  addToHistory: (entry: Omit<DownloadHistoryEntry, "id">) => Promise<boolean>;
  updateEntry: (
    id: string,
    updates: Partial<DownloadHistoryEntry>,
  ) => Promise<boolean>;
  deleteEntry: (id: string) => Promise<boolean>;
  clearHistory: () => Promise<boolean>;
}

export function useFileHistory(
  options: UseFileHistoryOptions = {},
): UseFileHistoryReturn {
  const {
    filters,
    refreshInterval = 30000, // 30 seconds - slower than downloads since history changes less frequently
    revalidateOnFocus = true,
  } = options;

  // Create cache key based on filters
  const cacheKey = ["file-history", filters];

  const { data, error, mutate, isLoading } = useSWR<FileHistoryResponse>(
    cacheKey,
    () =>
      getFileHistory(filters).then((response) => {
        if (!response.success) {
          throw new Error(response.error || "Failed to fetch file history");
        }
        return response.data;
      }),
    {
      refreshInterval,
      revalidateOnFocus,
      errorRetryInterval: 10000,
      dedupingInterval: 5000,
    },
  );

  // Memoized action methods
  const addToHistory = useCallback(
    async (entry: Omit<DownloadHistoryEntry, "id">): Promise<boolean> => {
      try {
        const response = await addHistoryEntry(entry);

        if (response.success) {
          mutate(); // Refresh data after successful addition
          return true;
        }

        console.error("Failed to add history entry:", response.error);
        return false;
      } catch (error) {
        console.error("Failed to add history entry:", error);
        return false;
      }
    },
    [mutate],
  );

  const updateEntry = useCallback(
    async (
      id: string,
      updates: Partial<DownloadHistoryEntry>,
    ): Promise<boolean> => {
      try {
        const response = await updateHistoryEntry(id, updates);

        if (response.success) {
          mutate(); // Refresh data after successful update
          return true;
        }

        console.error("Failed to update history entry:", response.error);
        return false;
      } catch (error) {
        console.error("Failed to update history entry:", error);
        return false;
      }
    },
    [mutate],
  );

  const deleteEntry = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const response = await deleteHistoryEntry(id);

        if (response.success) {
          mutate(); // Refresh data after successful deletion
          return true;
        }

        console.error("Failed to delete history entry:", response.error);
        return false;
      } catch (error) {
        console.error("Failed to delete history entry:", error);
        return false;
      }
    },
    [mutate],
  );

  const clearHistory = useCallback(async (): Promise<boolean> => {
    try {
      const response = await clearFileHistory();

      if (response.success) {
        mutate(); // Refresh data after successful clear
        return true;
      }

      console.error("Failed to clear history:", response.error);
      return false;
    } catch (error) {
      console.error("Failed to clear history:", error);
      return false;
    }
  }, [mutate]);

  return {
    history: data?.entries || [],
    stats: data?.stats,
    total: data?.total || 0,
    isLoading,
    error,
    refresh: mutate,
    addToHistory,
    updateEntry,
    deleteEntry,
    clearHistory,
  };
}

// Specialized hook for file statistics
export function useFileStats() {
  const { data, error, mutate, isLoading } = useSWR<FileHistoryStats>(
    "file-stats",
    () =>
      getFileStats().then((response) => {
        if (!response.success) {
          throw new Error(response.error || "Failed to fetch file statistics");
        }
        return response.data;
      }),
    {
      refreshInterval: 60000, // 1 minute - stats change even less frequently
      revalidateOnFocus: true,
      errorRetryInterval: 15000,
    },
  );

  return {
    stats: data,
    isLoading,
    error,
    refresh: mutate,
  };
}

// Hook for filtered history with common filter presets
export function useFilteredFileHistory() {
  const [filters, setFilters] = useState<HistoryFilters>({});

  const { history, stats, isLoading, error, refresh } = useFileHistory({
    filters,
  });

  const applyFilters = useCallback((newFilters: HistoryFilters) => {
    setFilters(newFilters);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const setCategory = useCallback((category: string) => {
    setFilters((prev) => ({ ...prev, category }));
  }, []);

  const setStatus = useCallback((status: DownloadHistoryEntry["status"][]) => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const setDateRange = useCallback((dateRange: [Date, Date]) => {
    setFilters((prev) => ({ ...prev, dateRange }));
  }, []);

  const setSearchTerm = useCallback((searchTerm: string) => {
    setFilters((prev) => ({ ...prev, searchTerm }));
  }, []);

  return {
    history,
    stats,
    filters,
    isLoading,
    error,
    refresh,
    applyFilters,
    clearFilters,
    setCategory,
    setStatus,
    setDateRange,
    setSearchTerm,
  };
}
