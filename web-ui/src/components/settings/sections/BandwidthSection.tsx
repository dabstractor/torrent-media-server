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
            value={settings.bandwidth.maxDownloadRate}
            onChange={(value) => onSettingsChange({
              bandwidth: { ...settings.bandwidth, maxDownloadRate: value }
            })}
            min={0}
            unit="KB/s"
            disabled={isLoading}
            description="0 = unlimited"
            error={errors['bandwidth.maxDownloadRate']}
          />

          <NumberInput
            id="max-upload-rate"
            label="Maximum Upload Rate"
            value={settings.bandwidth.maxUploadRate}
            onChange={(value) => onSettingsChange({
              bandwidth: { ...settings.bandwidth, maxUploadRate: value }
            })}
            min={0}
            unit="KB/s"
            disabled={isLoading}
            description="0 = unlimited"
            error={errors['bandwidth.maxUploadRate']}
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
          checked={settings.bandwidth.alternativeRateEnabled}
          onChange={(checked) => onSettingsChange({
            bandwidth: { ...settings.bandwidth, alternativeRateEnabled: checked }
          })}
          disabled={isLoading}
          description="Use different rate limits during scheduled times"
          error={errors['bandwidth.alternativeRateEnabled']}
        />

        {settings.bandwidth.alternativeRateEnabled && (
          <div className="ml-4 mt-4 space-y-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <NumberInput
                id="alt-max-download-rate"
                label="Alternative Download Rate"
                value={settings.bandwidth.alternativeMaxDownloadRate}
                onChange={(value) => onSettingsChange({
                  bandwidth: { ...settings.bandwidth, alternativeMaxDownloadRate: value }
                })}
                min={0}
                unit="KB/s"
                disabled={isLoading}
                description="0 = unlimited"
                error={errors['bandwidth.alternativeMaxDownloadRate']}
              />

              <NumberInput
                id="alt-max-upload-rate"
                label="Alternative Upload Rate"
                value={settings.bandwidth.alternativeMaxUploadRate}
                onChange={(value) => onSettingsChange({
                  bandwidth: { ...settings.bandwidth, alternativeMaxUploadRate: value }
                })}
                min={0}
                unit="KB/s"
                disabled={isLoading}
                description="0 = unlimited"
                error={errors['bandwidth.alternativeMaxUploadRate']}
              />
            </div>
          </div>
        )}
      </div>

      {/* Connection Settings */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
          Connection Settings
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <NumberInput
            id="max-connections"
            label="Maximum Connections"
            value={settings.bandwidth.maxConnections}
            onChange={(value) => onSettingsChange({
              bandwidth: { ...settings.bandwidth, maxConnections: value }
            })}
            min={1}
            max={10000}
            disabled={isLoading}
            description="Global maximum number of connections"
            error={errors['bandwidth.maxConnections']}
          />

          <NumberInput
            id="max-connections-per-torrent"
            label="Connections per Torrent"
            value={settings.bandwidth.maxConnectionsPerTorrent}
            onChange={(value) => onSettingsChange({
              bandwidth: { ...settings.bandwidth, maxConnectionsPerTorrent: value }
            })}
            min={1}
            max={1000}
            disabled={isLoading}
            description="Maximum connections per individual torrent"
            error={errors['bandwidth.maxConnectionsPerTorrent']}
          />

          <NumberInput
            id="max-uploads"
            label="Maximum Upload Slots"
            value={settings.bandwidth.maxUploads}
            onChange={(value) => onSettingsChange({
              bandwidth: { ...settings.bandwidth, maxUploads: value }
            })}
            min={1}
            max={1000}
            disabled={isLoading}
            description="Global maximum number of upload slots"
            error={errors['bandwidth.maxUploads']}
          />

          <NumberInput
            id="max-uploads-per-torrent"
            label="Upload Slots per Torrent"
            value={settings.bandwidth.maxUploadsPerTorrent}
            onChange={(value) => onSettingsChange({
              bandwidth: { ...settings.bandwidth, maxUploadsPerTorrent: value }
            })}
            min={1}
            max={100}
            disabled={isLoading}
            description="Maximum upload slots per individual torrent"
            error={errors['bandwidth.maxUploadsPerTorrent']}
          />
        </div>
      </div>

      {/* Advanced Bandwidth Options */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
          Advanced Options
        </h4>

        <div className="space-y-4">
          <ToggleSwitch
            id="rate-limit-utp"
            label="Apply Rate Limit to µTP"
            checked={settings.bandwidth.rateLimitUtp}
            onChange={(checked) => onSettingsChange({
              bandwidth: { ...settings.bandwidth, rateLimitUtp: checked }
            })}
            disabled={isLoading}
            description="Apply rate limits to µTP protocol connections"
            error={errors['bandwidth.rateLimitUtp']}
          />

          <ToggleSwitch
            id="rate-limit-tcp"
            label="Apply Rate Limit to TCP"
            checked={settings.bandwidth.rateLimitTcp}
            onChange={(checked) => onSettingsChange({
              bandwidth: { ...settings.bandwidth, rateLimitTcp: checked }
            })}
            disabled={isLoading}
            description="Apply rate limits to TCP protocol connections"
            error={errors['bandwidth.rateLimitTcp']}
          />
        </div>
      </div>
    </div>
  );
};

export default BandwidthSection;
