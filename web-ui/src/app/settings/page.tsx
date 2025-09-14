'use client';

import React, { useState, useEffect } from 'react';
import { useSettings } from '@/hooks/use-settings';
import { useNotifications } from '@/context/NotificationContext';
import { GeneralSection } from '@/components/settings/sections';
import type { AppSettings } from '@/lib/types/settings';

const SettingsPage: React.FC = () => {
  const { 
    settings, 
    mutate: updateSettings, 
    isValidating,
    error: settingsError 
  } = useSettings();
  
  const { addNotification } = useNotifications();
  
  const [localSettings, setLocalSettings] = useState<AppSettings | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Initialize local settings when settings are loaded
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  // Show error notification for settings loading errors
  useEffect(() => {
    if (settingsError) {
      addNotification({
        type: 'error',
        title: 'Failed to load settings',
        message: 'Could not load your settings. You can try refreshing the page, or continue with cached settings if available.',
        duration: 10000 // Longer duration for error messages
      });
    }
  }, [settingsError, addNotification]);

  // Handle settings changes
  const handleSettingsChange = (updates: Partial<AppSettings>) => {
    if (localSettings) {
      setLocalSettings({
        ...localSettings,
        ...updates,
      });
      
      // Clear any previous validation errors for changed fields
      const newErrors = { ...validationErrors };
      Object.keys(updates).forEach(key => {
        delete newErrors[key];
      });
      setValidationErrors(newErrors);
    }
  };

  // Save settings with retry mechanism
  const handleSave = async (retryCount = 0) => {
    if (!localSettings) return;

    setIsSaving(true);

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(localSettings),
      });

      const result = await response.json();

      if (result.success) {
        // Update the SWR cache with the new settings
        await updateSettings(localSettings, false);
        addNotification({
          type: 'success',
          title: 'Settings saved',
          message: 'Your settings have been saved successfully.',
          duration: 3000
        });
      } else {
        // Check if this is a database error that might be temporary
        const isDatabaseError = result.error?.includes('database') || result.error?.includes('Database') || response.status === 500;

        if (isDatabaseError && retryCount < 2) {
          console.log(`Retrying save operation (attempt ${retryCount + 1})`);
          setTimeout(() => handleSave(retryCount + 1), 1000 * (retryCount + 1)); // Exponential backoff
          addNotification({
            type: 'warning',
            title: 'Retrying save...',
            message: `Attempting to save settings again (${retryCount + 1}/3)`,
            duration: 3000
          });
        } else {
          addNotification({
            type: 'error',
            title: 'Save failed',
            message: result.error || 'Failed to save settings. The database may be temporarily unavailable.',
            duration: 8000
          });
        }
      }
    } catch (err) {
      if (retryCount < 2) {
        console.log(`Retrying save operation after network error (attempt ${retryCount + 1})`);
        setTimeout(() => handleSave(retryCount + 1), 1000 * (retryCount + 1)); // Exponential backoff
        addNotification({
          type: 'warning',
          title: 'Retrying save...',
          message: `Network error. Attempting to save settings again (${retryCount + 1}/3)`,
          duration: 3000
        });
      } else {
        addNotification({
          type: 'error',
          title: 'Save failed',
          message: 'Failed to save settings after multiple attempts. Please check your connection and try again.',
          duration: 8000
        });
        console.error('Error saving settings after retries:', err);
      }
    } finally {
      if (retryCount === 0) { // Only set loading false on the initial attempt
        setIsSaving(false);
      }
    }
  };

  // Reset to default settings
  const handleReset = () => {
    if (settings) {
      setLocalSettings(settings);
      setValidationErrors({});
    }
  };

  if (!localSettings) {
    if (settingsError) {
      // Show error state with retry option
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Failed to Load Settings
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Unable to connect to the settings database. This may be temporary.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary px-4 py-2"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">General Settings</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Configure general application preferences and behavior.
        </p>
      </div>
      
      <GeneralSection
        settings={localSettings}
        onSettingsChange={handleSettingsChange}
        isLoading={isValidating || isSaving}
        errors={validationErrors}
      />

      {/* Action Buttons */}
      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-end gap-3">
        <button
          type="button"
          onClick={handleReset}
          disabled={isSaving || isValidating}
          className={`
            btn btn-secondary px-4 py-2
            ${isSaving || isValidating
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-gray-200 dark:hover:bg-gray-600'
            }
          `}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || isValidating}
          className={`
            btn btn-primary px-4 py-2
            ${isSaving || isValidating
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-blue-700 dark:hover:bg-blue-600'
            }
          `}
        >
          {isSaving ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </span>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>

    </div>
  );
};

export default SettingsPage;
