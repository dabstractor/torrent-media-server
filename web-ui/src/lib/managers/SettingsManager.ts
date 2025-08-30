import { settingsService } from '@/lib/services/SettingsService';
import { transmissionSyncService } from '@/lib/services/TransmissionSyncService';
import type { 
  AppSettings, 
  SettingsUpdateRequest,
  SettingsUpdateResult,
  SyncResult,
  SettingsBackup,
  BackupMetadata,
  ValidationResult,
} from '@/lib/types/settings';

class SettingsManager {
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  // Initialize the manager and all dependent services
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    if (this.initializationPromise) {
      await this.initializationPromise;
      return this.isInitialized;
    }

    this.initializationPromise = this.performInitialization();
    await this.initializationPromise;
    return this.isInitialized;
  }

  private async performInitialization(): Promise<void> {
    try {
      // Initialize services in dependency order
      console.log('Initializing SettingsManager...');
      
      // Initialize settings service first
      await settingsService.initialize();
      console.log('SettingsService initialized');
      
      // Initialize Transmission sync service
      await transmissionSyncService.initialize();
      console.log('TransmissionSyncService initialized');
      
      // Start auto-sync if enabled
      const settings = await settingsService.getSettings();
      if (settings.transmission.syncEnabled) {
        await transmissionSyncService.startAutoSync();
        console.log('Transmission auto-sync started');
      }
      
      this.isInitialized = true;
      console.log('SettingsManager initialization complete');
      
    } catch (error) {
      console.error('Failed to initialize SettingsManager:', error);
      this.isInitialized = false;
      throw error;
    } finally {
      this.initializationPromise = null;
    }
  }

  // Check if manager is ready
  isReady(): boolean {
    return this.isInitialized;
  }

  // Get current settings
  async getSettings(): Promise<AppSettings> {
    if (!this.isReady()) {
      await this.initialize();
    }
    
    return settingsService.getSettings();
  }

  // Update settings with comprehensive orchestration
  async updateSettings(request: SettingsUpdateRequest): Promise<SettingsUpdateResult> {
    if (!this.isReady()) {
      await this.initialize();
    }

    const startTime = Date.now();
    let backupId: string | undefined;
    let rollbackRequired = false;
    
    try {
      // Get current settings for potential rollback
      const currentSettings = await settingsService.getSettings();
      
      // Create backup if requested or if this is a significant change
      if (request.options?.createBackup || this.isSignificantChange(request.settings)) {
        try {
          backupId = await settingsService.createBackup(
            `pre-update-${Date.now()}`,
            'Automatic backup before settings update'
          );
          console.log(`Created backup ${backupId} before settings update`);
        } catch (backupError) {
          console.warn('Failed to create backup, continuing with update:', backupError);
        }
      }

      // Update settings in the service
      const updateResult = await settingsService.updateSettings(request);
      
      if (!updateResult.success) {
        return updateResult;
      }

      // Handle Transmission synchronization if enabled and not explicitly skipped
      let syncResult: SyncResult | undefined;
      if (!request.options?.skipSync) {
        try {
          const updatedSettings = updateResult.updatedSettings;
          
          if (updatedSettings.transmission.syncEnabled) {
            // Check if Transmission-related settings changed
            if (this.transmissionSettingsChanged(request.settings)) {
              // Update Transmission client configuration if connection settings changed
              await transmissionSyncService.initialize();
            }
            
            // Sync to Transmission
            syncResult = await transmissionSyncService.syncToTransmission();
            
            if (!syncResult.success) {
              console.warn('Transmission sync failed:', syncResult.errors);
              rollbackRequired = true;
            }
            
            // Restart auto-sync with new interval if it changed
            if (this.syncIntervalChanged(request.settings)) {
              await transmissionSyncService.startAutoSync();
            }
          } else if (currentSettings.transmission.syncEnabled) {
            // Sync was disabled, stop auto-sync
            transmissionSyncService.stopAutoSync();
          }
        } catch (syncError) {
          console.error('Settings sync failed:', syncError);
          rollbackRequired = true;
          syncResult = {
            success: false,
            conflicts: [],
            syncedFields: [],
            errors: [syncError instanceof Error ? syncError.message : 'Sync failed'],
          };
        }
      }

      // Rollback if sync failed and rollback is required
      if (rollbackRequired && backupId) {
        console.log(`Rolling back settings due to sync failure`);
        try {
          const rollbackResult = await settingsService.restoreBackup(backupId);
          if (rollbackResult.success) {
            console.log('Successfully rolled back settings');
            return {
              success: false,
              updatedSettings: currentSettings,
              validation: updateResult.validation,
              syncResult,
              errors: ['Settings rolled back due to sync failure', ...(syncResult?.errors || [])],
            };
          } else {
            console.error('Rollback failed:', rollbackResult.errors);
          }
        } catch (rollbackError) {
          console.error('Critical error during rollback:', rollbackError);
        }
      }

      // Return comprehensive result
      const result: SettingsUpdateResult = {
        success: updateResult.success && (!syncResult || syncResult.success),
        updatedSettings: updateResult.updatedSettings,
        validation: updateResult.validation,
        syncResult,
        backupId,
        errors: [...updateResult.errors, ...(syncResult?.errors || [])],
      };

      console.log(`Settings update completed in ${Date.now() - startTime}ms`);
      return result;

    } catch (error) {
      console.error('Settings update failed:', error);
      
      return {
        success: false,
        updatedSettings: await this.getSettings(),
        validation: { isValid: false, errors: [] },
        backupId,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  // Validate settings without applying them
  async validateSettings(settings: AppSettings): Promise<ValidationResult> {
    if (!this.isReady()) {
      await this.initialize();
    }
    
    return settingsService.validateSettings(settings);
  }

  // Backup operations with orchestration
  async createBackup(name: string, description?: string): Promise<string> {
    if (!this.isReady()) {
      await this.initialize();
    }
    
    return settingsService.createBackup(name, description);
  }

  async restoreBackup(id: string): Promise<{ success: boolean; errors: string[] }> {
    if (!this.isReady()) {
      await this.initialize();
    }
    
    try {
      // Create backup of current state before restore
      const preRestoreBackup = await settingsService.createBackup(
        `pre-restore-${Date.now()}`,
        'Automatic backup before restore operation'
      );
      
      // Restore the backup
      const restoreResult = await settingsService.restoreBackup(id);
      
      if (restoreResult.success) {
        // Restart services with restored settings
        await this.initialize();
        console.log(`Successfully restored settings from backup ${id}`);
      }
      
      return {
        success: restoreResult.success,
        errors: restoreResult.success ? [] : restoreResult.errors,
      };
      
    } catch (error) {
      console.error('Backup restore failed:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Restore failed'],
      };
    }
  }

  async listBackups(): Promise<BackupMetadata[]> {
    if (!this.isReady()) {
      await this.initialize();
    }
    
    return settingsService.listBackups();
  }

  async deleteBackup(id: string): Promise<boolean> {
    if (!this.isReady()) {
      await this.initialize();
    }
    
    return settingsService.deleteBackup(id);
  }

  // qBittorrent sync operations
  async syncToQBittorrent(): Promise<SyncResult> {
    if (!this.isReady()) {
      await this.initialize();
    }
    
    const settings = await settingsService.getSettings();
    if (!settings.qbittorrent.syncEnabled) {
      return {
        success: false,
        conflicts: [],
        syncedFields: [],
        errors: ['qBittorrent sync is disabled'],
      };
    }
    
    return qbittorrentSyncService.syncToQBittorrent();
  }

  async syncFromQBittorrent(): Promise<SyncResult> {
    if (!this.isReady()) {
      await this.initialize();
    }
    
    const settings = await settingsService.getSettings();
    if (!settings.qbittorrent.syncEnabled) {
      return {
        success: false,
        conflicts: [],
        syncedFields: [],
        errors: ['qBittorrent sync is disabled'],
      };
    }
    
    return qbittorrentSyncService.syncFromQBittorrent();
  }

  async testQBittorrentConnection(): Promise<{ connected: boolean; error?: string; version?: string }> {
    if (!this.isReady()) {
      await this.initialize();
    }
    
    return qbittorrentSyncService.testConnection();
  }

  // Status and monitoring
  async getSystemStatus(): Promise<{
    settingsService: { initialized: boolean; cacheValid: boolean; stats: any };
    qbittorrentSync: { 
      enabled: boolean; 
      connected: boolean; 
      authenticated: boolean; 
      lastSync: Date | null;
      autoSyncActive: boolean;
      error: string | undefined;
    };
    manager: { initialized: boolean };
  }> {
    const status = {
      manager: { initialized: this.isInitialized },
      settingsService: { 
        initialized: false, 
        cacheValid: false, 
        stats: null as any 
      },
      qbittorrentSync: {
        enabled: false,
        connected: false,
        authenticated: false,
        lastSync: null as Date | null,
        autoSyncActive: false,
        error: undefined as string | undefined,
      },
    };

    if (this.isReady()) {
      try {
        status.settingsService.initialized = true;
        status.settingsService.stats = await settingsService.getStats();
        
        status.qbittorrentSync = await qbittorrentSyncService.getSyncStatus();
      } catch (error) {
        console.error('Failed to get system status:', error);
      }
    }

    return status;
  }

  async getSyncHistory(limit?: number) {
    if (!this.isReady()) {
      await this.initialize();
    }
    
    return settingsService.getSyncHistory(limit);
  }

  // Export/Import operations
  async exportSettings(): Promise<string> {
    if (!this.isReady()) {
      await this.initialize();
    }
    
    return settingsService.exportSettings();
  }

  async importSettings(settingsJson: string, options: { overwrite?: boolean; categories?: string[] } = {}): Promise<{ success: boolean; errors: string[] }> {
    if (!this.isReady()) {
      await this.initialize();
    }
    
    try {
      // Create backup before import
      const backupId = await settingsService.createBackup(
        `pre-import-${Date.now()}`,
        'Automatic backup before settings import'
      );
      
      const result = await settingsService.importSettings(settingsJson, options);
      
      if (result.success) {
        // Restart services with imported settings
        await this.initialize();
        console.log('Successfully imported settings');
      }
      
      return result;
    } catch (error) {
      console.error('Settings import failed:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Import failed'],
      };
    }
  }

  // Private helper methods

  private isSignificantChange(settings: Partial<AppSettings>): boolean {
    // Consider changes to qBittorrent, Plex, or core system settings as significant
    return !!(
      settings.qbittorrent ||
      settings.plex ||
      settings.database ||
      settings.logging ||
      settings.performance
    );
  }

  private transmissionSettingsChanged(settings: Partial<AppSettings>): boolean {
    return !!(settings.transmission && (
      settings.transmission.url ||
      settings.transmission.username ||
      settings.transmission.password ||
      settings.transmission.syncEnabled !== undefined
    ));
  }

  private syncIntervalChanged(settings: Partial<AppSettings>): boolean {
    return !!(settings.transmission?.syncInterval);
  }

  // Cleanup and shutdown
  async shutdown(): Promise<void> {
    if (this.isReady()) {
      console.log('Shutting down SettingsManager...');
      
      try {
        transmissionSyncService.stopAutoSync();
        await transmissionSyncService.destroy();
        await settingsService.close();
        
        this.isInitialized = false;
        console.log('SettingsManager shutdown complete');
      } catch (error) {
        console.error('Error during SettingsManager shutdown:', error);
      }
    }
  }
}

export const settingsManager = new SettingsManager();
export default SettingsManager;