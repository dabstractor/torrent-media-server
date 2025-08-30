import React from 'react';
import { NumberInput, ToggleSwitch } from '../inputs';
import type { AppSettings } from '@/lib/types/settings';

export interface BandwidthSectionProps {
  settings: AppSettings;
  onSettingsChange: (settings: Partial<AppSettings>) => void;
  isLoading?: boolean;
  errors?: Record<string, string>;
}

const BandwidthSection: React.FC<BandwidthSectionProps> = ({
  settings,
  onSettingsChange,
  isLoading = false,
  errors = {},
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Bandwidth Settings
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Configure global bandwidth limits and rate control for optimal performance.
        </p>
      </div>

      {/* Global Rate Limits */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
          Global Rate Limits
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <NumberInput
            id="max-download-rate"
            label="Maximum Download Rate"
            value={settings.maxDownloadSpeed}
            onChange={(value) => onSettingsChange({
              maxDownloadSpeed: value
            })}
            min={0}
            unit="KB/s"
            disabled={isLoading}
            description="0 = unlimited"
            error={errors['maxDownloadSpeed']}
          />

          <NumberInput
            id="max-upload-rate"
            label="Maximum Upload Rate"
            value={settings.maxUploadSpeed}
            onChange={(value) => onSettingsChange({
              maxUploadSpeed: value
            })}
            min={0}
            unit="KB/s"
            disabled={isLoading}
            description="0 = unlimited"
            error={errors['maxUploadSpeed']}
          />
        </div>
      </div>

      {/* Alternative Rate Limits */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
          Alternative Rate Limits
        </h4>

        <ToggleSwitch
          id="alt-rate-enabled"
          label="Enable Alternative Rate Limits"
          checked={settings.altSpeedEnabled}
          onChange={(checked) => onSettingsChange({
            altSpeedEnabled: checked
          })}
          disabled={isLoading}
          description="Use different rate limits during scheduled times"
          error={errors['altSpeedEnabled']}
        />

        {settings.altSpeedEnabled && (
          <div className="ml-4 mt-4 space-y-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <NumberInput
                id="alt-max-download-rate"
                label="Alternative Download Rate"
                value={settings.altDownloadSpeed}
                onChange={(value) => onSettingsChange({
                  altDownloadSpeed: value
                })}
                min={0}
                unit="KB/s"
                disabled={isLoading}
                description="0 = unlimited"
                error={errors['altDownloadSpeed']}
              />

              <NumberInput
                id="alt-max-upload-rate"
                label="Alternative Upload Rate"
                value={settings.altUploadSpeed}
                onChange={(value) => onSettingsChange({
                  altUploadSpeed: value
                })}
                min={0}
                unit="KB/s"
                disabled={isLoading}
                description="0 = unlimited"
                error={errors['altUploadSpeed']}
              />
            </div>
          </div>
        )}
      </div>

      {/* TODO: Connection Settings - Need to define proper settings structure
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
          Connection Settings
        </h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Connection settings will be available in a future update.
        </p>
      </div>
      */}
    </div>
  );
};

export default BandwidthSection;
