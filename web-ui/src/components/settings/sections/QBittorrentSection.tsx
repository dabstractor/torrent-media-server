import React from 'react';
import { NumberInput, ToggleSwitch, TimeScheduler } from '../inputs';
import type { AppSettings } from '@/lib/types/settings';

export interface QBittorrentSectionProps {
  settings: AppSettings;
  onSettingsChange: (settings: Partial<AppSettings>) => void;
  isLoading?: boolean;
  errors?: Record<string, string>;
  onTestConnection?: () => void;
  isTesting?: boolean;
  testResult?: { success: boolean; message: string } | null;
}

const QBittorrentSection: React.FC<QBittorrentSectionProps> = ({
  settings,
  onSettingsChange,
  isLoading = false,
  errors = {},
  onTestConnection,
  isTesting = false,
  testResult = null,
}) => {
  const handleQBittorrentUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({
      qbittorrent: {
        ...settings.qbittorrent,
        url: e.target.value,
      },
    });
  };

  const handleQBittorrentAuthChange = (field: 'username' | 'password', value: string) => {
    onSettingsChange({
      qbittorrent: {
        ...settings.qbittorrent,
        [field]: value,
      },
    });
  };

  const handleSchedulerChange = (
    enabled: boolean,
    fromHour: number,
    fromMin: number,
    toHour: number,
    toMin: number,
    days: number
  ) => {
    onSettingsChange({
      qbittorrent: {
        ...settings.qbittorrent,
        scheduler: {
          ...settings.qbittorrent?.scheduler,
          enabled,
          fromHour,
          fromMin,
          toHour,
          toMin,
          days,
        },
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          qBittorrent Integration
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Configure connection to your qBittorrent WebUI for seamless integration and synchronization.
        </p>
      </div>

      {/* Connection Settings */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
          Connection Settings
        </h4>
        
        <div className="space-y-4">
          {/* qBittorrent URL */}
          <div className="space-y-1">
            <label 
              htmlFor="qbittorrent-url" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              qBittorrent WebUI URL
            </label>
            <input
              id="qbittorrent-url"
              type="text"
              value={settings.qbittorrent.url}
              onChange={handleQBittorrentUrlChange}
              placeholder="http://localhost:8080"
              disabled={isLoading}
              className={`
                input w-full
                ${errors['qbittorrent.url'] 
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
            {errors['qbittorrent.url'] ? (
              <p className="text-xs text-red-600 dark:text-red-400">
                {errors['qbittorrent.url']}
              </p>
            ) : (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Full URL to your qBittorrent WebUI (including http:// or https://)
              </p>
            )}
          </div>

          {/* Authentication */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label 
                htmlFor="qbittorrent-username" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Username
              </label>
              <input
                id="qbittorrent-username"
                type="text"
                value={settings.qbittorrent.username}
                onChange={(e) => handleQBittorrentAuthChange('username', e.target.value)}
                placeholder="admin"
                disabled={isLoading}
                className={`
                  input w-full
                  ${errors['qbittorrent.username'] 
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
              {errors['qbittorrent.username'] && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {errors['qbittorrent.username']}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label 
                htmlFor="qbittorrent-password" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Password
              </label>
              <input
                id="qbittorrent-password"
                type="password"
                value={settings.qbittorrent.password}
                onChange={(e) => handleQBittorrentAuthChange('password', e.target.value)}
                placeholder="adminadmin"
                disabled={isLoading}
                className={`
                  input w-full
                  ${errors['qbittorrent.password'] 
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
              {errors['qbittorrent.password'] && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {errors['qbittorrent.password']}
                </p>
              )}
            </div>
          </div>

          {/* Test Connection Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onTestConnection}
              disabled={isLoading || isTesting}
              className={`
                btn btn-secondary
                ${isLoading || isTesting 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                }
              `}
            >
              {isTesting ? 'Testing Connection...' : 'Test Connection'}
            </button>
            
            {testResult && (
              <div className={`mt-2 p-3 rounded-md text-sm ${
                testResult.success 
                  ? 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-200 border border-green-200 dark:border-green-800' 
                  : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}>
                {testResult.message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Synchronization Settings */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
          Synchronization
        </h4>
        
        <div className="space-y-4">
          <ToggleSwitch
            id="qbittorrent-sync-enabled"
            label="Enable Bidirectional Sync"
            checked={settings.qbittorrent.syncEnabled}
            onChange={(checked) => onSettingsChange({ 
              qbittorrent: { ...settings.qbittorrent, syncEnabled: checked } 
            })}
            disabled={isLoading}
            description="Synchronize settings between this application and qBittorrent"
            error={errors['qbittorrent.syncEnabled']}
          />

          <NumberInput
            id="qbittorrent-sync-interval"
            label="Sync Interval"
            value={settings.qbittorrent.syncInterval}
            onChange={(value) => onSettingsChange({ 
              qbittorrent: { ...settings.qbittorrent, syncInterval: value } 
            })}
            min={30}
            max={3600}
            unit="seconds"
            disabled={isLoading || !settings.qbittorrent.syncEnabled}
            description="How often to synchronize settings (minimum 30 seconds)"
            error={errors['qbittorrent.syncInterval']}
            className={settings.qbittorrent.syncEnabled ? '' : 'opacity-50'}
          />
        </div>
      </div>

      {/* Scheduler Settings */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
          Bandwidth Scheduler
        </h4>
        
        <TimeScheduler
          id="qbittorrent-scheduler"
          label="Enable Scheduled Bandwidth Limits"
          enabled={settings.qbittorrent?.scheduler?.enabled ?? false}
          onEnabledChange={(enabled) => handleSchedulerChange(
            enabled,
            settings.qbittorrent?.scheduler?.fromHour ?? 8,
            settings.qbittorrent?.scheduler?.fromMin ?? 0,
            settings.qbittorrent?.scheduler?.toHour ?? 20,
            settings.qbittorrent?.scheduler?.toMin ?? 0,
            settings.qbittorrent?.scheduler?.days ?? 127
          )}
          fromHour={settings.qbittorrent?.scheduler?.fromHour ?? 8}
          fromMin={settings.qbittorrent?.scheduler?.fromMin ?? 0}
          toHour={settings.qbittorrent?.scheduler?.toHour ?? 20}
          toMin={settings.qbittorrent?.scheduler?.toMin ?? 0}
          days={settings.qbittorrent?.scheduler?.days ?? 127}
          onTimeChange={(fromHour, fromMin, toHour, toMin) => handleSchedulerChange(
            settings.qbittorrent?.scheduler?.enabled ?? false,
            fromHour,
            fromMin,
            toHour,
            toMin,
            settings.qbittorrent?.scheduler?.days ?? 127
          )}
          onDaysChange={(days) => handleSchedulerChange(
            settings.qbittorrent?.scheduler?.enabled ?? false,
            settings.qbittorrent?.scheduler?.fromHour ?? 8,
            settings.qbittorrent?.scheduler?.fromMin ?? 0,
            settings.qbittorrent?.scheduler?.toHour ?? 20,
            settings.qbittorrent?.scheduler?.toMin ?? 0,
            days
          )}
          disabled={isLoading}
          description="Automatically switch to alternative bandwidth limits during specified times"
          error={errors['qbittorrent.scheduler']}
        />
      </div>

      {/* Advanced Settings */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
          Advanced Options
        </h4>
        
        <div className="space-y-4">
          <ToggleSwitch
            id="qbittorrent-auto-login"
            label="Auto-login on Startup"
            checked={settings.qbittorrent.autoLogin}
            onChange={(checked) => onSettingsChange({ 
              qbittorrent: { ...settings.qbittorrent, autoLogin: checked } 
            })}
            disabled={isLoading}
            description="Automatically login to qBittorrent on application startup"
            error={errors['qbittorrent.autoLogin']}
          />

          <ToggleSwitch
            id="qbittorrent-trust-certs"
            label="Trust Self-Signed Certificates"
            checked={settings.qbittorrent.trustSelfSignedCerts}
            onChange={(checked) => onSettingsChange({ 
              qbittorrent: { ...settings.qbittorrent, trustSelfSignedCerts: checked } 
            })}
            disabled={isLoading}
            description="Trust self-signed SSL certificates (use with caution)"
            error={errors['qbittorrent.trustSelfSignedCerts']}
          />
        </div>
      </div>
    </div>
  );
};

export default QBittorrentSection;