'use client';

import React, { useState } from 'react';
import { useBackupManagement } from '@/hooks/use-backup-management';

export interface CreateBackupFormProps {
  onBackupCreated?: () => void;
  className?: string;
}

const CreateBackupForm: React.FC<CreateBackupFormProps> = ({
  onBackupCreated,
  className = '',
}) => {
  const { createBackup, loading, error } = useBackupManagement();
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      return;
    }

    const result = await createBackup(name.trim(), description.trim() || undefined);

    if (result.success) {
      setName('');
      setDescription('');
      onBackupCreated?.();
    }
  };

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="backup-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Backup Name
          </label>
          <input
            id="backup-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Settings Backup"
            disabled={loading}
            className={`
              input w-full mt-1
              ${loading
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500'
                : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
              }
              block border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              dark:focus:ring-blue-500 dark:focus:border-blue-500
              transition-colors duration-200
            `}
            required
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            A descriptive name for your backup
          </p>
        </div>

        <div>
          <label htmlFor="backup-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </label>
          <textarea
            id="backup-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description of what this backup contains..."
            rows={3}
            disabled={loading}
            className={`
              input w-full mt-1
              ${loading
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500'
                : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
              }
              block border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              dark:focus:ring-blue-500 dark:focus:border-blue-500
              transition-colors duration-200
            `}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Optional notes about this backup
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className={`
              btn btn-primary
              ${loading || !name.trim()
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-blue-700 dark:hover:bg-blue-600'
              }
            `}
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </span>
            ) : (
              'Create Backup'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateBackupForm;