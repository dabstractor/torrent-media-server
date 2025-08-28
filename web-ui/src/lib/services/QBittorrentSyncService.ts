import type { 
  AppSettings, 
  QBPreferences, 
  SyncResult, 
  SettingsConflict,
} from '@/lib/types/settings';
import QBittorrentClient from '@/lib/api/clients/QBittorrentClient';
import { settingsService } from './SettingsService';

class QBittorrentSyncService {
  private qbClient: QBittorrentClient;
  private syncInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private lastSyncTime: Date | null = null;
  private syncInProgress = false;

  constructor() {
    // Initialize with default qBittorrent URL, will be updated from settings
    this.qbClient = new QBittorrentClient();
  }

  // Initialize the service with current settings
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.updateClientConfig();
      this.isInitialized = true;
      console.log('QBittorrentSyncService initialized');
    } catch (error) {
      console.error('Failed to initialize QBittorrentSyncService:', error);
      throw error;
    }
  }

  // Update qBittorrent client configuration from current settings
  private async updateClientConfig(): Promise<void> {
    const settings = await settingsService.getSettings();
    const qbSettings = settings.qbittorrent;

    // Create new client instance with current settings
    this.qbClient = new QBittorrentClient(qbSettings.url);

    // Authenticate if auto-login is enabled and we have credentials
    if (qbSettings.autoLogin && qbSettings.username && qbSettings.password) {
      try {
        await this.qbClient.login(qbSettings.username, qbSettings.password);
      } catch (error) {
        console.warn('Auto-login to qBittorrent failed:', error);
        // Don't throw here, let other methods handle authentication as needed
      }
    }
  }

  // Start automatic synchronization
  async startAutoSync(): Promise<void> {
    await this.ensureInitialized();
    
    const settings = await settingsService.getSettings();
    
    if (!settings.qbittorrent.syncEnabled) {
      console.log('qBittorrent sync is disabled in settings');
      return;
    }

    // Stop existing interval if running
    this.stopAutoSync();

    const intervalMs = settings.qbittorrent.syncInterval * 1000;
    
    this.syncInterval = setInterval(async () => {
      try {
        await this.syncFromQBittorrent();
      } catch (error) {
        console.error('Auto-sync failed:', error);
      }
    }, intervalMs);

    console.log(`Started qBittorrent auto-sync with ${settings.qbittorrent.syncInterval}s interval`);
  }

  // Stop automatic synchronization
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('Stopped qBittorrent auto-sync');
    }
  }

  // Sync app settings to qBittorrent
  async syncToQBittorrent(): Promise<SyncResult> {
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
      await this.ensureAuthenticated();
      
      const appSettings = await settingsService.getSettings();
      const qbPreferences = this.mapAppSettingsToQBPreferences(appSettings);
      
      // Get current qBittorrent preferences for conflict detection
      const currentQBPrefs = await this.qbClient.getPreferences();
      const conflicts = this.detectConflicts(appSettings, currentQBPrefs);
      
      // Apply app settings to qBittorrent
      await this.qbClient.setPreferences(qbPreferences);
      
      const syncedFields = Object.keys(qbPreferences);
      this.lastSyncTime = new Date();

      // Log successful sync
      settingsService.getSyncHistory && await settingsService.getSyncHistory();

      const result: SyncResult = {
        success: true,
        conflicts,
        syncedFields,
        errors: [],
      };

      console.log(`Synced ${syncedFields.length} settings to qBittorrent in ${Date.now() - startTime}ms`);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to sync to qBittorrent:', errorMessage);

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

  // Sync qBittorrent settings to app
  async syncFromQBittorrent(): Promise<SyncResult> {
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
      await this.ensureAuthenticated();
      
      const qbPreferences = await this.qbClient.getPreferences();
      const currentAppSettings = await settingsService.getSettings();
      
      // Map qBittorrent preferences to app settings
      const appSettingsUpdates = this.mapQBPreferencesToAppSettings(qbPreferences);
      
      // Detect conflicts
      const conflicts = this.detectConflicts(currentAppSettings, qbPreferences);
      
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

      console.log(`Synced ${syncedFields.length} settings from qBittorrent in ${Date.now() - startTime}ms`);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to sync from qBittorrent:', errorMessage);

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
      const qbPreferences = await this.qbClient.getPreferences();
      
      // Detect conflicts
      const conflicts = this.detectConflicts(appSettings, qbPreferences);
      
      if (conflicts.length > 0) {
        console.log(`Found ${conflicts.length} conflicts during bidirectional sync`);
        
        // For now, app settings win in conflicts (could be made configurable)
        const resolvedSettings = this.resolveConflicts(appSettings, qbPreferences, conflicts, 'app_wins');
        
        // Apply resolved settings to qBittorrent
        const qbUpdates = this.mapAppSettingsToQBPreferences(resolvedSettings);
        await this.qbClient.setPreferences(qbUpdates);
        
        return {
          success: true,
          conflicts,
          syncedFields: Object.keys(qbUpdates),
          errors: [],
        };
      } else {
        // No conflicts, just ensure both sides are in sync
        return await this.syncToQBittorrent();
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

  // Test qBittorrent connection
  async testConnection(): Promise<{ connected: boolean; error?: string; version?: string }> {
    await this.ensureInitialized();
    return this.qbClient.validateConnection();
  }

  // Check if qBittorrent sync is enabled and working
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
    const enabled = settings.qbittorrent.syncEnabled;
    
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

  private mapAppSettingsToQBPreferences(appSettings: AppSettings): Partial<QBPreferences> {
    return {
      // Bandwidth settings
      max_upload: appSettings.maxUploadSpeed,
      max_download: appSettings.maxDownloadSpeed,
      alt_up_limit: appSettings.altUploadSpeed,
      alt_dl_limit: appSettings.altDownloadSpeed,
      alt_speeds_on: appSettings.altSpeedEnabled,
      
      // Scheduling
      scheduler_enabled: appSettings.scheduleEnabled,
      schedule_from_hour: appSettings.scheduleFromHour,
      schedule_from_min: appSettings.scheduleFromMin,
      schedule_to_hour: appSettings.scheduleToHour,
      schedule_to_min: appSettings.scheduleToMin,
      scheduler_days: appSettings.scheduleDays,
      
      // Download settings
      max_active_downloads: appSettings.maxConcurrentDownloads,
      queueing_enabled: true, // Always enable queueing for concurrent downloads to work
      
      // Other preferences that map directly
      autorun_enabled: appSettings.autoStartTorrents,
    };
  }

  private mapQBPreferencesToAppSettings(qbPrefs: QBPreferences): Partial<AppSettings> {
    return {
      // Bandwidth settings
      maxUploadSpeed: qbPrefs.max_upload || 0,
      maxDownloadSpeed: qbPrefs.max_download || 0,
      altUploadSpeed: qbPrefs.alt_up_limit || 0,
      altDownloadSpeed: qbPrefs.alt_dl_limit || 0,
      altSpeedEnabled: qbPrefs.alt_speeds_on || false,
      
      // Scheduling
      scheduleEnabled: qbPrefs.scheduler_enabled || false,
      scheduleFromHour: qbPrefs.schedule_from_hour || 8,
      scheduleFromMin: qbPrefs.schedule_from_min || 0,
      scheduleToHour: qbPrefs.schedule_to_hour || 20,
      scheduleToMin: qbPrefs.schedule_to_min || 0,
      scheduleDays: qbPrefs.scheduler_days || 127,
      
      // Download settings
      maxConcurrentDownloads: qbPrefs.max_active_downloads || 3,
      autoStartTorrents: qbPrefs.autorun_enabled || true,
    };
  }

  // Conflict detection and resolution

  private detectConflicts(appSettings: AppSettings, qbPrefs: QBPreferences): SettingsConflict[] {
    const conflicts: SettingsConflict[] = [];
    
    // Check for differences in synced fields
    const checks = [
      { field: 'maxUploadSpeed', appValue: appSettings.maxUploadSpeed, qbValue: qbPrefs.max_upload },
      { field: 'maxDownloadSpeed', appValue: appSettings.maxDownloadSpeed, qbValue: qbPrefs.max_download },
      { field: 'altUploadSpeed', appValue: appSettings.altUploadSpeed, qbValue: qbPrefs.alt_up_limit },
      { field: 'altDownloadSpeed', appValue: appSettings.altDownloadSpeed, qbValue: qbPrefs.alt_dl_limit },
      { field: 'altSpeedEnabled', appValue: appSettings.altSpeedEnabled, qbValue: qbPrefs.alt_speeds_on },
      { field: 'scheduleEnabled', appValue: appSettings.scheduleEnabled, qbValue: qbPrefs.scheduler_enabled },
      { field: 'scheduleFromHour', appValue: appSettings.scheduleFromHour, qbValue: qbPrefs.schedule_from_hour },
      { field: 'scheduleFromMin', appValue: appSettings.scheduleFromMin, qbValue: qbPrefs.schedule_from_min },
      { field: 'scheduleToHour', appValue: appSettings.scheduleToHour, qbValue: qbPrefs.schedule_to_hour },
      { field: 'scheduleToMin', appValue: appSettings.scheduleToMin, qbValue: qbPrefs.schedule_to_min },
      { field: 'scheduleDays', appValue: appSettings.scheduleDays, qbValue: qbPrefs.scheduler_days },
      { field: 'maxConcurrentDownloads', appValue: appSettings.maxConcurrentDownloads, qbValue: qbPrefs.max_active_downloads },
      { field: 'autoStartTorrents', appValue: appSettings.autoStartTorrents, qbValue: qbPrefs.autorun_enabled },
    ];

    for (const check of checks) {
      if (check.appValue !== check.qbValue) {
        conflicts.push({
          field: check.field,
          appValue: check.appValue,
          qbValue: check.qbValue,
          resolution: 'manual',
          timestamp: new Date(),
        });
      }
    }

    return conflicts;
  }

  private resolveConflicts(
    appSettings: AppSettings, 
    qbPrefs: QBPreferences, 
    conflicts: SettingsConflict[], 
    strategy: 'app_wins' | 'qb_wins' | 'manual'
  ): AppSettings {
    let resolvedSettings = { ...appSettings };

    for (const conflict of conflicts) {
      if (strategy === 'qb_wins') {
        // Apply qBittorrent values to app settings
        switch (conflict.field) {
          case 'maxUploadSpeed':
            resolvedSettings.maxUploadSpeed = qbPrefs.max_upload || 0;
            break;
          case 'maxDownloadSpeed':
            resolvedSettings.maxDownloadSpeed = qbPrefs.max_download || 0;
            break;
          // Add more cases as needed
        }
      }
      // For 'app_wins' strategy, we keep the app settings as-is
      // For 'manual' strategy, conflicts would need to be resolved by user interaction
    }

    return resolvedSettings;
  }

  // Utility methods

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.qbClient.isAuthenticated()) {
      const settings = await settingsService.getSettings();
      const { username, password } = settings.qbittorrent;
      
      if (!username || !password) {
        throw new Error('qBittorrent credentials not configured');
      }
      
      await this.qbClient.login(username, password);
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
    this.qbClient.clearSession();
    this.isInitialized = false;
    this.lastSyncTime = null;
    console.log('QBittorrentSyncService destroyed');
  }
}

export const qbittorrentSyncService = new QBittorrentSyncService();
export default QBittorrentSyncService;