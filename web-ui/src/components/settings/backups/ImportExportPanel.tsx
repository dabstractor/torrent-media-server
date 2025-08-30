'use client';

import React, { useState, useRef } from 'react';
import { useBackupManagement } from '@/hooks/use-backup-management';

export interface ImportExportPanelProps {
  className?: string;
}

const ImportExportPanel: React.FC<ImportExportPanelProps> = ({
  className = '',
}) => {
  const { exportSettings, importSettings, loading, error } = useBackupManagement();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [importSuccess, setImportSuccess] = useState<boolean>(false);

  const handleExport = async () => {
    setExportSuccess(false);
    setImportError(null);

    const result = await exportSettings();

    if (result.success && result.data) {
      try {
        // Create a blob and download it
        const blob = new Blob([JSON.stringify(result.data, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `settings-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 3000);
      } catch (err) {
        setImportError('Failed to create download file');
      }
    } else {
      setImportError(result.error || 'Export failed');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportSuccess(false);
    setImportError(null);

    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setImportError('Please select a JSON file');
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const result = await importSettings(data, {
        overwrite: true,
        categories: undefined, // Import all categories
      });

      if (result.success) {
        setImportSuccess(true);
        setTimeout(() => setImportSuccess(false), 3000);
        // Clear the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setImportError(result.error || 'Import failed');
      }
    } catch (err) {
      setImportError('Invalid JSON file format');
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Import/Export Settings
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Export your current settings or import settings from a file.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Section */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <svg className="h-5 w-5 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">
              Export Settings
            </h4>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Download a JSON file containing all your current settings.
          </p>
          <button
            type="button"
            onClick={handleExport}
            disabled={loading}
            className={`
              btn btn-secondary w-full
              ${loading
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-gray-200 dark:hover:bg-gray-600'
              }
            `}
          >
            {loading ? 'Exporting...' : 'Export Settings'}
          </button>
          {exportSuccess && (
            <div className="mt-3 p-2 rounded-md bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-800">
              <p className="text-xs text-green-800 dark:text-green-200">
                Settings exported successfully!
              </p>
            </div>
          )}
        </div>

        {/* Import Section */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">
              Import Settings
            </h4>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Upload a JSON file to restore your settings.
          </p>
          <button
            type="button"
            onClick={handleImportClick}
            disabled={loading}
            className={`
              btn btn-secondary w-full
              ${loading
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-gray-200 dark:hover:bg-gray-600'
              }
            `}
          >
            {loading ? 'Importing...' : 'Import Settings'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
            disabled={loading}
          />
        </div>
      </div>

      {/* Error Display */}
      {(error || importError) && (
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
                <p>{error || importError}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Display */}
      {importSuccess && (
        <div className="rounded-md bg-green-50 dark:bg-green-900 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-200">Success</h3>
              <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                <p>Settings imported successfully!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        <p>
          <strong>Note:</strong> Importing settings will overwrite your current configuration.
          Consider creating a backup before importing.
        </p>
      </div>
    </div>
  );
};

export default ImportExportPanel;