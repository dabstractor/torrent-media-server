import { useState, useCallback, useEffect, useRef } from 'react';
import * as settingsApi from '@/lib/api/settings';
import type { SyncResult, SettingsConflict } from '@/lib/types/settings';

interface QBittorrentSyncStatus {
  enabled: boolean;
  connected: boolean;
  authenticated: boolean;
  lastSync: Date | null;
  autoSyncActive: boolean;
  error?: string;
}

interface QBittorrentSyncHistory {
  id: number;
  operation: string;
  settingsChanged: string[];
  success: boolean;
  errorMessage?: string;
  executionTime: number;
  createdAt: Date;
}

interface UseQBittorrentSyncOptions {
  refreshInterval?: number; // milliseconds
  includeHistory?: boolean;
  historyLimit?: number;
  autoRefresh?: boolean;
}

interface UseQBittorrentSyncReturn {
  // Status
  status: QBittorrentSyncStatus | null;
  history: QBittorrentSyncHistory[] | null;
  conflicts: SettingsConflict[] | null;
  isLoading: boolean;
  error: string | null;
  isValidating: boolean;
  
  // Operations
  syncToQBittorrent: () => Promise<SyncResult>;
  syncFromQBittorrent: () => Promise<SyncResult>;
  syncBidirectional: () => Promise<SyncResult>;
  testConnection: () => Promise<{ connected: boolean; error?: string; version?: string }>;
  
  // Auto-sync control
  startAutoSync: () => Promise<void>;
  stopAutoSync: () => Promise<void>;
  restartAutoSync: () => Promise<void>;
  
  // Utility
  refresh: () => Promise<void>;
  clearHistory: () => Promise<void>;
  resolveConflicts: () => Promise<void>;
}

// Cache key for sync status
const SYNC_STATUS_CACHE_KEY = 'qb-sync-status-cache-v1';
const DEFAULT_REFRESH_INTERVAL = 30000; // 30 seconds

// Utility functions for caching
const getCachedStatus = (): { status: QBittorrentSyncStatus; timestamp: number } | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(SYNC_STATUS_CACHE_KEY);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached);
    if (parsed.status.lastSync) {
      parsed.status.lastSync = new Date(parsed.status.lastSync);
    }
    return parsed;
  } catch (error) {
    console.error('Error reading sync status cache:', error);
    return null;
  }
};

const setCachedStatus = (status: QBittorrentSyncStatus): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const cacheData = {
      status,
      timestamp: Date.now(),
    };
    localStorage.setItem(SYNC_STATUS_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error caching sync status:', error);
  }
};

const isCacheValid = (cached: { status: QBittorrentSyncStatus; timestamp: number }, maxAge = 30000): boolean => {
  return (Date.now() - cached.timestamp) < maxAge;
};

export function useQBittorrentSync(options: UseQBittorrentSyncOptions = {}): UseQBittorrentSyncReturn {
  const {
    refreshInterval = DEFAULT_REFRESH_INTERVAL,
    includeHistory = false,
    historyLimit = 10,
    autoRefresh = true,
  } = options;

  const [status, setStatus] = useState<QBittorrentSyncStatus | null>(null);
  const [history, setHistory] = useState<QBittorrentSyncHistory[] | null>(null);
  const [conflicts, setConflicts] = useState<SettingsConflict[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isValidatingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch sync status from API
  const fetchSyncStatus = useCallback(async (signal?: AbortSignal): Promise<{
    status: QBittorrentSyncStatus;
    history?: QBittorrentSyncHistory[];
  } | null> => {
    try {
      const params: { limit?: number } = {};
      if (includeHistory) {
        params.limit = historyLimit;
      }
      
      const response = await settingsApi.getSyncStatus();

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch sync status');
      }

      const fetchedStatus = response.data;
      
      // Convert lastSync to Date object
      if (fetchedStatus.lastSync) {
        fetchedStatus.lastSync = new Date(fetchedStatus.lastSync);
      }

      let fetchedHistory: QBittorrentSyncHistory[] | undefined;
      if (includeHistory) {
        const historyResponse = await settingsApi.getSyncHistory(params);
        if (historyResponse.success) {
          fetchedHistory = historyResponse.data.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt),
          }));
        }
      }
      
      // Cache the status
      setCachedStatus(fetchedStatus);
      
      return {
        status: fetchedStatus,
        history: fetchedHistory,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return null; // Request was aborted
      }
      throw error;
    }
  }, [includeHistory, historyLimit]);

  // Revalidate sync status
  const revalidate = useCallback(async (showValidating = true): Promise<void> => {
    if (isValidatingRef.current) return;
    
    isValidatingRef.current = true;
    if (showValidating) setIsValidating(true);

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      const data = await fetchSyncStatus(abortControllerRef.current.signal);
      if (data) {
        setStatus(data.status);
        if (data.history) {
          setHistory(data.history);
        }
        setError(null);
      }
    } catch (error) {
      console.error('Error revalidating sync status:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch sync status');
    } finally {
      isValidatingRef.current = false;
      setIsValidating(false);
      abortControllerRef.current = null;
    }
  }, [fetchSyncStatus]);

  // Initialize and load sync status
  const initialize = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Try to load from cache first for instant UI
      const cached = getCachedStatus();
      if (cached && isCacheValid(cached, refreshInterval)) {
        setStatus(cached.status);
        setIsLoading(false);
        // Still revalidate in background
        revalidate(false);
        return;
      }

      // Load from API
      const data = await fetchSyncStatus();
      if (data) {
        setStatus(data.status);
        if (data.history) {
          setHistory(data.history);
        }
      }
    } catch (error) {
      console.error('Error initializing sync status:', error);
      setError(error instanceof Error ? error.message : 'Failed to load sync status');
      
      // Fallback to cached status if available
      const cached = getCachedStatus();
      if (cached) {
        setStatus(cached.status);
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchSyncStatus, revalidate, refreshInterval]);

  // Perform sync operation
  const performSyncOperation = useCallback(async (operation: string): Promise<SyncResult> => {
    try {
      let response: any;
      
      switch (operation) {
        case 'to-qbittorrent':
          response = await settingsApi.syncToQBittorrent();
          break;
        case 'from-qbittorrent':
          response = await settingsApi.syncFromQBittorrent();
          break;
        case 'bidirectional':
          response = await settingsApi.syncBidirectional();
          break;
        default:
          throw new Error(`Unknown sync operation: ${operation}`);
      }

      if (response.success) {
        const result = response.data;
        // Refresh status after sync
        revalidate(false);
        return result;
      } else {
        throw new Error(response.error || `${operation} failed`);
      }
    } catch (error) {
      console.error(`Sync operation ${operation} failed:`, error);
      throw error;
    }
  }, [revalidate]);

  // Sync operations
  const syncToQBittorrent = useCallback(async (): Promise<SyncResult> => {
    return performSyncOperation('to-qbittorrent');
  }, [performSyncOperation]);

  const syncFromQBittorrent = useCallback(async (): Promise<SyncResult> => {
    return performSyncOperation('from-qbittorrent');
  }, [performSyncOperation]);

  const syncBidirectional = useCallback(async (): Promise<SyncResult> => {
    return performSyncOperation('bidirectional');
  }, [performSyncOperation]);

  const testConnection = useCallback(async (): Promise<{ connected: boolean; error?: string; version?: string }> => {
    try {
      const response = await settingsApi.testQBittorrentConnection();

      if (response.success) {
        const result = response.data;
        // Update status if connection status changed
        if (status && status.connected !== result.connected) {
          revalidate(false);
        }
        return result;
      } else {
        throw new Error(response.error || 'Connection test failed');
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }, [status, revalidate]);

  // Auto-sync control operations
  const controlAutoSync = useCallback(async (action: string): Promise<void> => {
    try {
      let response: any;
      
      switch (action) {
        case 'start-auto-sync':
          response = await settingsApi.startAutoSync();
          break;
        case 'stop-auto-sync':
          response = await settingsApi.stopAutoSync();
          break;
        case 'restart-auto-sync':
          // For restart, we stop and then start
          await settingsApi.stopAutoSync();
          response = await settingsApi.startAutoSync();
          break;
        default:
          throw new Error(`Unknown auto-sync action: ${action}`);
      }

      if (response.success) {
        // Refresh status to get updated state
        revalidate(false);
      } else {
        throw new Error(response.error || `Auto-sync ${action} failed`);
      }
    } catch (error) {
      console.error(`Auto-sync ${action} failed:`, error);
      throw error;
    }
  }, [revalidate]);

  const startAutoSync = useCallback(async (): Promise<void> => {
    return controlAutoSync('start-auto-sync');
  }, [controlAutoSync]);

  const stopAutoSync = useCallback(async (): Promise<void> => {
    return controlAutoSync('stop-auto-sync');
  }, [controlAutoSync]);

  const restartAutoSync = useCallback(async (): Promise<void> => {
    return controlAutoSync('restart-auto-sync');
  }, [controlAutoSync]);

  // Clear sync history
  const clearHistory = useCallback(async (): Promise<void> => {
    try {
      // For now, we'll just refresh to clear the local state
      // In a real implementation, there might be a specific API endpoint
      setHistory([]);
      // Refresh to get updated state
      revalidate(false);
    } catch (error) {
      console.error('Failed to clear sync history:', error);
      throw error;
    }
  }, [revalidate]);

  // Resolve conflicts
  const resolveConflicts = useCallback(async (): Promise<void> => {
    try {
      // For now, we'll just clear the local conflicts state
      // In a real implementation, there might be a specific API endpoint
      setConflicts([]);
      // Refresh to get updated state
      revalidate(false);
    } catch (error) {
      console.error('Failed to resolve conflicts:', error);
      throw error;
    }
  }, [revalidate]);

  // Refresh sync status
  const refresh = useCallback(async () => {
    await revalidate();
  }, [revalidate]);

  // Setup polling interval
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        if (!isValidatingRef.current) {
          revalidate(false); // Background revalidation
        }
      }, refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [autoRefresh, refreshInterval, revalidate]);

  // Initialize on mount
  useEffect(() => {
    initialize();

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [initialize]);

  return {
    // Status
    status,
    history,
    conflicts,
    isLoading,
    error,
    isValidating,
    
    // Operations
    syncToQBittorrent,
    syncFromQBittorrent,
    syncBidirectional,
    testConnection,
    
    // Auto-sync control
    startAutoSync,
    stopAutoSync,
    restartAutoSync,
    
    // Utility
    refresh,
    clearHistory,
    resolveConflicts,
  };
}

// Hook for just connection testing
export function useQBittorrentConnection() {
  const { testConnection, status } = useQBittorrentSync({ 
    autoRefresh: false, 
    includeHistory: false 
  });
  
  return {
    testConnection,
    connected: status?.connected || false,
    error: status?.error,
  };
}

// Hook for sync operations only
export function useQBittorrentSyncOperations() {
  const {
    syncToQBittorrent,
    syncFromQBittorrent,
    syncBidirectional,
    status,
    isValidating,
  } = useQBittorrentSync({ 
    autoRefresh: true, 
    includeHistory: false 
  });
  
  return {
    syncToQBittorrent,
    syncFromQBittorrent,
    syncBidirectional,
    canSync: status?.enabled && status?.connected,
    isSyncing: isValidating,
  };
}