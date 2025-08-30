import React from 'react';
import { ToggleSwitch } from '../inputs';
import type { AppSettings } from '@/lib/types/settings';

export interface GeneralSectionProps {
  settings: AppSettings;
  onSettingsChange: (settings: Partial<AppSettings>) => void;
  isLoading?: boolean;
  errors?: Record<string, string>;
}

const GeneralSection: React.FC<GeneralSectionProps> = ({
  settings,
  onSettingsChange,
  isLoading = false,
  errors = {},
}) => {
  // Defensive check for settings
  if (!settings || !settings.notifications) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            General Settings
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Loading settings...
          </p>
        </div>
      </div>
    );
  }
  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSettingsChange({
      theme: e.target.value as 'light' | 'dark' | 'system',
    });
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSettingsChange({
      language: e.target.value,
    });
  };

  const handleNotificationChange = (field: keyof AppSettings['notifications'], value: boolean) => {
    onSettingsChange({
      notifications: {
        ...settings.notifications,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          General Settings
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Configure general application preferences and behavior.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Theme Selection */}
        <div className="space-y-1">
          <label
            htmlFor="theme-select"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Theme
          </label>
          <select
            id="theme-select"
            value={settings.theme}
            onChange={handleThemeChange}
            disabled={isLoading}
            className={`
              input w-full
              ${errors.theme
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
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
          {errors.theme && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {errors.theme}
            </p>
          )}
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Choose your preferred color scheme
          </p>
        </div>

        {/* Language Selection */}
        <div className="space-y-1">
          <label
            htmlFor="language-select"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Language
          </label>
          <select
            id="language-select"
            value={settings.language}
            onChange={handleLanguageChange}
            disabled={isLoading}
            className={`
              input w-full
              ${errors.language
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
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="it">Italiano</option>
            <option value="pt">Português</option>
            <option value="ru">Русский</option>
            <option value="zh">中文</option>
            <option value="ja">日本語</option>
          </select>
          {errors.language && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {errors.language}
            </p>
          )}
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Select your preferred language
          </p>
        </div>
      </div>

      {/* Auto Update */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <ToggleSwitch
          id="auto-update"
          label="Automatic Updates"
          checked={settings.autoUpdate}
          onChange={(checked) => onSettingsChange({ autoUpdate: checked })}
          disabled={isLoading}
          description="Automatically check for and install application updates"
          error={errors.autoUpdate}
        />
      </div>

      {/* Notifications */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
          Notifications
        </h4>
        <div className="space-y-4">
          <ToggleSwitch
            id="notifications-enabled"
            label="Enable Notifications"
            checked={settings.notifications.enabled}
            onChange={(checked) => handleNotificationChange('enabled', checked)}
            disabled={isLoading}
            description="Enable desktop notifications for important events"
            error={errors['notifications.enabled']}
          />

          <div className="ml-4 space-y-3">
            <ToggleSwitch
              id="notifications-download-complete"
              label="Download Complete"
              checked={settings.notifications.downloadComplete}
              onChange={(checked) => handleNotificationChange('downloadComplete', checked)}
              disabled={isLoading || !settings.notifications.enabled}
              description="Notify when downloads finish"
              error={errors['notifications.downloadComplete']}
              className={settings.notifications.enabled ? '' : 'opacity-50'}
            />

            <ToggleSwitch
              id="notifications-error-alerts"
              label="Error Alerts"
              checked={settings.notifications.errorAlerts}
              onChange={(checked) => handleNotificationChange('errorAlerts', checked)}
              disabled={isLoading || !settings.notifications.enabled}
              description="Notify when errors occur"
              error={errors['notifications.errorAlerts']}
              className={settings.notifications.enabled ? '' : 'opacity-50'}
            />

            <ToggleSwitch
              id="notifications-sound"
              label="Sound Notifications"
              checked={settings.notifications.soundEnabled}
              onChange={(checked) => handleNotificationChange('soundEnabled', checked)}
              disabled={isLoading || !settings.notifications.enabled}
              description="Play sounds with notifications"
              error={errors['notifications.soundEnabled']}
              className={settings.notifications.enabled ? '' : 'opacity-50'}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneralSection;
