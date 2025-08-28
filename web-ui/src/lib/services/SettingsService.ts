import type { 
  AppSettings, 
  SettingsBackup,
  BackupMetadata,
  ValidationResult,
  SettingsUpdateRequest,
  SettingsUpdateResult,
  SettingsCache,
} from '@/lib/types/settings';
import { DEFAULT_SETTINGS } from '@/lib/types/settings';
import { getSettingsDB } from '@/lib/db/settings';
import crypto from 'crypto';

class SettingsService {
  private db = getSettingsDB();
  private cache: SettingsCache | null = null;
  private cacheValidityMs = 30000; // 30 seconds
  private isInitialized = false;

  constructor() {
    // Service will be initialized when first used
  }

  // Initialize the service
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Ensure database is ready and load initial cache
      await this.refreshCache();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize SettingsService:', error);
      throw new Error('Settings service initialization failed');
    }
  }

  // Get all settings with caching
  async getSettings(): Promise<AppSettings> {
    await this.ensureInitialized();
    
    if (this.isCacheValid()) {
      return this.cache!.settings;
    }

    try {
      await this.refreshCache();
      return this.cache!.settings;
    } catch (error) {
      console.error('Failed to get settings:', error);
      // Return defaults if database fails
      return DEFAULT_SETTINGS;
    }
  }

  // Get a specific setting with type safety
  async getSetting<T>(key: keyof AppSettings): Promise<T | null> {
    const settings = await this.getSettings();
    return (settings[key] as T) || null;
  }

  // Update settings with validation
  async updateSettings(request: SettingsUpdateRequest): Promise<SettingsUpdateResult> {
    await this.ensureInitialized();
    const startTime = Date.now();

    try {
      // Get current settings
      const currentSettings = await this.getSettings();
      const mergedSettings = { ...currentSettings, ...request.settings };

      // Validate settings
      const validation = await this.validateSettings(mergedSettings);
      
      if (!validation.isValid && !request.options?.validateOnly) {
        return {
          success: false,
          updatedSettings: currentSettings,
          validation,
          errors: validation.errors.map(e => e.message),
        };
      }

      // If validation only, return early
      if (request.options?.validateOnly) {
        return {
          success: validation.isValid,
          updatedSettings: mergedSettings,
          validation,
          errors: validation.errors.map(e => e.message),
        };
      }

      // Create backup if requested
      let backupId: string | undefined;
      if (request.options?.createBackup) {
        backupId = await this.createAutoBackup();
      }

      // Save to database
      this.db.saveSettings(request.settings);

      // Refresh cache
      await this.refreshCache();

      const result: SettingsUpdateResult = {
        success: true,
        updatedSettings: mergedSettings,
        validation,
        backupId,
        errors: [],
      };

      // Log the operation
      this.db.logSync(
        'settings_updated',
        Object.keys(request.settings),
        true,
        undefined,
        Date.now() - startTime
      );

      return result;
    } catch (error) {
      console.error('Failed to update settings:', error);
      
      // Log the failure
      this.db.logSync(
        'settings_updated',
        Object.keys(request.settings),
        false,
        error instanceof Error ? error.message : 'Unknown error',
        Date.now() - startTime
      );

      return {
        success: false,
        updatedSettings: await this.getSettings(),
        validation: { isValid: false, errors: [] },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  // Validate settings
  async validateSettings(settings: AppSettings): Promise<ValidationResult> {
    const errors: ValidationResult['errors'] = [];

    try {
      // Theme validation
      if (!['light', 'dark', 'system'].includes(settings.theme)) {
        errors.push({
          field: 'theme',
          message: 'Theme must be light, dark, or system',
          code: 'INVALID_THEME',
        });
      }

      // Bandwidth validation
      if (settings.maxUploadSpeed < 0) {
        errors.push({
          field: 'maxUploadSpeed',
          message: 'Upload speed must be 0 or positive (0 = unlimited)',
          code: 'INVALID_UPLOAD_SPEED',
        });
      }

      if (settings.maxDownloadSpeed < 0) {
        errors.push({
          field: 'maxDownloadSpeed',
          message: 'Download speed must be 0 or positive (0 = unlimited)',
          code: 'INVALID_DOWNLOAD_SPEED',
        });
      }

      // Concurrent downloads validation
      if (settings.maxConcurrentDownloads < 1 || settings.maxConcurrentDownloads > 20) {
        errors.push({
          field: 'maxConcurrentDownloads',
          message: 'Maximum concurrent downloads must be between 1 and 20',
          code: 'INVALID_CONCURRENT_DOWNLOADS',
        });
      }

      // Schedule validation
      if (settings.scheduleEnabled) {
        if (settings.scheduleFromHour < 0 || settings.scheduleFromHour > 23) {
          errors.push({
            field: 'scheduleFromHour',
            message: 'Schedule from hour must be between 0 and 23',
            code: 'INVALID_SCHEDULE_FROM_HOUR',
          });
        }

        if (settings.scheduleToHour < 0 || settings.scheduleToHour > 23) {
          errors.push({
            field: 'scheduleToHour',
            message: 'Schedule to hour must be between 0 and 23',
            code: 'INVALID_SCHEDULE_TO_HOUR',
          });
        }

        if (settings.scheduleFromMin < 0 || settings.scheduleFromMin > 59) {
          errors.push({
            field: 'scheduleFromMin',
            message: 'Schedule from minutes must be between 0 and 59',
            code: 'INVALID_SCHEDULE_FROM_MIN',
          });
        }

        if (settings.scheduleToMin < 0 || settings.scheduleToMin > 59) {
          errors.push({
            field: 'scheduleToMin',
            message: 'Schedule to minutes must be between 0 and 59',
            code: 'INVALID_SCHEDULE_TO_MIN',
          });
        }

        if (settings.scheduleDays < 1 || settings.scheduleDays > 127) {
          errors.push({
            field: 'scheduleDays',
            message: 'Schedule days must be a valid bitmask (1-127)',
            code: 'INVALID_SCHEDULE_DAYS',
          });
        }
      }

      // qBittorrent validation
      if (settings.qbittorrent.syncEnabled) {
        if (!settings.qbittorrent.url) {
          errors.push({
            field: 'qbittorrent.url',
            message: 'qBittorrent URL is required when sync is enabled',
            code: 'MISSING_QB_URL',
          });
        } else {
          try {
            new URL(settings.qbittorrent.url);
          } catch {
            errors.push({
              field: 'qbittorrent.url',
              message: 'qBittorrent URL must be a valid URL',
              code: 'INVALID_QB_URL',
            });
          }
        }

        if (!settings.qbittorrent.username) {
          errors.push({
            field: 'qbittorrent.username',
            message: 'qBittorrent username is required when sync is enabled',
            code: 'MISSING_QB_USERNAME',
          });
        }

        if (settings.qbittorrent.syncInterval < 10) {
          errors.push({
            field: 'qbittorrent.syncInterval',
            message: 'Sync interval must be at least 10 seconds',
            code: 'INVALID_SYNC_INTERVAL',
          });
        }
      }

      // Path validation
      if (settings.defaultDownloadPath && !settings.defaultDownloadPath.trim()) {
        errors.push({
          field: 'defaultDownloadPath',
          message: 'Download path cannot be empty if specified',
          code: 'INVALID_DOWNLOAD_PATH',
        });
      }

      if (settings.moveTorrentOnCompletion && !settings.completedTorrentPath.trim()) {
        errors.push({
          field: 'completedTorrentPath',
          message: 'Completed torrent path is required when move on completion is enabled',
          code: 'MISSING_COMPLETED_PATH',
        });
      }

      // Logging validation
      if (!['debug', 'info', 'warn', 'error'].includes(settings.logging.level)) {
        errors.push({
          field: 'logging.level',
          message: 'Log level must be debug, info, warn, or error',
          code: 'INVALID_LOG_LEVEL',
        });
      }

      if (settings.logging.maxLogSize < 1 || settings.logging.maxLogSize > 1000) {
        errors.push({
          field: 'logging.maxLogSize',
          message: 'Maximum log size must be between 1 and 1000 MB',
          code: 'INVALID_LOG_SIZE',
        });
      }

      // Performance validation
      if (settings.performance.cacheSize < 10 || settings.performance.cacheSize > 500) {
        errors.push({
          field: 'performance.cacheSize',
          message: 'Cache size must be between 10 and 500 MB',
          code: 'INVALID_CACHE_SIZE',
        });
      }

      if (settings.performance.maxConcurrentRequests < 1 || settings.performance.maxConcurrentRequests > 50) {
        errors.push({
          field: 'performance.maxConcurrentRequests',
          message: 'Maximum concurrent requests must be between 1 and 50',
          code: 'INVALID_MAX_REQUESTS',
        });
      }

    } catch (error) {
      console.error('Settings validation error:', error);
      errors.push({
        field: 'general',
        message: 'Settings validation failed',
        code: 'VALIDATION_ERROR',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Backup operations
  async createBackup(name: string, description?: string): Promise<string> {
    await this.ensureInitialized();
    
    try {
      const backupId = this.db.createBackup(name, description);
      console.log(`Created settings backup: ${name} (${backupId})`);
      return backupId;
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw new Error('Failed to create settings backup');
    }
  }

  async getBackup(id: string): Promise<SettingsBackup | null> {
    await this.ensureInitialized();
    return this.db.getBackup(id);
  }

  async listBackups(): Promise<BackupMetadata[]> {
    await this.ensureInitialized();
    return this.db.listBackups();
  }

  async restoreBackup(id: string): Promise<{ success: boolean; errors: string[] }> {
    await this.ensureInitialized();
    
    try {
      const result = this.db.restoreBackup(id);
      if (result.success) {
        // Refresh cache after restore
        await this.refreshCache();
        console.log(`Restored settings from backup: ${id}`);
      }
      return result;
    } catch (error) {
      console.error('Failed to restore backup:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  async deleteBackup(id: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.db.deleteBackup(id);
  }

  // Export/Import operations
  async exportSettings(): Promise<string> {
    const settings = await this.getSettings();
    const exportData = {
      version: '1.0.0',
      exportedAt: new Date(),
      settings,
      metadata: {
        appVersion: process.env.NODE_ENV || 'development',
        userAgent: 'Torrent Management System',
        hostname: 'localhost',
      },
    };

    return JSON.stringify(exportData, null, 2);
  }

  async importSettings(settingsJson: string, options: { overwrite?: boolean; categories?: string[] } = {}): Promise<{ success: boolean; errors: string[] }> {
    try {
      const importData = JSON.parse(settingsJson);
      
      // Validate import format
      if (!importData.settings || !importData.version) {
        return {
          success: false,
          errors: ['Invalid settings file format'],
        };
      }

      let settingsToImport = importData.settings;

      // Filter by categories if specified
      if (options.categories && options.categories.length > 0) {
        settingsToImport = this.filterSettingsByCategories(settingsToImport, options.categories);
      }

      // Merge with existing settings if not overwriting
      if (!options.overwrite) {
        const currentSettings = await this.getSettings();
        settingsToImport = { ...currentSettings, ...settingsToImport };
      }

      // Update settings
      const result = await this.updateSettings({
        settings: settingsToImport,
        options: { createBackup: true },
      });

      return {
        success: result.success,
        errors: result.errors,
      };
    } catch (error) {
      console.error('Failed to import settings:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to parse settings file'],
      };
    }
  }

  // Cache management
  private async refreshCache(): Promise<void> {
    try {
      const settings = this.db.getAllSettings() as AppSettings;
      const mergedSettings = { ...DEFAULT_SETTINGS, ...settings };
      const settingsJson = JSON.stringify(mergedSettings);
      
      this.cache = {
        settings: mergedSettings,
        timestamp: Date.now(),
        version: '1.0.0',
        checksum: crypto.createHash('sha256').update(settingsJson).digest('hex'),
      };
    } catch (error) {
      console.error('Failed to refresh settings cache:', error);
      this.cache = null;
      throw error;
    }
  }

  private isCacheValid(): boolean {
    if (!this.cache) return false;
    return (Date.now() - this.cache.timestamp) < this.cacheValidityMs;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  private async createAutoBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return this.createBackup(
      `auto-backup-${timestamp}`,
      'Automatic backup before settings update'
    );
  }

  private filterSettingsByCategories(settings: Partial<AppSettings>, categories: string[]): Partial<AppSettings> {
    const filtered: Partial<AppSettings> = {};
    
    for (const category of categories) {
      switch (category) {
        case 'general':
          filtered.theme = settings.theme;
          filtered.notifications = settings.notifications;
          filtered.language = settings.language;
          filtered.autoUpdate = settings.autoUpdate;
          break;
        case 'download':
          filtered.defaultDownloadPath = settings.defaultDownloadPath;
          filtered.defaultCategory = settings.defaultCategory;
          filtered.autoStartTorrents = settings.autoStartTorrents;
          filtered.maxConcurrentDownloads = settings.maxConcurrentDownloads;
          filtered.deleteCompletedTorrents = settings.deleteCompletedTorrents;
          filtered.moveTorrentOnCompletion = settings.moveTorrentOnCompletion;
          filtered.completedTorrentPath = settings.completedTorrentPath;
          break;
        case 'bandwidth':
          filtered.maxUploadSpeed = settings.maxUploadSpeed;
          filtered.maxDownloadSpeed = settings.maxDownloadSpeed;
          filtered.altSpeedEnabled = settings.altSpeedEnabled;
          filtered.altUploadSpeed = settings.altUploadSpeed;
          filtered.altDownloadSpeed = settings.altDownloadSpeed;
          filtered.scheduleEnabled = settings.scheduleEnabled;
          filtered.scheduleFromHour = settings.scheduleFromHour;
          filtered.scheduleFromMin = settings.scheduleFromMin;
          filtered.scheduleToHour = settings.scheduleToHour;
          filtered.scheduleToMin = settings.scheduleToMin;
          filtered.scheduleDays = settings.scheduleDays;
          break;
        case 'qbittorrent':
          filtered.qbittorrent = settings.qbittorrent;
          break;
        case 'plex':
          filtered.plex = settings.plex;
          break;
        case 'advanced':
          filtered.logging = settings.logging;
          filtered.database = settings.database;
          filtered.performance = settings.performance;
          break;
      }
    }
    
    return filtered;
  }

  // Utility methods
  async getStats() {
    await this.ensureInitialized();
    return this.db.getStats();
  }

  async getSyncHistory(limit?: number) {
    await this.ensureInitialized();
    return this.db.getSyncHistory(limit);
  }

  async getUnresolvedConflicts() {
    await this.ensureInitialized();
    return this.db.getUnresolvedConflicts();
  }

  // Cleanup
  async close(): Promise<void> {
    this.db.close();
    this.isInitialized = false;
    this.cache = null;
  }
}

export const settingsService = new SettingsService();
export default SettingsService;