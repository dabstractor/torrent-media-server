import type { AppSettings, ValidationError, ValidationResult } from '@/lib/types/settings';

/**
 * Client-side settings validation utilities
 * These functions provide real-time validation feedback in the UI
 */

// URL validation helper
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Email validation helper (currently unused but may be needed later)
// const isValidEmail = (email: string): boolean => {
//   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//   return emailRegex.test(email);
// };

// Path validation helper
const isValidPath = (path: string): boolean => {
  // Basic path validation - should not be empty and should not contain invalid characters
  if (!path || path.trim() === '') return false;
  
  // Check for invalid characters on most systems
  const invalidChars = /[<>:"|?*]/;
  return !invalidChars.test(path);
};

// Port validation helper (currently unused but may be needed later)
// const isValidPort = (port: number): boolean => {
//   return Number.isInteger(port) && port >= 1 && port <= 65535;
// };

// Validate theme settings
const validateThemeSettings = (settings: AppSettings, errors: ValidationError[]): void => {
  if (!['light', 'dark', 'system'].includes(settings.theme)) {
    errors.push({
      field: 'theme',
      message: 'Theme must be light, dark, or system',
      code: 'INVALID_THEME',
    });
  }

  if (settings.language && settings.language.length > 10) {
    errors.push({
      field: 'language',
      message: 'Language code is too long',
      code: 'INVALID_LANGUAGE',
    });
  }
};

// Validate notification settings
const validateNotificationSettings = (settings: AppSettings, _errors: ValidationError[]): void => {
  // If notifications are enabled, check related settings
  if (settings.notifications.enabled) {
    // All boolean fields are valid by default since they're typed as boolean
    // We could add more specific validation if needed
  }
};

// Validate download settings
const validateDownloadSettings = (settings: AppSettings, errors: ValidationError[]): void => {
  if (settings.maxConcurrentDownloads < 1 || settings.maxConcurrentDownloads > 50) {
    errors.push({
      field: 'maxConcurrentDownloads',
      message: 'Maximum concurrent downloads must be between 1 and 50',
      code: 'INVALID_CONCURRENT_DOWNLOADS',
    });
  }

  if (settings.defaultDownloadPath && !isValidPath(settings.defaultDownloadPath)) {
    errors.push({
      field: 'defaultDownloadPath',
      message: 'Download path contains invalid characters',
      code: 'INVALID_DOWNLOAD_PATH',
    });
  }

  if (settings.completedTorrentPath && !isValidPath(settings.completedTorrentPath)) {
    errors.push({
      field: 'completedTorrentPath',
      message: 'Completed torrent path contains invalid characters',
      code: 'INVALID_COMPLETED_PATH',
    });
  }

  if (settings.defaultCategory && settings.defaultCategory.length > 50) {
    errors.push({
      field: 'defaultCategory',
      message: 'Category name is too long',
      code: 'INVALID_CATEGORY_NAME',
    });
  }
};

// Validate bandwidth settings
const validateBandwidthSettings = (settings: AppSettings, errors: ValidationError[]): void => {
  // Basic rate limits
  if (settings.bandwidth.maxDownloadRate < 0) {
    errors.push({
      field: 'bandwidth.maxDownloadRate',
      message: 'Maximum download rate cannot be negative',
      code: 'INVALID_MAX_DOWNLOAD_RATE',
    });
  }

  if (settings.bandwidth.maxUploadRate < 0) {
    errors.push({
      field: 'bandwidth.maxUploadRate',
      message: 'Maximum upload rate cannot be negative',
      code: 'INVALID_MAX_UPLOAD_RATE',
    });
  }

  // Alternative rate limits
  if (settings.bandwidth.alternativeMaxDownloadRate < 0) {
    errors.push({
      field: 'bandwidth.alternativeMaxDownloadRate',
      message: 'Alternative download rate cannot be negative',
      code: 'INVALID_ALT_DOWNLOAD_RATE',
    });
  }

  if (settings.bandwidth.alternativeMaxUploadRate < 0) {
    errors.push({
      field: 'bandwidth.alternativeMaxUploadRate',
      message: 'Alternative upload rate cannot be negative',
      code: 'INVALID_ALT_UPLOAD_RATE',
    });
  }

  // Connection limits
  if (settings.bandwidth.maxConnections < 1 || settings.bandwidth.maxConnections > 10000) {
    errors.push({
      field: 'bandwidth.maxConnections',
      message: 'Maximum connections must be between 1 and 10000',
      code: 'INVALID_MAX_CONNECTIONS',
    });
  }

  if (settings.bandwidth.maxConnectionsPerTorrent < 1 || settings.bandwidth.maxConnectionsPerTorrent > 1000) {
    errors.push({
      field: 'bandwidth.maxConnectionsPerTorrent',
      message: 'Maximum connections per torrent must be between 1 and 1000',
      code: 'INVALID_MAX_CONNECTIONS_PER_TORRENT',
    });
  }

  if (settings.bandwidth.maxUploads < 1 || settings.bandwidth.maxUploads > 1000) {
    errors.push({
      field: 'bandwidth.maxUploads',
      message: 'Maximum upload slots must be between 1 and 1000',
      code: 'INVALID_MAX_UPLOADS',
    });
  }

  if (settings.bandwidth.maxUploadsPerTorrent < 1 || settings.bandwidth.maxUploadsPerTorrent > 100) {
    errors.push({
      field: 'bandwidth.maxUploadsPerTorrent',
      message: 'Maximum upload slots per torrent must be between 1 and 100',
      code: 'INVALID_MAX_UPLOADS_PER_TORRENT',
    });
  }
};

// Validate qBittorrent settings
const validateQBittorrentSettings = (settings: AppSettings, errors: ValidationError[]): void => {
  if (settings.qbittorrent.syncEnabled) {
    if (!settings.qbittorrent.url) {
      errors.push({
        field: 'qbittorrent.url',
        message: 'qBittorrent URL is required when sync is enabled',
        code: 'MISSING_QB_URL',
      });
    } else if (!isValidUrl(settings.qbittorrent.url)) {
      errors.push({
        field: 'qbittorrent.url',
        message: 'qBittorrent URL must be a valid URL',
        code: 'INVALID_QB_URL',
      });
    }

    if (!settings.qbittorrent.username) {
      errors.push({
        field: 'qbittorrent.username',
        message: 'qBittorrent username is required',
        code: 'MISSING_QB_USERNAME',
      });
    }

    if (!settings.qbittorrent.password) {
      errors.push({
        field: 'qbittorrent.password',
        message: 'qBittorrent password is required',
        code: 'MISSING_QB_PASSWORD',
      });
    }

    if (settings.qbittorrent.syncInterval < 30 || settings.qbittorrent.syncInterval > 3600) {
      errors.push({
        field: 'qbittorrent.syncInterval',
        message: 'Sync interval must be between 30 seconds and 1 hour',
        code: 'INVALID_SYNC_INTERVAL',
      });
    }
  }

  // Validate scheduler settings
  const scheduler = settings.qbittorrent.scheduler;
  if (scheduler.enabled) {
    if (scheduler.fromHour < 0 || scheduler.fromHour > 23) {
      errors.push({
        field: 'qbittorrent.scheduler.fromHour',
        message: 'Scheduler from hour must be between 0 and 23',
        code: 'INVALID_SCHEDULER_FROM_HOUR',
      });
    }

    if (scheduler.fromMin < 0 || scheduler.fromMin > 59) {
      errors.push({
        field: 'qbittorrent.scheduler.fromMin',
        message: 'Scheduler from minutes must be between 0 and 59',
        code: 'INVALID_SCHEDULER_FROM_MIN',
      });
    }

    if (scheduler.toHour < 0 || scheduler.toHour > 23) {
      errors.push({
        field: 'qbittorrent.scheduler.toHour',
        message: 'Scheduler to hour must be between 0 and 23',
        code: 'INVALID_SCHEDULER_TO_HOUR',
      });
    }

    if (scheduler.toMin < 0 || scheduler.toMin > 59) {
      errors.push({
        field: 'qbittorrent.scheduler.toMin',
        message: 'Scheduler to minutes must be between 0 and 59',
        code: 'INVALID_SCHEDULER_TO_MIN',
      });
    }

    if (scheduler.days < 1 || scheduler.days > 127) {
      errors.push({
        field: 'qbittorrent.scheduler.days',
        message: 'Scheduler days must be a valid bitmask (1-127)',
        code: 'INVALID_SCHEDULER_DAYS',
      });
    }

    // Check if from time is before to time
    const fromTime = scheduler.fromHour * 60 + scheduler.fromMin;
    const toTime = scheduler.toHour * 60 + scheduler.toMin;
    if (fromTime >= toTime) {
      errors.push({
        field: 'qbittorrent.scheduler',
        message: 'Scheduler start time must be before end time',
        code: 'INVALID_SCHEDULER_TIME_ORDER',
      });
    }
  }
};

// Validate Plex settings
const validatePlexSettings = (settings: AppSettings, errors: ValidationError[]): void => {
  if (settings.plex.enabled) {
    if (!settings.plex.url) {
      errors.push({
        field: 'plex.url',
        message: 'Plex URL is required when integration is enabled',
        code: 'MISSING_PLEX_URL',
      });
    } else if (!isValidUrl(settings.plex.url)) {
      errors.push({
        field: 'plex.url',
        message: 'Plex URL must be a valid URL',
        code: 'INVALID_PLEX_URL',
      });
    }

    if (!settings.plex.token) {
      errors.push({
        field: 'plex.token',
        message: 'Plex token is required',
        code: 'MISSING_PLEX_TOKEN',
      });
    }

    if (settings.plex.movieLibrary && settings.plex.movieLibrary.length > 100) {
      errors.push({
        field: 'plex.movieLibrary',
        message: 'Movie library name is too long',
        code: 'INVALID_MOVIE_LIBRARY_NAME',
      });
    }

    if (settings.plex.tvLibrary && settings.plex.tvLibrary.length > 100) {
      errors.push({
        field: 'plex.tvLibrary',
        message: 'TV library name is too long',
        code: 'INVALID_TV_LIBRARY_NAME',
      });
    }

    if (settings.plex.refreshDelay < 0 || settings.plex.refreshDelay > 300) {
      errors.push({
        field: 'plex.refreshDelay',
        message: 'Refresh delay must be between 0 and 300 seconds',
        code: 'INVALID_PLEX_REFRESH_DELAY',
      });
    }
  }
};

// Validate advanced settings
const validateAdvancedSettings = (settings: AppSettings, errors: ValidationError[]): void => {
  // Cache size validation
  if (settings.advanced.cacheSize < 1 || settings.advanced.cacheSize > 2048) {
    errors.push({
      field: 'advanced.cacheSize',
      message: 'Cache size must be between 1MB and 2048MB',
      code: 'INVALID_CACHE_SIZE',
    });
  }

  // Log retention validation
  if (settings.advanced.logRetentionDays < 1 || settings.advanced.logRetentionDays > 365) {
    errors.push({
      field: 'advanced.logRetentionDays',
      message: 'Log retention must be between 1 and 365 days',
      code: 'INVALID_LOG_RETENTION',
    });
  }

  // Session timeout validation
  if (settings.advanced.sessionTimeout < 1 || settings.advanced.sessionTimeout > 1440) {
    errors.push({
      field: 'advanced.sessionTimeout',
      message: 'Session timeout must be between 1 and 1440 minutes',
      code: 'INVALID_SESSION_TIMEOUT',
    });
  }

  // Database cache size validation
  if (settings.advanced.databaseCacheSize < 1 || settings.advanced.databaseCacheSize > 10000) {
    errors.push({
      field: 'advanced.databaseCacheSize',
      message: 'Database cache size must be between 1 and 10000 pages',
      code: 'INVALID_DATABASE_CACHE_SIZE',
    });
  }

  // API timeout validation
  if (settings.advanced.apiTimeout < 1 || settings.advanced.apiTimeout > 300) {
    errors.push({
      field: 'advanced.apiTimeout',
      message: 'API timeout must be between 1 and 300 seconds',
      code: 'INVALID_API_TIMEOUT',
    });
  }

  // Retry attempts validation
  if (settings.advanced.maxRetryAttempts < 0 || settings.advanced.maxRetryAttempts > 10) {
    errors.push({
      field: 'advanced.maxRetryAttempts',
      message: 'Maximum retry attempts must be between 0 and 10',
      code: 'INVALID_MAX_RETRY_ATTEMPTS',
    });
  }

  // Rate limiting validation
  if (settings.advanced.apiRateLimiting) {
    if (settings.advanced.rateLimitRequests < 1 || settings.advanced.rateLimitRequests > 10000) {
      errors.push({
        field: 'advanced.rateLimitRequests',
        message: 'Rate limit requests must be between 1 and 10000',
        code: 'INVALID_RATE_LIMIT_REQUESTS',
      });
    }

    if (settings.advanced.rateLimitWindow < 1 || settings.advanced.rateLimitWindow > 3600) {
      errors.push({
        field: 'advanced.rateLimitWindow',
        message: 'Rate limit window must be between 1 and 3600 seconds',
        code: 'INVALID_RATE_LIMIT_WINDOW',
      });
    }
  }
};

/**
 * Validate all settings
 * @param settings - The settings to validate
 * @returns ValidationResult with isValid flag and array of errors
 */
export const validateAllSettings = (settings: AppSettings): ValidationResult => {
  const errors: ValidationError[] = [];

  try {
    validateThemeSettings(settings, errors);
    validateNotificationSettings(settings, errors);
    validateDownloadSettings(settings, errors);
    validateBandwidthSettings(settings, errors);
    validateQBittorrentSettings(settings, errors);
    validatePlexSettings(settings, errors);
    validateAdvancedSettings(settings, errors);

    return {
      isValid: errors.length === 0,
      errors,
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [{
        field: 'validation',
        message: error instanceof Error ? error.message : 'Validation failed',
        code: 'VALIDATION_ERROR',
      }],
    };
  }
};

/**
 * Validate specific field or section
 * @param settings - The settings to validate
 * @param fieldPath - Dot-notation path to the field (e.g., 'bandwidth.maxDownloadRate')
 * @returns ValidationResult for the specific field
 */
export const validateField = (settings: AppSettings, fieldPath: string): ValidationResult => {
  const errors: ValidationError[] = [];
  const pathParts = fieldPath.split('.');

  try {
    switch (pathParts[0]) {
      case 'theme':
      case 'language':
        validateThemeSettings(settings, errors);
        break;
      case 'notifications':
        validateNotificationSettings(settings, errors);
        break;
      case 'maxConcurrentDownloads':
      case 'defaultDownloadPath':
      case 'completedTorrentPath':
      case 'defaultCategory':
      case 'autoStartTorrents':
      case 'deleteCompletedTorrents':
      case 'moveTorrentOnCompletion':
        validateDownloadSettings(settings, errors);
        break;
      case 'bandwidth':
        validateBandwidthSettings(settings, errors);
        break;
      case 'qbittorrent':
        validateQBittorrentSettings(settings, errors);
        break;
      case 'plex':
        validatePlexSettings(settings, errors);
        break;
      case 'advanced':
        validateAdvancedSettings(settings, errors);
        break;
      default:
        // Validate all if we don't know the specific section
        validateThemeSettings(settings, errors);
        validateNotificationSettings(settings, errors);
        validateDownloadSettings(settings, errors);
        validateBandwidthSettings(settings, errors);
        validateQBittorrentSettings(settings, errors);
        validatePlexSettings(settings, errors);
        validateAdvancedSettings(settings, errors);
    }

    // Filter errors to only those matching the field path
    const fieldErrors = errors.filter(error => error.field.startsWith(fieldPath));

    return {
      isValid: fieldErrors.length === 0,
      errors: fieldErrors,
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [{
        field: fieldPath,
        message: error instanceof Error ? error.message : 'Field validation failed',
        code: 'FIELD_VALIDATION_ERROR',
      }],
    };
  }
};

/**
 * Get user-friendly error messages for common validation errors
 * @param error - ValidationError object
 * @returns User-friendly error message
 */
export const getFriendlyErrorMessage = (error: ValidationError): string => {
  const friendlyMessages: Record<string, string> = {
    'INVALID_THEME': 'Please select a valid theme option',
    'INVALID_LANGUAGE': 'Language code is too long',
    'INVALID_CONCURRENT_DOWNLOADS': 'Must be between 1 and 50 downloads',
    'INVALID_DOWNLOAD_PATH': 'Path contains invalid characters',
    'INVALID_COMPLETED_PATH': 'Path contains invalid characters',
    'INVALID_CATEGORY_NAME': 'Category name is too long',
    'INVALID_MAX_DOWNLOAD_RATE': 'Rate cannot be negative',
    'INVALID_MAX_UPLOAD_RATE': 'Rate cannot be negative',
    'INVALID_ALT_DOWNLOAD_RATE': 'Rate cannot be negative',
    'INVALID_ALT_UPLOAD_RATE': 'Rate cannot be negative',
    'INVALID_MAX_CONNECTIONS': 'Must be between 1 and 10000 connections',
    'INVALID_MAX_CONNECTIONS_PER_TORRENT': 'Must be between 1 and 1000 connections',
    'INVALID_MAX_UPLOADS': 'Must be between 1 and 1000 upload slots',
    'INVALID_MAX_UPLOADS_PER_TORRENT': 'Must be between 1 and 100 upload slots',
    'MISSING_QB_URL': 'qBittorrent URL is required',
    'INVALID_QB_URL': 'Please enter a valid URL',
    'MISSING_QB_USERNAME': 'Username is required',
    'MISSING_QB_PASSWORD': 'Password is required',
    'INVALID_SYNC_INTERVAL': 'Must be between 30 seconds and 1 hour',
    'INVALID_SCHEDULER_FROM_HOUR': 'Hour must be 0-23',
    'INVALID_SCHEDULER_FROM_MIN': 'Minutes must be 0-59',
    'INVALID_SCHEDULER_TO_HOUR': 'Hour must be 0-23',
    'INVALID_SCHEDULER_TO_MIN': 'Minutes must be 0-59',
    'INVALID_SCHEDULER_DAYS': 'Invalid day selection',
    'INVALID_SCHEDULER_TIME_ORDER': 'Start time must be before end time',
    'MISSING_PLEX_URL': 'Plex URL is required',
    'INVALID_PLEX_URL': 'Please enter a valid URL',
    'MISSING_PLEX_TOKEN': 'Plex token is required',
    'INVALID_MOVIE_LIBRARY_NAME': 'Library name is too long',
    'INVALID_TV_LIBRARY_NAME': 'Library name is too long',
    'INVALID_PLEX_REFRESH_DELAY': 'Must be 0-300 seconds',
    'INVALID_CACHE_SIZE': 'Must be 1-2048 MB',
    'INVALID_LOG_RETENTION': 'Must be 1-365 days',
    'INVALID_SESSION_TIMEOUT': 'Must be 1-1440 minutes',
    'INVALID_DATABASE_CACHE_SIZE': 'Must be 1-10000 pages',
    'INVALID_API_TIMEOUT': 'Must be 1-300 seconds',
    'INVALID_MAX_RETRY_ATTEMPTS': 'Must be 0-10 attempts',
    'INVALID_RATE_LIMIT_REQUESTS': 'Must be 1-10000 requests',
    'INVALID_RATE_LIMIT_WINDOW': 'Must be 1-3600 seconds',
  };

  return friendlyMessages[error.code] || error.message;
};

const settingsValidation = {
  validateAllSettings,
  validateField,
  getFriendlyErrorMessage,
};

export default settingsValidation;