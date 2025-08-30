import React from 'react';
import { NumberInput, ToggleSwitch } from '../inputs';
import type { AppSettings } from '@/lib/types/settings';

export interface AdvancedSectionProps {
  settings: AppSettings;
  onSettingsChange: (settings: Partial<AppSettings>) => void;
  isLoading?: boolean;
  errors?: Record<string, string>;
}

const AdvancedSection: React.FC<AdvancedSectionProps> = ({
  settings,
  onSettingsChange,
  isLoading = false,
  errors = {},
}) => {
  // Defensive check for advancedSettings - provide defaults if missing
  const advancedSettings = settings.advanced || {
    cacheSize: 64,
    enableLogging: false,
    logRetentionDays: 7,
    requireHttps: false,
    csrfProtection: true,
    sessionTimeout: 30,
    databaseWalMode: false,
    databaseCacheSize: 2000,
    backupCompression: true,
    apiTimeout: 30,
    maxRetryAttempts: 3,
    apiRateLimiting: false,
    rateLimitRequests: 100,
    rateLimitWindow: 60,
    experimentalFeatures: false,
    betaUpdates: false,
  };

  if (!advancedSettings) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Advanced Settings
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Advanced settings are not available in the current configuration.
          </p>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Advanced settings will be available in a future version of this application.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Advanced Settings
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Configure advanced application behavior and performance tuning options.
        </p>
      </div>

      {/* Performance Settings */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
          Performance
        </h4>
        
        <div className="space-y-4">
          <NumberInput
            id="cache-size"
            label="Cache Size"
            value={advancedSettings.cacheSize}
            onChange={(value) => onSettingsChange({ 
              advanced: { ...advancedSettings, cacheSize: value } 
            })}
            min={1}
            max={1024}
            unit="MB"
            disabled={isLoading}
            description="Memory cache size for improved performance"
            error={errors['advanced.cacheSize']}
          />

          <ToggleSwitch
            id="enable-logging"
            label="Enable Detailed Logging"
            checked={advancedSettings.enableLogging}
            onChange={(checked) => onSettingsChange({ 
              advanced: { ...advancedSettings, enableLogging: checked } 
            })}
            disabled={isLoading}
            description="Enable verbose logging for debugging purposes"
            error={errors['advanced.enableLogging']}
          />

          <NumberInput
            id="log-retention"
            label="Log Retention"
            value={advancedSettings.logRetentionDays}
            onChange={(value) => onSettingsChange({ 
              advanced: { ...advancedSettings, logRetentionDays: value } 
            })}
            min={1}
            max={365}
            unit="days"
            disabled={isLoading}
            description="Number of days to keep log files"
            error={errors['advanced.logRetentionDays']}
          />
        </div>
      </div>

      {/* Security Settings */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
          Security
        </h4>
        
        <div className="space-y-4">
          <ToggleSwitch
            id="require-https"
            label="Require HTTPS"
            checked={advancedSettings.requireHttps}
            onChange={(checked) => onSettingsChange({ 
              advanced: { ...advancedSettings, requireHttps: checked } 
            })}
            disabled={isLoading}
            description="Require HTTPS for all connections"
            error={errors['advanced.requireHttps']}
          />

          <ToggleSwitch
            id="enable-csrf-protection"
            label="Enable CSRF Protection"
            checked={advancedSettings.csrfProtection}
            onChange={(checked) => onSettingsChange({ 
              advanced: { ...advancedSettings, csrfProtection: checked } 
            })}
            disabled={isLoading}
            description="Enable Cross-Site Request Forgery protection"
            error={errors['advanced.csrfProtection']}
          />

          <NumberInput
            id="session-timeout"
            label="Session Timeout"
            value={advancedSettings.sessionTimeout}
            onChange={(value) => onSettingsChange({ 
              advanced: { ...advancedSettings, sessionTimeout: value } 
            })}
            min={1}
            max={1440}
            unit="minutes"
            disabled={isLoading}
            description="Automatic logout after inactivity"
            error={errors['advanced.sessionTimeout']}
          />
        </div>
      </div>

      {/* Database Settings */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
          Database
        </h4>
        
        <div className="space-y-4">
          <ToggleSwitch
            id="enable-wal-mode"
            label="Enable WAL Mode"
            checked={advancedSettings.databaseWalMode}
            onChange={(checked) => onSettingsChange({ 
              advanced: { ...advancedSettings, databaseWalMode: checked } 
            })}
            disabled={isLoading}
            description="Enable Write-Ahead Logging for better concurrency"
            error={errors['advanced.databaseWalMode']}
          />

          <NumberInput
            id="database-cache-size"
            label="Database Cache Size"
            value={advancedSettings.databaseCacheSize}
            onChange={(value) => onSettingsChange({ 
              advanced: { ...advancedSettings, databaseCacheSize: value } 
            })}
            min={1}
            max={1000}
            unit="pages"
            disabled={isLoading}
            description="SQLite database cache size in pages"
            error={errors['advanced.databaseCacheSize']}
          />

          <ToggleSwitch
            id="enable-backup-compression"
            label="Enable Backup Compression"
            checked={advancedSettings.backupCompression}
            onChange={(checked) => onSettingsChange({ 
              advanced: { ...advancedSettings, backupCompression: checked } 
            })}
            disabled={isLoading}
            description="Compress backup files to save disk space"
            error={errors['advanced.backupCompression']}
          />
        </div>
      </div>

      {/* API Settings */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
          API Configuration
        </h4>
        
        <div className="space-y-4">
          <NumberInput
            id="api-timeout"
            label="API Timeout"
            value={advancedSettings.apiTimeout}
            onChange={(value) => onSettingsChange({ 
              advanced: { ...advancedSettings, apiTimeout: value } 
            })}
            min={1}
            max={300}
            unit="seconds"
            disabled={isLoading}
            description="Timeout for external API requests"
            error={errors['advanced.apiTimeout']}
          />

          <NumberInput
            id="max-retry-attempts"
            label="Max Retry Attempts"
            value={advancedSettings.maxRetryAttempts}
            onChange={(value) => onSettingsChange({ 
              advanced: { ...advancedSettings, maxRetryAttempts: value } 
            })}
            min={0}
            max={10}
            disabled={isLoading}
            description="Maximum number of retry attempts for failed requests (0 = no retries)"
            error={errors['advanced.maxRetryAttempts']}
          />

          <ToggleSwitch
            id="enable-api-rate-limiting"
            label="Enable API Rate Limiting"
            checked={advancedSettings.apiRateLimiting}
            onChange={(checked) => onSettingsChange({ 
              advanced: { ...advancedSettings, apiRateLimiting: checked } 
            })}
            disabled={isLoading}
            description="Limit API requests to prevent abuse"
            error={errors['advanced.apiRateLimiting']}
          />

          {advancedSettings.apiRateLimiting && (
            <div className="ml-4 space-y-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
              <NumberInput
                id="rate-limit-requests"
                label="Requests per Window"
                value={advancedSettings.rateLimitRequests}
                onChange={(value) => onSettingsChange({ 
                  advanced: { ...advancedSettings, rateLimitRequests: value } 
                })}
                min={1}
                max={1000}
                disabled={isLoading}
                description="Maximum requests allowed per time window"
                error={errors['advanced.rateLimitRequests']}
              />

              <NumberInput
                id="rate-limit-window"
                label="Time Window"
                value={advancedSettings.rateLimitWindow}
                onChange={(value) => onSettingsChange({ 
                  advanced: { ...advancedSettings, rateLimitWindow: value } 
                })}
                min={1}
                max={3600}
                unit="seconds"
                disabled={isLoading}
                description="Time window for rate limiting"
                error={errors['advanced.rateLimitWindow']}
              />
            </div>
          )}
        </div>
      </div>

      {/* Experimental Features */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
          Experimental Features
        </h4>
        
        <div className="space-y-4">
          <ToggleSwitch
            id="enable-experimental-features"
            label="Enable Experimental Features"
            checked={advancedSettings.experimentalFeatures}
            onChange={(checked) => onSettingsChange({ 
              advanced: { ...advancedSettings, experimentalFeatures: checked } 
            })}
            disabled={isLoading}
            description="Enable access to experimental and unstable features"
            error={errors['advanced.experimentalFeatures']}
          />

          <ToggleSwitch
            id="enable-beta-updates"
            label="Enable Beta Updates"
            checked={advancedSettings.betaUpdates}
            onChange={(checked) => onSettingsChange({ 
              advanced: { ...advancedSettings, betaUpdates: checked } 
            })}
            disabled={isLoading}
            description="Receive beta versions with new features and fixes"
            error={errors['advanced.betaUpdates']}
          />
        </div>
      </div>
    </div>
  );
};

export default AdvancedSection;