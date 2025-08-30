import { useState, useCallback, useEffect, useRef } from 'react';
import * as settingsApi from '@/lib/api/settings';
import type { 
  AppSettings, 
  SettingsUpdateRequest, 
  SettingsUpdateResult, 
  ValidationResult,
  SettingsCategory 
} from '@/lib/types/settings';

interface UseSettingsOptions {
  refreshInterval?: number; // milliseconds
  category?: SettingsCategory;
  includeStats?: boolean;
  revalidateOnFocus?: boolean;
}

interface UseSettingsReturn {
  settings: AppSettings | null;
  isLoading: boolean;
  error: string | null;
  isValidating: boolean;
  updateSettings: (updates: Partial<AppSettings>, options?: {
    validateOnly?: boolean;
    skipSync?: boolean;
    createBackup?: boolean;
  }) => Promise<SettingsUpdateResult>;
  validateSettings: (settings: AppSettings) => Promise<ValidationResult>;
  mutate: (data?: AppSettings, shouldRevalidate?: boolean) => Promise<AppSettings | undefined>;
  refresh: () => Promise<void>;
}

// Cache key for settings
const SETTINGS_CACHE_KEY = 'settings-cache-v1';
const DEFAULT_REFRESH_INTERVAL = 0; // Disabled due to infinite loop issue

// Utility functions for caching
const getCachedSettings = (): { settings: AppSettings; timestamp: number } | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached);
    return parsed;
  } catch (error) {
    console.error('Error reading settings cache:', error);
    return null;
  }
};

const setCachedSettings = (settings: AppSettings): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const cacheData = {
      settings,
      timestamp: Date.now(),
    };
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error caching settings:', error);
  }
};

const isCacheValid = (cached: { settings: AppSettings; timestamp: number }, maxAge = 30000): boolean => {
  return (Date.now() - cached.timestamp) < maxAge;
};

export function useSettings(options: UseSettingsOptions = {}): UseSettingsReturn {
  const {
    refreshInterval = DEFAULT_REFRESH_INTERVAL,
    category,
    includeStats = false,
    revalidateOnFocus = true,
  } = options;

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isValidatingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch settings from API
  const fetchSettings = useCallback(async (signal?: AbortSignal): Promise<AppSettings | null> => {
    try {
      const params: { category?: string } = {};
      if (category) params.category = category;
      
      const response = await settingsApi.getSettings(params);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch settings');
      }

      const fetchedSettings = response.data;
      
      // Cache the settings
      setCachedSettings(fetchedSettings);
      return fetchedSettings;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return null; // Request was aborted
      }
      throw error;
    }
  }, [category, includeStats]);

  // Revalidate settings
  const revalidate = useCallback(async (showValidating = true): Promise<AppSettings | null> => {
    if (isValidatingRef.current) return null;
    
    isValidatingRef.current = true;
    if (showValidating) setIsValidating(true);

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      const newSettings = await fetchSettings(abortControllerRef.current.signal);
      if (newSettings) {
        setSettings(newSettings);
        setError(null);
        return newSettings;
      }
    } catch (error) {
      console.error('Error revalidating settings:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch settings');
    } finally {
      isValidatingRef.current = false;
      setIsValidating(false);
      abortControllerRef.current = null;
    }

    return null;
  }, [fetchSettings]);

  // Initialize and load settings
  const initialize = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Try to load from cache first for instant UI
      const cached = getCachedSettings();
      if (cached && isCacheValid(cached, refreshInterval)) {
        setSettings(cached.settings);
        setIsLoading(false);
        // Still revalidate in background (only if refreshInterval > 0)
        if (refreshInterval > 0) {
          revalidate(false);
        }
        return;
      }

      // Load from API
      const newSettings = await fetchSettings();
      if (newSettings) {
        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Error initializing settings:', error);
      setError(error instanceof Error ? error.message : 'Failed to load settings');
      
      // Fallback to cached settings if available
      const cached = getCachedSettings();
      if (cached) {
        setSettings(cached.settings);
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchSettings, revalidate, refreshInterval]);

  // Update settings with optimistic updates
  const updateSettings = useCallback(async (
    updates: Partial<AppSettings>,
    options: {
      validateOnly?: boolean;
      skipSync?: boolean;
      createBackup?: boolean;
    } = {}
  ): Promise<SettingsUpdateResult> => {
    if (!settings) {
      return {
        success: false,
        updatedSettings: null,
        validation: { isValid: false, errors: [{ field: 'general', message: 'Settings not loaded', code: 'SETTINGS_NOT_LOADED' }] },
        syncResult: null,
        backupId: null,
        errors: ['Settings not loaded'],
      };
    }

    const previousSettings = settings;
    
    // Optimistic update (only if not validation-only)
    if (!options.validateOnly) {
      const optimisticSettings = { ...settings, ...updates };
      setSettings(optimisticSettings);
      setCachedSettings(optimisticSettings);
    }

    try {
      const updateRequest: SettingsUpdateRequest = {
        settings: updates,
        category,
        options: {
          validateOnly: options.validateOnly || false,
          skipSync: options.skipSync || false,
          createBackup: options.createBackup !== false, // Default to true
        },
      };

      const response = await settingsApi.updateSettings(updateRequest);
      
      if (response.success) {
        const result = response.data;
        
        // Update with the actual result from server
        if (!options.validateOnly && result.updatedSettings) {
          setSettings(result.updatedSettings);
          setCachedSettings(result.updatedSettings);
        }
        
        return result;
      } else {
        // Rollback optimistic update on failure
        if (!options.validateOnly) {
          setSettings(previousSettings);
          setCachedSettings(previousSettings);
        }
        
        // Set error state
        setError(response.error || 'Settings update failed');
        
        // Return error result instead of throwing
        return {
          success: false,
          updatedSettings: null,
          validation: { isValid: false, errors: [{ field: 'general', message: response.error || 'Settings update failed', code: 'UPDATE_FAILED' }] },
          syncResult: null,
          backupId: null,
          errors: [response.error || 'Settings update failed'],
        };
      }
    } catch (error) {
      // Rollback optimistic update on error
      if (!options.validateOnly) {
        setSettings(previousSettings);
        setCachedSettings(previousSettings);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Settings update failed';
      console.error('Settings update failed:', error);
      
      // Set error state
      setError(errorMessage);
      
      // Return error result instead of throwing
      return {
        success: false,
        updatedSettings: null,
        validation: { isValid: false, errors: [{ field: 'general', message: errorMessage, code: 'UPDATE_FAILED' }] },
        syncResult: null,
        backupId: null,
        errors: [errorMessage],
      };
    }
  }, [settings, category]);

  // Validate settings without updating
  const validateSettings = useCallback(async (settingsToValidate: AppSettings): Promise<ValidationResult> => {
    try {
      const response = await settingsApi.validateSettings(settingsToValidate);

      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || 'Validation failed');
      }
    } catch (error) {
      console.error('Settings validation failed:', error);
      return {
        isValid: false,
        errors: [{
          field: 'general',
          message: error instanceof Error ? error.message : 'Validation failed',
          code: 'VALIDATION_ERROR',
        }],
      };
    }
  }, []);

  // Mutate settings (SWR-like interface)
  const mutate = useCallback(async (
    data?: AppSettings,
    shouldRevalidate = true
  ): Promise<AppSettings | undefined> => {
    if (data) {
      setSettings(data);
      setCachedSettings(data);
    }

    if (shouldRevalidate) {
      return (await revalidate()) || undefined;
    }

    return settings || undefined;
  }, [settings, revalidate]);

  // Refresh settings
  const refresh = useCallback(async () => {
    await revalidate();
  }, [revalidate]);

  // Setup polling interval
  useEffect(() => {
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        if (!isValidatingRef.current) {
          revalidate(false); // Background revalidation
        }
      }, refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [refreshInterval, revalidate]);

  // Setup focus revalidation
  useEffect(() => {
    if (revalidateOnFocus && typeof window !== 'undefined') {
      const handleFocus = () => {
        if (!isValidatingRef.current) {
          revalidate(false);
        }
      };

      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [revalidateOnFocus, revalidate]);

  // Initialize on mount
  useEffect(() => {
    initialize();

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [initialize]);

  return {
    settings,
    isLoading,
    error,
    isValidating,
    updateSettings,
    validateSettings,
    mutate,
    refresh,
  };
}

// Hook for specific settings categories
export function useCategorySettings(category: SettingsCategory, options: Omit<UseSettingsOptions, 'category'> = {}) {
  return useSettings({ ...options, category });
}

// Hook for settings with stats
export function useSettingsWithStats(options: Omit<UseSettingsOptions, 'includeStats'> = {}) {
  return useSettings({ ...options, includeStats: true });
}