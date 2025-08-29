"use client";
import React, { useState } from 'react';
import { format } from 'date-fns';
import type { BackupMetadata } from '@/lib/types/settings';
import { useBackupManagement } from '@/hooks/use-backup-management';

export interface BackupListProps {
  onBackupSelected?: (backup: BackupMetadata) => void;
  onRestoreRequested?: (backupId: string) => void;
  className?: string;
}

const BackupList: React.FC<BackupListProps> = ({
  onBackupSelected,
  onRestoreRequested,
  className = '',
}) => {
  const { backups, loading, error, refreshBackups } = useBackupManagement();
  const [selectedBackupId, setSelectedBackupId] = useState<string | null>(null);

  const handleBackupClick = (backup: BackupMetadata) => {
    setSelectedBackupId(backup.id);
    onBackupSelected?.(backup);
  };

  const handleRestoreClick = (e: React.MouseEvent, backupId: string) => {
    e.stopPropagation();
    onRestoreRequested?.(backupId);
  };

  if (loading && backups.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading backups...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 ${className}`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error loading backups</h3>
            <div className="mt-2 text-sm text-red-700 dark:text-red-300">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={refreshBackups}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-red-800 dark:text-red-100 dark:hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (backups.length === 0) {
    return (
      <div className={`text-center p-8 ${className}`}>
        <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No backups found</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Create your first backup to get started.
        </p>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden ${className}`}>
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {backups.map((backup) => (
          <li
            key={backup.id}
            className={`
              px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors duration-150
              ${selectedBackupId === backup.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''}
            `}
            onClick={() => handleBackupClick(backup)}
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center">
                  <svg className="flex-shrink-0 h-5 w-5 text-gray-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {backup.name}
                    </p>
                    {backup.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {backup.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    Created {format(new Date(backup.createdAt), 'MMM d, yyyy h:mm a')}
                  </span>
                  <span className="mx-2">•</span>
                  <span>
                    v{backup.version}
                  </span>
                  {backup.size && (
                    <>
                      <span className="mx-2">•</span>
                      <span>
                        {(backup.size / 1024).toFixed(1)} KB
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={(e) => handleRestoreClick(e, backup.id)}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-800 dark:text-blue-100 dark:hover:bg-blue-700"
                >
                  Restore
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BackupList;
