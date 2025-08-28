import React from 'react';
import { NumberInput, ToggleSwitch } from '../inputs';
import type { AppSettings } from '@/lib/types/settings';

export interface DownloadSectionProps {
  settings: AppSettings;
  onSettingsChange: (settings: Partial<AppSettings>) => void;
  isLoading?: boolean;
  errors?: Record<string, string>;
}

const DownloadSection: React.FC<DownloadSectionProps> = ({
  settings,
  onSettingsChange,
  isLoading = false,
  errors = {},
}) => {
  const handlePathChange = (field: 'defaultDownloadPath' | 'completedTorrentPath', e: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({
      [field]: e.target.value,
    });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({
      defaultCategory: e.target.value,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Download Settings
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Configure download behavior, paths, and torrent management preferences.
        </p>
      </div>

      {/* Download Paths */}
      <div className="grid grid-cols-1 gap-6">
        {/* Default Download Path */}
        <div className="space-y-1">
          <label 
            htmlFor="download-path" 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Default Download Path
          </label>
          <input
            id="download-path"
            type="text"
            value={settings.defaultDownloadPath}
            onChange={(e) => handlePathChange('defaultDownloadPath', e)}
            placeholder="/downloads"
            disabled={isLoading}
            className={`
              input w-full
              ${errors.defaultDownloadPath 
                ? 'border-red-500 focus:border-red-500 focus:ring-red-200 dark:border-red-400' 
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200 dark:border-gray-600 dark:focus:border-blue-400'
              }
              ${isLoading 
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500' 
                : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
              }
              block border rounded-md px-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-opacity-50
              transition-colors duration-200
            `}
          />
          {errors.defaultDownloadPath ? (
            <p className="text-xs text-red-600 dark:text-red-400">
              {errors.defaultDownloadPath}
            </p>
          ) : (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Default directory for new downloads
            </p>
          )}
        </div>

        {/* Default Category */}
        <div className="space-y-1">
          <label 
            htmlFor="default-category" 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Default Category
          </label>
          <input
            id="default-category"
            type="text"
            value={settings.defaultCategory}
            onChange={handleCategoryChange}
            placeholder="General"
            disabled={isLoading}
            className={`
              input w-full
              ${errors.defaultCategory 
                ? 'border-red-500 focus:border-red-500 focus:ring-red-200 dark:border-red-400' 
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200 dark:border-gray-600 dark:focus:border-blue-400'
              }
              ${isLoading 
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500' 
                : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
              }
              block border rounded-md px-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-opacity-50
              transition-colors duration-200
            `}
          />
          {errors.defaultCategory ? (
            <p className="text-xs text-red-600 dark:text-red-400">
              {errors.defaultCategory}
            </p>
          ) : (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Default category for new torrents
            </p>
          )}
        </div>
      </div>

      {/* Download Behavior */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">
          Download Behavior
        </h4>

        <ToggleSwitch
          id="auto-start-torrents"
          label="Auto-start Torrents"
          checked={settings.autoStartTorrents}
          onChange={(checked) => onSettingsChange({ autoStartTorrents: checked })}
          disabled={isLoading}
          description="Automatically start downloading new torrents"
          error={errors.autoStartTorrents}
        />

        <NumberInput
          id="max-concurrent-downloads"
          label="Maximum Concurrent Downloads"
          value={settings.maxConcurrentDownloads}
          onChange={(value) => onSettingsChange({ maxConcurrentDownloads: value })}
          min={1}
          max={20}
          disabled={isLoading}
          description="Maximum number of torrents downloading simultaneously"
          error={errors.maxConcurrentDownloads}
        />
      </div>

      {/* Completion Settings */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">
          Completion Settings
        </h4>

        <ToggleSwitch
          id="delete-completed-torrents"
          label="Delete Completed Torrents"
          checked={settings.deleteCompletedTorrents}
          onChange={(checked) => onSettingsChange({ deleteCompletedTorrents: checked })}
          disabled={isLoading}
          description="Automatically remove torrents after completion"
          error={errors.deleteCompletedTorrents}
        />

        <ToggleSwitch
          id="move-torrent-on-completion"
          label="Move Files on Completion"
          checked={settings.moveTorrentOnCompletion}
          onChange={(checked) => onSettingsChange({ moveTorrentOnCompletion: checked })}
          disabled={isLoading}
          description="Move completed files to a different directory"
          error={errors.moveTorrentOnCompletion}
        />

        {settings.moveTorrentOnCompletion && (
          <div className="ml-4 space-y-1">
            <label 
              htmlFor="completed-torrent-path" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Completed Torrent Path
            </label>
            <input
              id="completed-torrent-path"
              type="text"
              value={settings.completedTorrentPath}
              onChange={(e) => handlePathChange('completedTorrentPath', e)}
              placeholder="/downloads/completed"
              disabled={isLoading}
              className={`
                input w-full
                ${errors.completedTorrentPath 
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-200 dark:border-red-400' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200 dark:border-gray-600 dark:focus:border-blue-400'
                }
                ${isLoading 
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500' 
                  : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                }
                block border rounded-md px-3 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-opacity-50
                transition-colors duration-200
              `}
            />
            {errors.completedTorrentPath ? (
              <p className="text-xs text-red-600 dark:text-red-400">
                {errors.completedTorrentPath}
              </p>
            ) : (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Directory where completed torrents will be moved
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DownloadSection;