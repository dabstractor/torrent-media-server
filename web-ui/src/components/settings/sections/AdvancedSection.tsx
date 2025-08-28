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
            value={settings.advanced.cacheSize}
            onChange={(value) => onSettingsChange({ 
              advanced: { ...settings.advanced, cacheSize: value } 
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
            checked={settings.advanced.enableLogging}
            onChange={(checked) => onSettingsChange({ 
              advanced: { ...settings.advanced, enableLogging: checked } 
            })}
            disabled={isLoading}
            description="Enable verbose logging for debugging purposes"
            error={errors['advanced.enableLogging']}
          />

          <NumberInput
            id="log-retention"
            label="Log Retention"
            value={settings.advanced.logRetentionDays}
            onChange={(value) => onSettingsChange({ 
              advanced: { ...settings.advanced, logRetentionDays: value } 
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
            checked={settings.advanced.requireHttps}
            onChange={(checked) => onSettingsChange({ 
              advanced: { ...settings.advanced, requireHttps: checked } 
            })}
            disabled={isLoading}
            description="Require HTTPS for all connections"
            error={errors['advanced.requireHttps']}
          />

          <ToggleSwitch
            id="enable-csrf-protection"
            label="Enable CSRF Protection"
            checked={settings.advanced.csrfProtection}
            onChange={(checked) => onSettingsChange({ 
              advanced: { ...settings.advanced, csrfProtection: checked } 
            })}
            disabled={isLoading}
            description="Enable Cross-Site Request Forgery protection"
            error={errors['advanced.csrfProtection']}
          />

          <NumberInput
            id="session-timeout"
            label="Session Timeout"
            value={settings.advanced.sessionTimeout}
            onChange={(value) => onSettingsChange({ 
              advanced: { ...settings.advanced, sessionTimeout: value } 
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
            checked={settings.advanced.databaseWalMode}
            onChange={(checked) => onSettingsChange({ 
              advanced: { ...settings.advanced, databaseWalMode: checked } 
            })}
            disabled={isLoading}
            description="Enable Write-Ahead Logging for better concurrency"
            error={errors['advanced.databaseWalMode']}
          />

          <NumberInput
            id="database-cache-size"
            label="Database Cache Size"
            value={settings.advanced.databaseCacheSize}
            onChange={(value) => onSettingsChange({ 
              advanced: { ...settings.advanced, databaseCacheSize: value } 
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
            checked={settings.advanced.backupCompression}
            onChange={(checked) => onSettingsChange({ 
              advanced: { ...settings.advanced, backupCompression: checked } 
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
            value={settings.advanced.apiTimeout}
            onChange={(value) => onSettingsChange({ 
              advanced: { ...settings.advanced, apiTimeout: value } 
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
            value={settings.advanced.maxRetryAttempts}
            onChange={(value) => onSettingsChange({ 
              advanced: { ...settings.advanced, maxRetryAttempts: value } 
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
            checked={settings.advanced.apiRateLimiting}
            onChange={(checked) => onSettingsChange({ 
              advanced: { ...settings.advanced, apiRateLimiting: checked } 
            })}
            disabled={isLoading}
            description="Limit API requests to prevent abuse"
            error={errors['advanced.apiRateLimiting']}
          />

          {settings.advanced.apiRateLimiting && (
            <div className="ml-4 space-y-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
              <NumberInput
                id="rate-limit-requests"
                label="Requests per Window"
                value={settings.advanced.rateLimitRequests}
                onChange={(value) => onSettingsChange({ 
                  advanced: { ...settings.advanced, rateLimitRequests: value } 
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
                value={settings.advanced.rateLimitWindow}
                onChange={(value) => onSettingsChange({ 
                  advanced: { ...settings.advanced, rateLimitWindow: value } 
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
            checked={settings.advanced.experimentalFeatures}
            onChange={(checked) => onSettingsChange({ 
              advanced: { ...settings.advanced, experimentalFeatures: checked } 
            })}
            disabled={isLoading}
            description="Enable access to experimental and unstable features"
            error={errors['advanced.experimentalFeatures']}
          />

          <ToggleSwitch
            id="enable-beta-updates"
            label="Enable Beta Updates"
            checked={settings.advanced.betaUpdates}
            onChange={(checked) => onSettingsChange({ 
              advanced: { ...settings.advanced, betaUpdates: checked } 
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