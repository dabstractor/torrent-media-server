import React from 'react';
import { NumberInput, ToggleSwitch } from '../inputs';
import type { AppSettings } from '@/lib/types/settings';

export interface PlexSectionProps {
  settings: AppSettings;
  onSettingsChange: (settings: Partial<AppSettings>) => void;
  isLoading?: boolean;
  errors?: Record<string, string>;
  onTestConnection?: () => void;
  isTesting?: boolean;
  testResult?: { success: boolean; message: string } | null;
}

const PlexSection: React.FC<PlexSectionProps> = ({
  settings,
  onSettingsChange,
  isLoading = false,
  errors = {},
  onTestConnection,
  isTesting = false,
  testResult = null,
}) => {
  const handlePlexUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({
      plex: {
        ...settings.plex,
        url: e.target.value,
      },
    });
  };

  const handlePlexTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({
      plex: {
        ...settings.plex,
        token: e.target.value,
      },
    });
  };

  const handleLibraryChange = (field: 'movieLibrary' | 'tvLibrary', value: string) => {
    onSettingsChange({
      plex: {
        ...settings.plex,
        [field]: value,
      },
    });
  };


  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Plex Integration
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Configure connection to your Plex Media Server for automatic library refreshes.
          <br />
          <strong>Note:</strong> Media organization is automatically handled by Radarr (movies) and Sonarr (TV shows).
        </p>
      </div>

      {/* Connection Settings */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
          Connection Settings
        </h4>
        
        <div className="space-y-4">
          {/* Plex URL */}
          <div className="space-y-1">
            <label 
              htmlFor="plex-url" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Plex Media Server URL
            </label>
            <input
              id="plex-url"
              type="text"
              value={settings.plex.url}
              onChange={handlePlexUrlChange}
              placeholder="http://localhost:32400"
              disabled={isLoading}
              className={`
                input w-full
                ${errors['plex.url'] 
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
            {errors['plex.url'] ? (
              <p className="text-xs text-red-600 dark:text-red-400">
                {errors['plex.url']}
              </p>
            ) : (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Full URL to your Plex Media Server (including http:// or https://)
              </p>
            )}
          </div>

          {/* Plex Token */}
          <div className="space-y-1">
            <label 
              htmlFor="plex-token" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Plex Token
            </label>
            <input
              id="plex-token"
              type="password"
              value={settings.plex.token}
              onChange={handlePlexTokenChange}
              placeholder="Your Plex authentication token"
              disabled={isLoading}
              className={`
                input w-full
                ${errors['plex.token'] 
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
            {errors['plex.token'] ? (
              <p className="text-xs text-red-600 dark:text-red-400">
                {errors['plex.token']}
              </p>
            ) : (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Your Plex authentication token (found in your Plex account settings)
              </p>
            )}
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

      {/* Library Settings */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
          Library Configuration
        </h4>
        
        <div className="space-y-4">
          <div className="space-y-1">
            <label 
              htmlFor="plex-movie-library" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Movie Library Name
            </label>
            <input
              id="plex-movie-library"
              type="text"
              value={settings.plex.movieLibrary}
              onChange={(e) => handleLibraryChange('movieLibrary', e.target.value)}
              placeholder="Movies"
              disabled={isLoading}
              className={`
                input w-full
                ${errors['plex.movieLibrary'] 
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
            {errors['plex.movieLibrary'] ? (
              <p className="text-xs text-red-600 dark:text-red-400">
                {errors['plex.movieLibrary']}
              </p>
            ) : (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Name of your Plex movie library section
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label 
              htmlFor="plex-tv-library" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              TV Show Library Name
            </label>
            <input
              id="plex-tv-library"
              type="text"
              value={settings.plex.tvLibrary}
              onChange={(e) => handleLibraryChange('tvLibrary', e.target.value)}
              placeholder="tv"
              disabled={isLoading}
              className={`
                input w-full
                ${errors['plex.tvLibrary'] 
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
            {errors['plex.tvLibrary'] ? (
              <p className="text-xs text-red-600 dark:text-red-400">
                {errors['plex.tvLibrary']}
              </p>
            ) : (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Name of your Plex TV show library section
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Integration Settings */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
          Integration Options
        </h4>
        
        <div className="space-y-4">
          <ToggleSwitch
            id="plex-enabled"
            label="Enable Plex Integration"
            checked={settings.plex.enabled}
            onChange={(checked) => onSettingsChange({ 
              plex: { ...settings.plex, enabled: checked } 
            })}
            disabled={isLoading}
            description="Enable automatic library updates when downloads complete"
            error={errors['plex.enabled']}
          />

          <ToggleSwitch
            id="plex-auto-update"
            label="Auto-update Libraries"
            checked={settings.plex.autoUpdate}
            onChange={(checked) => onSettingsChange({ 
              plex: { ...settings.plex, autoUpdate: checked } 
            })}
            disabled={isLoading || !settings.plex.enabled}
            description="Automatically refresh Plex libraries after downloads complete"
            error={errors['plex.autoUpdate']}
            className={settings.plex.enabled ? '' : 'opacity-50'}
          />

          <NumberInput
            id="plex-refresh-delay"
            label="Refresh Delay"
            value={settings.plex.refreshDelay}
            onChange={(value) => onSettingsChange({ 
              plex: { ...settings.plex, refreshDelay: value } 
            })}
            min={0}
            max={300}
            unit="seconds"
            disabled={isLoading || !settings.plex.enabled}
            description="Delay before refreshing libraries (0 = immediate)"
            error={errors['plex.refreshDelay']}
            className={settings.plex.enabled ? '' : 'opacity-50'}
          />

          <ToggleSwitch
            id="plex-scan-all"
            label="Scan All Libraries"
            checked={settings.plex.scanAllLibraries}
            onChange={(checked) => onSettingsChange({ 
              plex: { ...settings.plex, scanAllLibraries: checked } 
            })}
            disabled={isLoading || !settings.plex.enabled}
            description="Scan all libraries instead of specific sections"
            error={errors['plex.scanAllLibraries']}
            className={settings.plex.enabled ? '' : 'opacity-50'}
          />
        </div>
      </div>

      {/* Automation Information */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
          Automated Media Organization
        </h4>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h5 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Automated Organization Active
              </h5>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <ul className="space-y-1">
                  <li>• <strong>Movies:</strong> Automatically organized by Radarr to <code>/data/media/movies</code></li>
                  <li>• <strong>TV Shows:</strong> Automatically organized by Sonarr to <code>/data/media/tv</code></li>
                  <li>• <strong>Plex:</strong> Libraries automatically refreshed after organization completes</li>
                </ul>
                <p className="mt-2 text-xs">
                  No manual file organization needed - the system handles everything automatically with proper naming and folder structure.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlexSection;