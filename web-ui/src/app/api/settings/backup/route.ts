import { NextRequest, NextResponse } from 'next/server';
import { settingsManager } from '@/lib/managers/SettingsManager';

// GET /api/settings/backup - List all backups or get specific backup details
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const backupId = searchParams.get('id');
    const includeSettings = searchParams.get('includeSettings') === 'true';

    if (backupId) {
      // Get specific backup details
      const { settingsService } = await import('@/lib/services/SettingsService');
      const backup = await settingsService.getBackup(backupId);
      
      if (!backup) {
        return NextResponse.json(
          {
            success: false,
            error: 'Backup not found',
          },
          { status: 404 }
        );
      }

      let responseData: any = {
        id: backup.id,
        name: backup.name,
        description: backup.description,
        createdAt: backup.createdAt.toISOString(),
        version: backup.version,
        checksum: backup.checksum,
      };

      // Include settings if requested (for preview/validation)
      if (includeSettings) {
        responseData.settings = backup.settings;
      }

      return NextResponse.json({
        success: true,
        data: responseData,
      });
    } else {
      // List all backups
      const backups = await settingsManager.listBackups();
      
      return NextResponse.json({
        success: true,
        data: {
          backups: backups.map(backup => ({
            id: backup.id,
            name: backup.name,
            description: backup.description,
            createdAt: backup.createdAt.toISOString(),
            version: backup.version,
            size: backup.size,
          })),
          total: backups.length,
          timestamp: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    console.error('Error getting backups:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get backups',
      },
      { status: 500 }
    );
  }
}

// POST /api/settings/backup - Create backup or restore from backup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operation, name, description, backupId, options } = body;

    const validOperations = ['create', 'restore'];
    if (!operation || !validOperations.includes(operation)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid operation. Must be one of: ${validOperations.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    if (operation === 'create') {
      // Create new backup
      if (!name) {
        return NextResponse.json(
          {
            success: false,
            error: 'Backup name is required',
          },
          { status: 400 }
        );
      }

      try {
        const newBackupId = await settingsManager.createBackup(name, description);
        const executionTime = Date.now() - startTime;

        return NextResponse.json({
          success: true,
          data: {
            operation: 'create',
            backupId: newBackupId,
            name,
            description,
            executionTime,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create backup',
          },
          { status: 500 }
        );
      }
    } else if (operation === 'restore') {
      // Restore from backup
      if (!backupId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Backup ID is required for restore operation',
          },
          { status: 400 }
        );
      }

      try {
        const restoreResult = await settingsManager.restoreBackup(backupId);
        const executionTime = Date.now() - startTime;

        if (restoreResult.success) {
          return NextResponse.json({
            success: true,
            data: {
              operation: 'restore',
              backupId,
              executionTime,
              timestamp: new Date().toISOString(),
            },
          });
        } else {
          return NextResponse.json(
            {
              success: false,
              error: restoreResult.errors.length > 0 ? restoreResult.errors[0] : 'Restore failed',
              details: {
                backupId,
                errors: restoreResult.errors,
                executionTime,
              },
            },
            { status: 400 }
          );
        }
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to restore backup',
          },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('Error in backup operation:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Backup operation failed',
      },
      { status: 500 }
    );
  }
}

// PUT /api/settings/backup - Import/Export backup operations
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { operation, data, options } = body;

    const validOperations = ['export', 'import'];
    if (!operation || !validOperations.includes(operation)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid operation. Must be one of: ${validOperations.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    if (operation === 'export') {
      // Export current settings as JSON
      try {
        const exportData = await settingsManager.exportSettings();
        const executionTime = Date.now() - startTime;

        return NextResponse.json({
          success: true,
          data: {
            operation: 'export',
            exportData,
            executionTime,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: error instanceof Error ? error.message : 'Export failed',
          },
          { status: 500 }
        );
      }
    } else if (operation === 'import') {
      // Import settings from JSON
      if (!data) {
        return NextResponse.json(
          {
            success: false,
            error: 'Import data is required',
          },
          { status: 400 }
        );
      }

      try {
        const importOptions = {
          overwrite: options?.overwrite || false,
          categories: options?.categories || undefined,
        };

        const importResult = await settingsManager.importSettings(data, importOptions);
        const executionTime = Date.now() - startTime;

        if (importResult.success) {
          return NextResponse.json({
            success: true,
            data: {
              operation: 'import',
              options: importOptions,
              executionTime,
              timestamp: new Date().toISOString(),
            },
          });
        } else {
          return NextResponse.json(
            {
              success: false,
              error: importResult.errors.length > 0 ? importResult.errors[0] : 'Import failed',
              details: {
                errors: importResult.errors,
                options: importOptions,
                executionTime,
              },
            },
            { status: 400 }
          );
        }
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: error instanceof Error ? error.message : 'Import failed',
          },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('Error in backup import/export:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Import/export operation failed',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/backup - Delete specific backup
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const backupId = searchParams.get('id');
    const bulkDelete = searchParams.get('bulk') === 'true';

    if (bulkDelete && !backupId) {
      // Bulk delete operation - could delete old backups, etc.
      const olderThanDays = parseInt(searchParams.get('olderThan') || '30');
      
      // Get all backups
      const allBackups = await settingsManager.listBackups();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      // Filter backups older than cutoff
      const oldBackups = allBackups.filter(backup => backup.createdAt < cutoffDate);
      
      let deletedCount = 0;
      const errors: string[] = [];

      for (const backup of oldBackups) {
        try {
          const deleted = await settingsManager.deleteBackup(backup.id);
          if (deleted) {
            deletedCount++;
          }
        } catch (error) {
          errors.push(`Failed to delete backup ${backup.id}: ${error}`);
        }
      }

      return NextResponse.json({
        success: errors.length === 0,
        data: {
          operation: 'bulk-delete',
          deletedCount,
          totalFound: oldBackups.length,
          olderThanDays,
          errors: errors.length > 0 ? errors : undefined,
          timestamp: new Date().toISOString(),
        },
      });
    } else if (backupId) {
      // Delete specific backup
      try {
        const deleted = await settingsManager.deleteBackup(backupId);
        
        if (deleted) {
          return NextResponse.json({
            success: true,
            data: {
              operation: 'delete',
              backupId,
              timestamp: new Date().toISOString(),
            },
          });
        } else {
          return NextResponse.json(
            {
              success: false,
              error: 'Backup not found or could not be deleted',
            },
            { status: 404 }
          );
        }
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete backup',
          },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Backup ID is required',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error deleting backup:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete backup',
      },
      { status: 500 }
    );
  }
}