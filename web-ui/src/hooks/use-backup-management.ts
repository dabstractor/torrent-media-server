import { useState, useCallback, useEffect } from 'react';
import type { BackupMetadata, BackupImportOptions, RestoreResult } from '@/lib/types/settings';

export interface BackupHook {
  backups: BackupMetadata[];
  loading: boolean;
  error: string | null;
  refreshBackups: () => Promise<void>;
  createBackup: (name: string, description?: string) => Promise<{ success: boolean; backupId?: string; error?: string }>;
  restoreBackup: (backupId: string) => Promise<{ success: boolean; error?: string }>;
  deleteBackup: (backupId: string) => Promise<{ success: boolean; error?: string }>;
  exportSettings: () => Promise<{ success: boolean; data?: any; error?: string }>;
  importSettings: (data: any, options?: BackupImportOptions) => Promise<{ success: boolean; error?: string }>;
  bulkDeleteOldBackups: (olderThanDays: number) => Promise<{ success: boolean; deletedCount?: number; error?: string }>;
}

interface BackupListResponse {
  success: boolean;
  data?: {
    backups: BackupMetadata[];
    total: number;
    timestamp: string;
  };
  error?: string;
}

interface BackupOperationResponse {
  success: boolean;
  data?: {
    operation: string;
    backupId?: string;
    executionTime: number;
    timestamp: string;
    [key: string]: any;
  };
  error?: string;
  details?: {
    errors?: string[];
    [key: string]: any;
  };
}

export const useBackupManagement = (): BackupHook => {
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBackups = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/settings/backup');
      const result: BackupListResponse = await response.json();
      
      if (result.success && result.data) {
        setBackups(result.data.backups);
      } else {
        throw new Error(result.error || 'Failed to fetch backups');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch backups';
      setError(errorMessage);
      console.error('Error fetching backups:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createBackup = useCallback(async (name: string, description?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/settings/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'create',
          name,
          description,
        }),
      });
      
      const result: BackupOperationResponse = await response.json();
      
      if (result.success) {
        await refreshBackups(); // Refresh the backup list
        return { success: true, backupId: result.data?.backupId };
      } else {
        throw new Error(result.error || 'Failed to create backup');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create backup';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [refreshBackups]);

  const restoreBackup = useCallback(async (backupId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/settings/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'restore',
          backupId,
        }),
      });
      
      const result: BackupOperationResponse = await response.json();
      
      if (result.success) {
        return { success: true };
      } else {
        const errorMessage = result.details?.errors?.[0] || result.error || 'Failed to restore backup';
        throw new Error(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore backup';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteBackup = useCallback(async (backupId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/settings/backup?id=${encodeURIComponent(backupId)}`, {
        method: 'DELETE',
      });
      
      const result: BackupOperationResponse = await response.json();
      
      if (result.success) {
        await refreshBackups(); // Refresh the backup list
        return { success: true };
      } else {
        throw new Error(result.error || 'Failed to delete backup');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete backup';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [refreshBackups]);

  const exportSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/settings/backup', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'export',
        }),
      });
      
      const result: BackupOperationResponse = await response.json();
      
      if (result.success && result.data?.exportData) {
        return { success: true, data: result.data.exportData };
      } else {
        throw new Error(result.error || 'Failed to export settings');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export settings';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const importSettings = useCallback(async (data: any, options?: BackupImportOptions) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/settings/backup', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'import',
          data,
          options,
        }),
      });
      
      const result: BackupOperationResponse = await response.json();
      
      if (result.success) {
        await refreshBackups(); // Refresh in case this affected backups
        return { success: true };
      } else {
        const errorMessage = result.details?.errors?.[0] || result.error || 'Failed to import settings';
        throw new Error(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import settings';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [refreshBackups]);

  const bulkDeleteOldBackups = useCallback(async (olderThanDays: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/settings/backup?bulk=true&olderThan=${olderThanDays}`, {
        method: 'DELETE',
      });
      
      const result: BackupOperationResponse = await response.json();
      
      if (result.success) {
        await refreshBackups(); // Refresh the backup list
        return { 
          success: true, 
          deletedCount: result.data?.deletedCount || 0 
        };
      } else {
        throw new Error(result.error || 'Failed to bulk delete backups');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to bulk delete backups';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [refreshBackups]);

  // Load backups on mount
  useEffect(() => {
    refreshBackups();
  }, [refreshBackups]);

  return {
    backups,
    loading,
    error,
    refreshBackups,
    createBackup,
    restoreBackup,
    deleteBackup,
    exportSettings,
    importSettings,
    bulkDeleteOldBackups,
  };
};