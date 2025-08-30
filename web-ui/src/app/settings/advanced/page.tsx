'use client';

import React, { useState, useEffect } from 'react';
import { useSettings } from '@/hooks/use-settings';
import { useNotifications } from '@/context/NotificationContext';
import { AdvancedSection } from '@/components/settings/sections';
import type { AppSettings } from '@/lib/types/settings';

const AdvancedSettingsPage: React.FC = () => {
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
        message: 'Could not load your advanced settings. Please refresh the page or try again later.',
        duration: 8000
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

  // Save settings
  const handleSave = async () => {
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
          title: 'Advanced settings saved',
          message: 'Your advanced settings have been saved successfully.',
          duration: 3000
        });
      } else {
        addNotification({
          type: 'error',
          title: 'Save failed',
          message: result.error || 'Failed to save advanced settings. Please try again.',
          duration: 5000
        });
      }
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Save failed',
        message: 'Failed to save advanced settings. Please check your connection and try again.',
        duration: 5000
      });
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Advanced Settings</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Configure advanced application behavior and performance tuning options.
        </p>
      </div>
      
      <AdvancedSection
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

export default AdvancedSettingsPage;