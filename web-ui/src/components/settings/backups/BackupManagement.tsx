"use client";
import React, { useState } from 'react';
import BackupList from './BackupList';
import CreateBackupForm from './CreateBackupForm';
import ImportExportPanel from './ImportExportPanel';
import type { BackupMetadata } from '@/lib/types/settings';
import { useBackupManagement } from '@/hooks/use-backup-management';

export interface BackupManagementProps {
  className?: string;
}

const BackupManagement: React.FC<BackupManagementProps> = ({
  className = '',
}) => {
  const { restoreBackup, deleteBackup, bulkDeleteOldBackups, loading, error } = useBackupManagement();
  const [activeTab, setActiveTab] = useState<'backups' | 'create' | 'import'>('backups');
  const [showConfirmDialog, setShowConfirmDialog] = useState<{
    type: 'restore' | 'delete' | 'bulk-delete';
    id?: string;
    days?: number;
    name?: string;
  } | null>(null);
  const [operationResult, setOperationResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleRestoreRequested = (backupId: string) => {
    const backup = useBackupManagement().backups.find(b => b.id === backupId);
    setShowConfirmDialog({
      type: 'restore',
      id: backupId,
      name: backup?.name,
    });
  };

  const handleDeleteRequested = (backupId: string) => {
    const backup = useBackupManagement().backups.find(b => b.id === backupId);
    setShowConfirmDialog({
      type: 'delete',
      id: backupId,
      name: backup?.name,
    });
  };

  const handleBulkDeleteRequested = () => {
    setShowConfirmDialog({
      type: 'bulk-delete',
      days: 30,
    });
  };

  const confirmOperation = async () => {
    if (!showConfirmDialog) return;

    setOperationResult(null);

    try {
      if (showConfirmDialog.type === 'restore' && showConfirmDialog.id) {
        const result = await restoreBackup(showConfirmDialog.id);
        if (result.success) {
          setOperationResult({ success: true, message: 'Backup restored successfully!' });
        } else {
          setOperationResult({ success: false, message: result.error || 'Failed to restore backup' });
        }
      } else if (showConfirmDialog.type === 'delete' && showConfirmDialog.id) {
        const result = await deleteBackup(showConfirmDialog.id);
        if (result.success) {
          setOperationResult({ success: true, message: 'Backup deleted successfully!' });
        } else {
          setOperationResult({ success: false, message: result.error || 'Failed to delete backup' });
        }
      } else if (showConfirmDialog.type === 'bulk-delete' && showConfirmDialog.days) {
        const result = await bulkDeleteOldBackups(showConfirmDialog.days);
        if (result.success) {
          setOperationResult({
            success: true,
            message: `Successfully deleted ${result.deletedCount} old backups!`
          });
        } else {
          setOperationResult({ success: false, message: result.error || 'Failed to delete old backups' });
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Operation failed';
      setOperationResult({ success: false, message: errorMessage });
    }

    setShowConfirmDialog(null);

    // Clear success message after 3 seconds
    setTimeout(() => {
      if (operationResult?.success) {
        setOperationResult(null);
      }
    }, 3000);
  };

  const cancelOperation = () => {
    setShowConfirmDialog(null);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Backup Management
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Create, restore, and manage your settings backups.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            type="button"
            onClick={() => setActiveTab('backups')}
            className={`
              whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'backups'
                ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-300'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-500'
              }
            `}
          >
            Existing Backups
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`
              whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'create'
                ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-300'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-500'
              }
            `}
          >
            Create Backup
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`
              whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'import'
                ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-300'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-500'
              }
            `}
          >
            Import/Export
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'backups' && (
          <div className="space-y-6">
            <BackupList
              onRestoreRequested={handleRestoreRequested}
              className="border border-gray-200 dark:border-gray-700 rounded-lg"
            />

            <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleBulkDeleteRequested}
                disabled={loading}
                className={`
                  text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300
                  ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                Delete Old Backups
              </button>
            </div>
          </div>
        )}

        {activeTab === 'create' && (
          <CreateBackupForm />
        )}

        {activeTab === 'import' && (
          <ImportExportPanel />
        )}
      </div>

      {/* Operation Result Notification */}
      {operationResult && (
        <div className={`fixed top-4 right-4 z-50 rounded-md p-4 max-w-sm shadow-lg ${operationResult.success
          ? 'bg-green-50 border border-green-200 dark:bg-green-900 dark:border-green-800'
          : 'bg-red-50 border border-red-200 dark:bg-red-900 dark:border-red-800'
          }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {operationResult.success ? (
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${operationResult.success
                ? 'text-green-800 dark:text-green-200'
                : 'text-red-800 dark:text-red-200'
                }`}>
                {operationResult.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75 dark:bg-gray-800 dark:opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${showConfirmDialog.type === 'restore'
                    ? 'bg-blue-100 dark:bg-blue-900'
                    : 'bg-red-100 dark:bg-red-900'
                    } sm:mx-0 sm:h-10 sm:w-10`}>
                    {showConfirmDialog.type === 'restore' ? (
                      <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    ) : (
                      <svg className="h-6 w-6 text-red-600 dark:text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    )}
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                      {showConfirmDialog.type === 'restore' && 'Restore Backup'}
                      {showConfirmDialog.type === 'delete' && 'Delete Backup'}
                      {showConfirmDialog.type === 'bulk-delete' && 'Delete Old Backups'}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {showConfirmDialog.type === 'restore' &&
                          `Are you sure you want to restore "${showConfirmDialog.name}"? This will overwrite your current settings.`}
                        {showConfirmDialog.type === 'delete' &&
                          `Are you sure you want to delete "${showConfirmDialog.name}"? This action cannot be undone.`}
                        {showConfirmDialog.type === 'bulk-delete' &&
                          `Are you sure you want to delete backups older than ${showConfirmDialog.days} days? This action cannot be undone.`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={confirmOperation}
                  disabled={loading}
                  className={`
                    w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white
                    ${showConfirmDialog.type === 'restore'
                      ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600'
                      : 'bg-red-600 hover:bg-red-700 focus:ring-red-500 dark:bg-red-500 dark:hover:bg-red-600'
                    }
                    focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm
                    ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {loading ? 'Processing...' :
                    (showConfirmDialog.type === 'restore' ? 'Restore' :
                      showConfirmDialog.type === 'delete' ? 'Delete' : 'Delete Old')}
                </button>
                <button
                  type="button"
                  onClick={cancelOperation}
                  disabled={loading}
                  className={`
                    mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-600 text-base font-medium text-gray-700 dark:text-gray-200
                    hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                    sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm
                    ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupManagement;
