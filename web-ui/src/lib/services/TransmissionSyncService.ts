import type { 
  AppSettings, 
  TransmissionPreferences, 
  SyncResult, 
  SettingsConflict,
} from '@/lib/types/settings';
import TransmissionClient from '@/lib/api/clients/TransmissionClient';
import { settingsService } from './SettingsService';

class TransmissionSyncService {
  private transmissionClient: TransmissionClient;
  private syncInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private lastSyncTime: Date | null = null;
  private syncInProgress = false;

  constructor() {
    // Initialize with default Transmission URL, will be updated from settings
    this.transmissionClient = new TransmissionClient();
  }

  // Initialize the service with current settings
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.updateClientConfig();
      this.isInitialized = true;
      console.log('TransmissionSyncService initialized');
    } catch (error) {
      console.error('Failed to initialize TransmissionSyncService:', error);
      throw error;
    }
  }

  // Update Transmission client configuration from current settings
  private async updateClientConfig(): Promise<void> {
    const settings = await settingsService.getSettings();
    const transmissionSettings = settings.transmission;

    // Create new client instance with current settings
    this.transmissionClient = new TransmissionClient(
      transmissionSettings.url,
      transmissionSettings.username,
      transmissionSettings.password
    );
  }

  // Start automatic synchronization
  async startAutoSync(): Promise<void> {
    await this.ensureInitialized();
    
    const settings = await settingsService.getSettings();
    
    if (!settings.transmission.syncEnabled) {
      console.log('Transmission sync is disabled in settings');
      return;
    }

    // Check if Transmission credentials are configured
    const transmissionSettings = settings.transmission;
    if (!transmissionSettings.url || !transmissionSettings.username || !transmissionSettings.password) {
      console.log('Transmission credentials not configured, auto-sync disabled');
      return;
    }

    // Stop existing interval if running
    this.stopAutoSync();

    const intervalMs = settings.transmission.syncInterval * 1000;
    
    this.syncInterval = setInterval(async () => {
      try {
        await this.syncFromTransmission();
      } catch (error) {
        console.error('Auto-sync failed:', error);
      }
    }, intervalMs);

    console.log(`Started Transmission auto-sync with ${settings.transmission.syncInterval}s interval`);
  }

  // Stop automatic synchronization
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('Stopped Transmission auto-sync');
    }
  }

  // Sync app settings to Transmission
  async syncToTransmission(): Promise<SyncResult> {
    await this.ensureInitialized();
    
    if (this.syncInProgress) {
      return {
        success: false,
        conflicts: [],
        syncedFields: [],
        errors: ['Sync already in progress'],
      };
    }

    const startTime = Date.now();
    this.syncInProgress = true;

    try {
      const appSettings = await settingsService.getSettings();
      const transmissionPreferences = this.mapAppSettingsToTransmissionPreferences(appSettings);
      
      // Get current Transmission preferences for conflict detection
      const currentTransmissionPrefs = await this.transmissionClient.getPreferences();
      const conflicts = this.detectConflicts(appSettings, currentTransmissionPrefs);
      
      // Apply app settings to Transmission
      await this.transmissionClient.setPreferences(transmissionPreferences);
      
      const syncedFields = Object.keys(transmissionPreferences);
      this.lastSyncTime = new Date();

      const result: SyncResult = {
        success: true,
        conflicts,
        syncedFields,
        errors: [],
      };

      console.log(`Synced ${syncedFields.length} settings to Transmission in ${Date.now() - startTime}ms`);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to sync to Transmission:', errorMessage);

      return {
        success: false,
        conflicts: [],
        syncedFields: [],
        errors: [errorMessage],
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  // Sync Transmission settings to app
  async syncFromTransmission(): Promise<SyncResult> {
    await this.ensureInitialized();
    
    if (this.syncInProgress) {
      return {
        success: false,
        conflicts: [],
        syncedFields: [],
        errors: ['Sync already in progress'],
      };
    }

    const startTime = Date.now();
    this.syncInProgress = true;

    try {
      const transmissionPreferences = await this.transmissionClient.getPreferences();
      const currentAppSettings = await settingsService.getSettings();
      
      // Map Transmission preferences to app settings
      const appSettingsUpdates = this.mapTransmissionPreferencesToAppSettings(transmissionPreferences);
      
      // Detect conflicts
      const conflicts = this.detectConflicts(currentAppSettings, transmissionPreferences);
      
      // Apply updates to app settings
      const updateResult = await settingsService.updateSettings({
        settings: appSettingsUpdates,
        options: { skipSync: true }, // Prevent infinite sync loop
      });
      
      const syncedFields = Object.keys(appSettingsUpdates);
      this.lastSyncTime = new Date();

      const result: SyncResult = {
        success: updateResult.success,
        conflicts,
        syncedFields,
        errors: updateResult.errors,
      };

      console.log(`Synced ${syncedFields.length} settings from Transmission in ${Date.now() - startTime}ms`);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to sync from Transmission:', errorMessage);

      return {
        success: false,
        conflicts: [],
        syncedFields: [],
        errors: [errorMessage],
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  // Bidirectional sync with conflict resolution
  async syncBidirectional(): Promise<SyncResult> {
    await this.ensureInitialized();

    try {
      // Get current state from both sides
      const appSettings = await settingsService.getSettings();
      const transmissionPreferences = await this.transmissionClient.getPreferences();
      
      // Detect conflicts
      const conflicts = this.detectConflicts(appSettings, transmissionPreferences);
      
      if (conflicts.length > 0) {
        console.log(`Found ${conflicts.length} conflicts during bidirectional sync`);
        
        // For now, app settings win in conflicts (could be made configurable)
        const resolvedSettings = this.resolveConflicts(appSettings, transmissionPreferences, conflicts, 'app_wins');
        
        // Apply resolved settings to Transmission
        const transmissionUpdates = this.mapAppSettingsToTransmissionPreferences(resolvedSettings);
        await this.transmissionClient.setPreferences(transmissionUpdates);
        
        return {
          success: true,
          conflicts,
          syncedFields: Object.keys(transmissionUpdates),
          errors: [],
        };
      } else {
        // No conflicts, just ensure both sides are in sync
        return await this.syncToTransmission();
      }
    } catch (error) {
      console.error('Bidirectional sync failed:', error);
      return {
        success: false,
        conflicts: [],
        syncedFields: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  // Test Transmission connection
  async testConnection(): Promise<{ connected: boolean; error?: string; version?: string }> {
    await this.ensureInitialized();
    return this.transmissionClient.validateConnection();
  }

  // Check if Transmission sync is enabled and working
  async getSyncStatus(): Promise<{
    enabled: boolean;
    connected: boolean;
    authenticated: boolean;
    lastSync: Date | null;
    autoSyncActive: boolean;
    error: string | undefined;
  }> {
    await this.ensureInitialized();
    
    const settings = await settingsService.getSettings();
    const enabled = settings.transmission.syncEnabled;
    
    if (!enabled) {
      return {
        enabled: false,
        connected: false,
        authenticated: false,
        lastSync: this.lastSyncTime,
        autoSyncActive: false,
        error: undefined,
      };
    }

    try {
      const connectionTest = await this.testConnection();
      
      return {
        enabled: true,
        connected: connectionTest.connected,
        authenticated: connectionTest.connected && !connectionTest.error,
        lastSync: this.lastSyncTime,
        autoSyncActive: this.syncInterval !== null,
        error: connectionTest.error,
      };
    } catch (error) {
      return {
        enabled: true,
        connected: false,
        authenticated: false,
        lastSync: this.lastSyncTime,
        autoSyncActive: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Settings mapping methods

  private mapAppSettingsToTransmissionPreferences(appSettings: AppSettings): Partial<TransmissionPreferences> {
    return {
      // Bandwidth settings
      'speed-limit-down-enabled': appSettings.maxDownloadSpeed > 0,
      'speed-limit-down': appSettings.maxDownloadSpeed,
      'speed-limit-up-enabled': appSettings.maxUploadSpeed > 0,
      'speed-limit-up': appSettings.maxUploadSpeed,
      
      // Alternative speed limits
      'alt-speed-enabled': appSettings.altSpeedEnabled,
      'alt-speed-down': appSettings.altDownloadSpeed,
      'alt-speed-up': appSettings.altUploadSpeed,
      
      // Scheduler - CRITICAL: Convert hours to minutes since midnight
      'alt-speed-time-enabled': appSettings.scheduleEnabled,
      'alt-speed-time-begin': appSettings.scheduleFromHour * 60 + appSettings.scheduleFromMin,
      'alt-speed-time-end': appSettings.scheduleToHour * 60 + appSettings.scheduleToMin,
      'alt-speed-time-day': appSettings.scheduleDays,
      
      // Queue settings
      'download-queue-enabled': appSettings.maxConcurrentDownloads > 0,
      'download-queue-size': appSettings.maxConcurrentDownloads,
      
      // Download settings
      'start-added-torrents': appSettings.autoStartTorrents,
      'download-dir': appSettings.defaultDownloadPath,
    };
  }

  private mapTransmissionPreferencesToAppSettings(transmissionPrefs: TransmissionPreferences): Partial<AppSettings> {
    return {
      // Bandwidth settings
      maxDownloadSpeed: transmissionPrefs['speed-limit-down-enabled'] ? transmissionPrefs['speed-limit-down'] : 0,
      maxUploadSpeed: transmissionPrefs['speed-limit-up-enabled'] ? transmissionPrefs['speed-limit-up'] : 0,
      
      // Alternative speed limits
      altSpeedEnabled: transmissionPrefs['alt-speed-enabled'] || false,
      altDownloadSpeed: transmissionPrefs['alt-speed-down'] || 0,
      altUploadSpeed: transmissionPrefs['alt-speed-up'] || 0,
      
      // Scheduler - CRITICAL: Convert minutes to hours and minutes
      scheduleEnabled: transmissionPrefs['alt-speed-time-enabled'] || false,
      scheduleFromHour: Math.floor((transmissionPrefs['alt-speed-time-begin'] || 0) / 60),
      scheduleFromMin: (transmissionPrefs['alt-speed-time-begin'] || 0) % 60,
      scheduleToHour: Math.floor((transmissionPrefs['alt-speed-time-end'] || 0) / 60),
      scheduleToMin: (transmissionPrefs['alt-speed-time-end'] || 0) % 60,
      scheduleDays: transmissionPrefs['alt-speed-time-day'] || 127,
      
      // Queue settings
      maxConcurrentDownloads: transmissionPrefs['download-queue-enabled'] ? 
        transmissionPrefs['download-queue-size'] : 0,
      
      // Download settings
      autoStartTorrents: transmissionPrefs['start-added-torrents'] !== false,
      defaultDownloadPath: transmissionPrefs['download-dir'] || '',
    };
  }

  // Conflict detection and resolution

  private detectConflicts(appSettings: AppSettings, transmissionPrefs: TransmissionPreferences): SettingsConflict[] {
    const conflicts: SettingsConflict[] = [];
    
    // Check for differences in synced fields
    const checks = [
      { 
        field: 'maxDownloadSpeed', 
        appValue: appSettings.maxDownloadSpeed, 
        transmissionValue: transmissionPrefs['speed-limit-down-enabled'] ? transmissionPrefs['speed-limit-down'] : 0
      },
      { 
        field: 'maxUploadSpeed', 
        appValue: appSettings.maxUploadSpeed, 
        transmissionValue: transmissionPrefs['speed-limit-up-enabled'] ? transmissionPrefs['speed-limit-up'] : 0
      },
      { 
        field: 'altSpeedEnabled', 
        appValue: appSettings.altSpeedEnabled, 
        transmissionValue: transmissionPrefs['alt-speed-enabled']
      },
      { 
        field: 'altDownloadSpeed', 
        appValue: appSettings.altDownloadSpeed, 
        transmissionValue: transmissionPrefs['alt-speed-down']
      },
      { 
        field: 'altUploadSpeed', 
        appValue: appSettings.altUploadSpeed, 
        transmissionValue: transmissionPrefs['alt-speed-up']
      },
      { 
        field: 'scheduleEnabled', 
        appValue: appSettings.scheduleEnabled, 
        transmissionValue: transmissionPrefs['alt-speed-time-enabled']
      },
      { 
        field: 'scheduleDays', 
        appValue: appSettings.scheduleDays, 
        transmissionValue: transmissionPrefs['alt-speed-time-day']
      },
      { 
        field: 'maxConcurrentDownloads', 
        appValue: appSettings.maxConcurrentDownloads, 
        transmissionValue: transmissionPrefs['download-queue-enabled'] ? transmissionPrefs['download-queue-size'] : 0
      },
      { 
        field: 'autoStartTorrents', 
        appValue: appSettings.autoStartTorrents, 
        transmissionValue: transmissionPrefs['start-added-torrents']
      },
    ];

    for (const check of checks) {
      if (check.appValue !== check.transmissionValue) {
        conflicts.push({
          field: check.field,
          appValue: check.appValue,
          qbValue: check.transmissionValue, // Keep qbValue for compatibility
          resolution: 'manual',
          timestamp: new Date(),
        });
      }
    }

    return conflicts;
  }

  private resolveConflicts(
    appSettings: AppSettings, 
    transmissionPrefs: TransmissionPreferences, 
    conflicts: SettingsConflict[], 
    strategy: 'app_wins' | 'qb_wins' | 'manual'
  ): AppSettings {
    const resolvedSettings = { ...appSettings };

    if (conflicts.length > 0 && strategy === 'qb_wins') {
      // Apply Transmission values to app settings
      const transmissionUpdate = this.mapTransmissionPreferencesToAppSettings(transmissionPrefs);
      return { ...resolvedSettings, ...transmissionUpdate };
    }
    
    // For 'app_wins' strategy, we keep the app settings as-is
    // For 'manual' strategy, conflicts would need to be resolved by user interaction
    return resolvedSettings;
  }

  // Utility methods

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  // Status getters
  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  isSyncInProgress(): boolean {
    return this.syncInProgress;
  }

  isAutoSyncActive(): boolean {
    return this.syncInterval !== null;
  }

  // Cleanup
  async destroy(): Promise<void> {
    this.stopAutoSync();
    this.transmissionClient.clearSession();
    this.isInitialized = false;
    this.lastSyncTime = null;
    console.log('TransmissionSyncService destroyed');
  }
}

export const transmissionSyncService = new TransmissionSyncService();
export default TransmissionSyncService;