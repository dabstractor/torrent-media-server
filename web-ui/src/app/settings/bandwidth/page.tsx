'use client';

import React, { useState, useEffect } from 'react';
import { useSettings } from '@/hooks/use-settings';
import { BandwidthSection } from '@/components/settings/sections';
import type { AppSettings } from '@/lib/types/settings';

const BandwidthSettingsPage: React.FC = () => {
  const { 
    settings, 
    mutate: updateSettings, 
    isValidating,
    error: settingsError 
  } = useSettings();
  
  const [localSettings, setLocalSettings] = useState<AppSettings | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Initialize local settings when settings are loaded
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

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

  // Save settings
  const handleSave = async () => {
    if (!localSettings) return;
    
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    
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
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(result.error || 'Failed to save settings');
      }
    } catch (err) {
      setSaveError('Failed to save settings');
      console.error('Error saving settings:', err);
    } finally {
      setIsSaving(false);
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bandwidth Settings</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Configure upload and download speed limits, scheduling, and bandwidth management.
        </p>
      </div>
      
      <BandwidthSection
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

      {/* Status Messages */}
      {(saveSuccess || saveError || settingsError) && (
        <div className="mt-4">
          {saveSuccess && (
            <div className="rounded-md bg-green-50 dark:bg-green-900 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Settings saved successfully!
                  </p>
                </div>
              </div>
            </div>
          )}

          {saveError && (
            <div className="rounded-md bg-red-50 dark:bg-red-900 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error saving settings</h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                    <p>{saveError}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {settingsError && (
            <div className="rounded-md bg-red-50 dark:bg-red-900 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error loading settings</h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                    <p>{settingsError}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BandwidthSettingsPage;