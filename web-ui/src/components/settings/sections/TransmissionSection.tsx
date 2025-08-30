import React from 'react';
import { NumberInput, ToggleSwitch, TimeScheduler } from '../inputs';
import type { AppSettings } from '@/lib/types/settings';

export interface TransmissionSectionProps {
  settings: AppSettings;
  onSettingsChange: (settings: Partial<AppSettings>) => void;
  isLoading?: boolean;
  errors?: Record<string, string>;
  onTestConnection?: () => void;
  isTesting?: boolean;
  testResult?: { success: boolean; message: string } | null;
}

const TransmissionSection: React.FC<TransmissionSectionProps> = ({
  settings,
  onSettingsChange,
  isLoading = false,
  errors = {},
  onTestConnection,
  isTesting = false,
  testResult = null,
}) => {
  const handleTransmissionUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({
      transmission: {
        ...settings.transmission,
        url: e.target.value,
      },
    });
  };

  const handleTransmissionAuthChange = (field: 'username' | 'password', value: string) => {
    onSettingsChange({
      transmission: {
        ...settings.transmission,
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
      transmission: {
        ...settings.transmission,
        scheduler: {
          ...settings.transmission?.scheduler,
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
          Transmission Integration
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Configure connection to your Transmission daemon for seamless integration and synchronization.
        </p>
      </div>

      {/* Connection Settings */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
          Connection Settings
        </h4>
        
        <div className="space-y-4">
          {/* Transmission URL */}
          <div className="space-y-1">
            <label 
              htmlFor="transmission-url" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Transmission RPC URL
            </label>
            <input
              id="transmission-url"
              type="text"
              value={settings.transmission.url}
              onChange={handleTransmissionUrlChange}
              placeholder="http://localhost:9091"
              disabled={isLoading}
              className={`
                input w-full
                ${errors['transmission.url'] 
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
            {errors['transmission.url'] ? (
              <p className="text-xs text-red-600 dark:text-red-400">
                {errors['transmission.url']}
              </p>
            ) : (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Full URL to your Transmission daemon RPC endpoint (including http:// or https://)
              </p>
            )}
          </div>

          {/* Authentication */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label 
                htmlFor="transmission-username" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Username
              </label>
              <input
                id="transmission-username"
                type="text"
                value={settings.transmission.username}
                onChange={(e) => handleTransmissionAuthChange('username', e.target.value)}
                placeholder="admin"
                disabled={isLoading}
                className={`
                  input w-full
                  ${errors['transmission.username'] 
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
              {errors['transmission.username'] && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {errors['transmission.username']}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label 
                htmlFor="transmission-password" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Password
              </label>
              <input
                id="transmission-password"
                type="password"
                value={settings.transmission.password}
                onChange={(e) => handleTransmissionAuthChange('password', e.target.value)}
                placeholder="adminpass123"
                disabled={isLoading}
                className={`
                  input w-full
                  ${errors['transmission.password'] 
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
              {errors['transmission.password'] && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {errors['transmission.password']}
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
            id="transmission-sync-enabled"
            label="Enable Bidirectional Sync"
            checked={settings.transmission.syncEnabled}
            onChange={(checked) => onSettingsChange({ 
              transmission: { ...settings.transmission, syncEnabled: checked } 
            })}
            disabled={isLoading}
            description="Synchronize settings between this application and Transmission"
            error={errors['transmission.syncEnabled']}
          />

          <NumberInput
            id="transmission-sync-interval"
            label="Sync Interval"
            value={settings.transmission.syncInterval}
            onChange={(value) => onSettingsChange({ 
              transmission: { ...settings.transmission, syncInterval: value } 
            })}
            min={30}
            max={3600}
            unit="seconds"
            disabled={isLoading || !settings.transmission.syncEnabled}
            description="How often to synchronize settings (minimum 30 seconds)"
            error={errors['transmission.syncInterval']}
            className={settings.transmission.syncEnabled ? '' : 'opacity-50'}
          />
        </div>
      </div>

      {/* Scheduler Settings */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
          Bandwidth Scheduler
        </h4>
        
        <TimeScheduler
          id="transmission-scheduler"
          label="Enable Scheduled Bandwidth Limits"
          enabled={settings.transmission?.scheduler?.enabled ?? false}
          onEnabledChange={(enabled) => handleSchedulerChange(
            enabled,
            settings.transmission?.scheduler?.fromHour ?? 8,
            settings.transmission?.scheduler?.fromMin ?? 0,
            settings.transmission?.scheduler?.toHour ?? 20,
            settings.transmission?.scheduler?.toMin ?? 0,
            settings.transmission?.scheduler?.days ?? 127
          )}
          fromHour={settings.transmission?.scheduler?.fromHour ?? 8}
          fromMin={settings.transmission?.scheduler?.fromMin ?? 0}
          toHour={settings.transmission?.scheduler?.toHour ?? 20}
          toMin={settings.transmission?.scheduler?.toMin ?? 0}
          days={settings.transmission?.scheduler?.days ?? 127}
          onTimeChange={(fromHour, fromMin, toHour, toMin) => handleSchedulerChange(
            settings.transmission?.scheduler?.enabled ?? false,
            fromHour,
            fromMin,
            toHour,
            toMin,
            settings.transmission?.scheduler?.days ?? 127
          )}
          onDaysChange={(days) => handleSchedulerChange(
            settings.transmission?.scheduler?.enabled ?? false,
            settings.transmission?.scheduler?.fromHour ?? 8,
            settings.transmission?.scheduler?.fromMin ?? 0,
            settings.transmission?.scheduler?.toHour ?? 20,
            settings.transmission?.scheduler?.toMin ?? 0,
            days
          )}
          disabled={isLoading}
          description="Automatically switch to alternative bandwidth limits during specified times"
          error={errors['transmission.scheduler']}
        />
      </div>

      {/* Advanced Settings */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
          Advanced Options
        </h4>
        
        <div className="space-y-4">
          <ToggleSwitch
            id="transmission-auto-login"
            label="Auto-login on Startup"
            checked={settings.transmission.autoLogin}
            onChange={(checked) => onSettingsChange({ 
              transmission: { ...settings.transmission, autoLogin: checked } 
            })}
            disabled={isLoading}
            description="Automatically authenticate with Transmission on application startup"
            error={errors['transmission.autoLogin']}
          />

          <ToggleSwitch
            id="transmission-trust-certs"
            label="Trust Self-Signed Certificates"
            checked={settings.transmission.trustSelfSignedCerts}
            onChange={(checked) => onSettingsChange({ 
              transmission: { ...settings.transmission, trustSelfSignedCerts: checked } 
            })}
            disabled={isLoading}
            description="Trust self-signed SSL certificates (use with caution)"
            error={errors['transmission.trustSelfSignedCerts']}
          />
        </div>
      </div>

      {/* Information Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Transmission Integration
              </h4>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <p>
                  This integration uses Transmission&apos;s JSON-RPC API to synchronize bandwidth settings,
                  scheduler configuration, and download preferences. Ensure your Transmission daemon
                  is configured to accept RPC connections.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransmissionSection;