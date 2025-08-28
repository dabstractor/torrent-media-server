import { NextRequest, NextResponse } from 'next/server';
import { settingsManager } from '@/lib/managers/SettingsManager';
import type { SettingsUpdateRequest, SettingsCategory } from '@/lib/types/settings';

// GET /api/settings - Get current settings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as SettingsCategory | null;
    const includeStats = searchParams.get('includeStats') === 'true';
    
    // Get current settings
    const settings = await settingsManager.getSettings();
    
    let responseData: any = settings;
    
    // Filter by category if requested
    if (category) {
      responseData = filterSettingsByCategory(settings, category);
    }
    
    // Include system stats if requested
    if (includeStats) {
      const systemStatus = await settingsManager.getSystemStatus();
      responseData = {
        settings: responseData,
        systemStatus,
      };
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('Error getting settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get settings',
      },
      { status: 500 }
    );
  }
}

// POST /api/settings - Create or update settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    if (!body.settings) {
      return NextResponse.json(
        {
          success: false,
          error: 'Settings data is required',
        },
        { status: 400 }
      );
    }

    // Prepare update request
    const updateRequest: SettingsUpdateRequest = {
      settings: body.settings,
      category: body.category,
      options: {
        validateOnly: body.validateOnly || false,
        skipSync: body.skipSync || false,
        createBackup: body.createBackup !== false, // Default to true
      },
    };

    // Update settings through manager
    const result = await settingsManager.updateSettings(updateRequest);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          settings: result.updatedSettings,
          validation: result.validation,
          syncResult: result.syncResult,
          backupId: result.backupId,
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.errors.length > 0 ? result.errors[0] : 'Settings update failed',
          details: {
            validation: result.validation,
            syncResult: result.syncResult,
            errors: result.errors,
          },
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update settings',
      },
      { status: 500 }
    );
  }
}

// PUT /api/settings - Same as POST for RESTful compatibility
export async function PUT(request: NextRequest) {
  return POST(request);
}

// DELETE /api/settings - Reset settings to defaults
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const createBackup = searchParams.get('createBackup') !== 'false'; // Default to true
    const category = searchParams.get('category') as SettingsCategory | null;

    // Create backup before reset if requested
    let backupId: string | undefined;
    if (createBackup) {
      try {
        backupId = await settingsManager.createBackup(
          `reset-backup-${Date.now()}`,
          `Backup before ${category ? `${category} ` : ''}settings reset`
        );
      } catch (backupError) {
        console.warn('Failed to create backup before reset:', backupError);
      }
    }

    // Get default settings
    const { DEFAULT_SETTINGS } = await import('@/lib/types/settings');
    let resetSettings = DEFAULT_SETTINGS;

    // Filter to specific category if requested
    if (category) {
      const currentSettings = await settingsManager.getSettings();
      resetSettings = { ...currentSettings };
      applyDefaultsByCategory(resetSettings, category);
    }

    // Apply the reset
    const updateResult = await settingsManager.updateSettings({
      settings: resetSettings,
      category: category || undefined,
      options: {
        createBackup: false, // We already created one above if needed
        skipSync: false,
      },
    });

    if (updateResult.success) {
      return NextResponse.json({
        success: true,
        data: {
          settings: updateResult.updatedSettings,
          backupId,
          resetCategory: category || 'all',
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: updateResult.errors.length > 0 ? updateResult.errors[0] : 'Settings reset failed',
          details: {
            errors: updateResult.errors,
            backupId,
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error resetting settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset settings',
      },
      { status: 500 }
    );
  }
}

// Helper functions

function filterSettingsByCategory(settings: any, category: SettingsCategory): any {
  switch (category) {
    case 'general':
      return {
        theme: settings.theme,
        notifications: settings.notifications,
        language: settings.language,
        autoUpdate: settings.autoUpdate,
      };
    case 'download':
      return {
        defaultDownloadPath: settings.defaultDownloadPath,
        defaultCategory: settings.defaultCategory,
        autoStartTorrents: settings.autoStartTorrents,
        maxConcurrentDownloads: settings.maxConcurrentDownloads,
        deleteCompletedTorrents: settings.deleteCompletedTorrents,
        moveTorrentOnCompletion: settings.moveTorrentOnCompletion,
        completedTorrentPath: settings.completedTorrentPath,
      };
    case 'bandwidth':
      return {
        maxUploadSpeed: settings.maxUploadSpeed,
        maxDownloadSpeed: settings.maxDownloadSpeed,
        altSpeedEnabled: settings.altSpeedEnabled,
        altUploadSpeed: settings.altUploadSpeed,
        altDownloadSpeed: settings.altDownloadSpeed,
        scheduleEnabled: settings.scheduleEnabled,
        scheduleFromHour: settings.scheduleFromHour,
        scheduleFromMin: settings.scheduleFromMin,
        scheduleToHour: settings.scheduleToHour,
        scheduleToMin: settings.scheduleToMin,
        scheduleDays: settings.scheduleDays,
      };
    case 'qbittorrent':
      return {
        qbittorrent: settings.qbittorrent,
      };
    case 'plex':
      return {
        plex: settings.plex,
      };
    case 'advanced':
      return {
        logging: settings.logging,
        database: settings.database,
        performance: settings.performance,
      };
    default:
      return settings;
  }
}

function applyDefaultsByCategory(settings: any, category: SettingsCategory): void {
  const { DEFAULT_SETTINGS } = require('@/lib/types/settings');
  
  switch (category) {
    case 'general':
      settings.theme = DEFAULT_SETTINGS.theme;
      settings.notifications = DEFAULT_SETTINGS.notifications;
      settings.language = DEFAULT_SETTINGS.language;
      settings.autoUpdate = DEFAULT_SETTINGS.autoUpdate;
      break;
    case 'download':
      settings.defaultDownloadPath = DEFAULT_SETTINGS.defaultDownloadPath;
      settings.defaultCategory = DEFAULT_SETTINGS.defaultCategory;
      settings.autoStartTorrents = DEFAULT_SETTINGS.autoStartTorrents;
      settings.maxConcurrentDownloads = DEFAULT_SETTINGS.maxConcurrentDownloads;
      settings.deleteCompletedTorrents = DEFAULT_SETTINGS.deleteCompletedTorrents;
      settings.moveTorrentOnCompletion = DEFAULT_SETTINGS.moveTorrentOnCompletion;
      settings.completedTorrentPath = DEFAULT_SETTINGS.completedTorrentPath;
      break;
    case 'bandwidth':
      settings.maxUploadSpeed = DEFAULT_SETTINGS.maxUploadSpeed;
      settings.maxDownloadSpeed = DEFAULT_SETTINGS.maxDownloadSpeed;
      settings.altSpeedEnabled = DEFAULT_SETTINGS.altSpeedEnabled;
      settings.altUploadSpeed = DEFAULT_SETTINGS.altUploadSpeed;
      settings.altDownloadSpeed = DEFAULT_SETTINGS.altDownloadSpeed;
      settings.scheduleEnabled = DEFAULT_SETTINGS.scheduleEnabled;
      settings.scheduleFromHour = DEFAULT_SETTINGS.scheduleFromHour;
      settings.scheduleFromMin = DEFAULT_SETTINGS.scheduleFromMin;
      settings.scheduleToHour = DEFAULT_SETTINGS.scheduleToHour;
      settings.scheduleToMin = DEFAULT_SETTINGS.scheduleToMin;
      settings.scheduleDays = DEFAULT_SETTINGS.scheduleDays;
      break;
    case 'qbittorrent':
      settings.qbittorrent = DEFAULT_SETTINGS.qbittorrent;
      break;
    case 'plex':
      settings.plex = DEFAULT_SETTINGS.plex;
      break;
    case 'advanced':
      settings.logging = DEFAULT_SETTINGS.logging;
      settings.database = DEFAULT_SETTINGS.database;
      settings.performance = DEFAULT_SETTINGS.performance;
      break;
  }
}