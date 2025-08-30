import { useState, useCallback, useEffect, useRef } from 'react';
import type { SyncResult, SettingsConflict } from '@/lib/types/settings';

interface TransmissionSyncStatus {
  enabled: boolean;
  connected: boolean;
  authenticated: boolean;
  lastSync: Date | null;
  autoSyncActive: boolean;
  error?: string;
}

interface TransmissionSyncHistory {
  id: number;
  operation: string;
  settingsChanged: string[];
  success: boolean;
  errorMessage?: string;
  executionTime: number;
  createdAt: Date;
}

interface UseTransmissionSyncOptions {
  refreshInterval?: number; // milliseconds
  includeHistory?: boolean;
  historyLimit?: number;
  autoRefresh?: boolean;
}

interface UseTransmissionSyncReturn {
  // Status
  status: TransmissionSyncStatus | null;
  history: TransmissionSyncHistory[] | null;
  conflicts: SettingsConflict[] | null;
  isLoading: boolean;
  error: string | null;
  isValidating: boolean;
  
  // Operations
  syncToTransmission: () => Promise<SyncResult>;
  syncFromTransmission: () => Promise<SyncResult>;
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
const SYNC_STATUS_CACHE_KEY = 'transmission-sync-status-cache-v1';
const DEFAULT_REFRESH_INTERVAL = 30000; // 30 seconds

// Utility functions for caching
const getCachedStatus = (): { status: TransmissionSyncStatus; timestamp: number } | null => {
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

const setCachedStatus = (status: TransmissionSyncStatus): void => {
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

const isCacheValid = (cached: { status: TransmissionSyncStatus; timestamp: number }, maxAge = 30000): boolean => {
  return (Date.now() - cached.timestamp) < maxAge;
};

export function useTransmissionSync(options: UseTransmissionSyncOptions = {}): UseTransmissionSyncReturn {
  const {
    refreshInterval = DEFAULT_REFRESH_INTERVAL,
    includeHistory = false,
    autoRefresh = true,
  } = options;

  const [status, setStatus] = useState<TransmissionSyncStatus | null>(null);
  const [history, setHistory] = useState<TransmissionSyncHistory[] | null>(null);
  const [conflicts, setConflicts] = useState<SettingsConflict[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isValidatingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch sync status from API
  const fetchSyncStatus = useCallback(async (signal?: AbortSignal): Promise<{
    status: TransmissionSyncStatus;
    history?: TransmissionSyncHistory[];
  } | null> => {
    try {
      const response = await fetch('/api/transmission/sync-status', {
        method: 'GET',
        signal,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const fetchedStatus = await response.json();
      
      // Cache the status
      setCachedStatus(fetchedStatus);
      
      return {
        status: fetchedStatus,
        history: includeHistory ? [] : undefined, // TODO: implement history if needed
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return null; // Request was aborted
      }
      throw error;
    }
  }, [includeHistory]);

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

      // Load from service
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

  // Sync operations
  const syncToTransmission = useCallback(async (): Promise<SyncResult> => {
    try {
      const response = await fetch('/api/transmission/sync-to', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      // Refresh status after sync
      revalidate(false);
      return result;
    } catch (error) {
      console.error('Sync to Transmission failed:', error);
      throw error;
    }
  }, [revalidate]);

  const syncFromTransmission = useCallback(async (): Promise<SyncResult> => {
    try {
      const response = await fetch('/api/transmission/sync-from', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      // Refresh status after sync
      revalidate(false);
      return result;
    } catch (error) {
      console.error('Sync from Transmission failed:', error);
      throw error;
    }
  }, [revalidate]);

  const syncBidirectional = useCallback(async (): Promise<SyncResult> => {
    try {
      const response = await fetch('/api/transmission/sync-bidirectional', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      // Refresh status after sync
      revalidate(false);
      return result;
    } catch (error) {
      console.error('Bidirectional sync failed:', error);
      throw error;
    }
  }, [revalidate]);

  const testConnection = useCallback(async (): Promise<{ connected: boolean; error?: string; version?: string }> => {
    try {
      const response = await fetch('/api/transmission/test-connection', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      // Update status if connection status changed
      if (status && status.connected !== result.connected) {
        revalidate(false);
      }
      return result;
    } catch (error) {
      console.error('Connection test failed:', error);
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }, [status, revalidate]);

  // Auto-sync control operations
  const startAutoSync = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/transmission/start-auto-sync', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Refresh status to get updated state
      revalidate(false);
    } catch (error) {
      console.error('Start auto-sync failed:', error);
      throw error;
    }
  }, [revalidate]);

  const stopAutoSync = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/transmission/stop-auto-sync', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Refresh status to get updated state
      revalidate(false);
    } catch (error) {
      console.error('Stop auto-sync failed:', error);
      throw error;
    }
  }, [revalidate]);

  const restartAutoSync = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/transmission/restart-auto-sync', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Refresh status to get updated state
      revalidate(false);
    } catch (error) {
      console.error('Restart auto-sync failed:', error);
      throw error;
    }
  }, [revalidate]);

  // Clear sync history
  const clearHistory = useCallback(async (): Promise<void> => {
    try {
      // For now, we'll just clear the local state
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
    syncToTransmission,
    syncFromTransmission,
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
export function useTransmissionConnection() {
  const { testConnection, status } = useTransmissionSync({ 
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
export function useTransmissionSyncOperations() {
  const {
    syncToTransmission,
    syncFromTransmission,
    syncBidirectional,
    status,
    isValidating,
  } = useTransmissionSync({ 
    autoRefresh: true, 
    includeHistory: false 
  });
  
  return {
    syncToTransmission,
    syncFromTransmission,
    syncBidirectional,
    canSync: status?.enabled && status?.connected,
    isSyncing: isValidating,
  };
}