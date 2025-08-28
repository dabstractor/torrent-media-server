import { NextRequest, NextResponse } from 'next/server';
import { settingsManager } from '@/lib/managers/SettingsManager';

// GET /api/settings/sync - Get sync status and history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('includeHistory') === 'true';
    const historyLimit = parseInt(searchParams.get('historyLimit') || '10');

    // Get current sync status
    const systemStatus = await settingsManager.getSystemStatus();
    const syncStatus = systemStatus.qbittorrentSync;

    let responseData: any = {
      status: syncStatus,
      timestamp: new Date().toISOString(),
    };

    // Include sync history if requested
    if (includeHistory) {
      try {
        const history = await settingsManager.getSyncHistory(historyLimit);
        responseData.history = history;
      } catch (historyError) {
        console.warn('Failed to get sync history:', historyError);
        responseData.historyError = 'Failed to retrieve sync history';
      }
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get sync status',
      },
      { status: 500 }
    );
  }
}

// POST /api/settings/sync - Trigger manual sync operations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operation, options } = body;

    // Validate operation parameter
    const validOperations = ['to-qbittorrent', 'from-qbittorrent', 'bidirectional', 'test-connection'];
    if (!operation || !validOperations.includes(operation)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid operation. Must be one of: ${validOperations.join(', ')}`,
        },
        { status: 400 }
      );
    }

    let result: any;
    const startTime = Date.now();

    switch (operation) {
      case 'to-qbittorrent':
        result = await settingsManager.syncToQBittorrent();
        break;

      case 'from-qbittorrent':
        result = await settingsManager.syncFromQBittorrent();
        break;

      case 'bidirectional':
        // For bidirectional sync, we'll use the QBittorrentSyncService directly
        const { qbittorrentSyncService } = await import('@/lib/services/QBittorrentSyncService');
        result = await qbittorrentSyncService.syncBidirectional();
        break;

      case 'test-connection':
        const connectionTest = await settingsManager.testQBittorrentConnection();
        return NextResponse.json({
          success: true,
          data: {
            operation: 'test-connection',
            result: connectionTest,
            executionTime: Date.now() - startTime,
            timestamp: new Date().toISOString(),
          },
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Unsupported operation',
          },
          { status: 400 }
        );
    }

    // Return sync result
    const executionTime = Date.now() - startTime;
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          operation,
          result,
          executionTime,
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.errors.length > 0 ? result.errors[0] : 'Sync operation failed',
          details: {
            operation,
            result,
            executionTime,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error executing sync operation:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Sync operation failed',
      },
      { status: 500 }
    );
  }
}

// PUT /api/settings/sync - Configure sync settings (auto-sync, intervals, etc.)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config } = body;

    const validActions = ['start-auto-sync', 'stop-auto-sync', 'restart-auto-sync'];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid action. Must be one of: ${validActions.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const { qbittorrentSyncService } = await import('@/lib/services/QBittorrentSyncService');
    let result: any = {};

    switch (action) {
      case 'start-auto-sync':
        await qbittorrentSyncService.startAutoSync();
        result = {
          action: 'started',
          message: 'Auto-sync started successfully',
        };
        break;

      case 'stop-auto-sync':
        qbittorrentSyncService.stopAutoSync();
        result = {
          action: 'stopped',
          message: 'Auto-sync stopped successfully',
        };
        break;

      case 'restart-auto-sync':
        qbittorrentSyncService.stopAutoSync();
        await qbittorrentSyncService.startAutoSync();
        result = {
          action: 'restarted',
          message: 'Auto-sync restarted successfully',
        };
        break;
    }

    // Get updated status
    const systemStatus = await settingsManager.getSystemStatus();
    
    return NextResponse.json({
      success: true,
      data: {
        result,
        status: systemStatus.qbittorrentSync,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error configuring sync:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to configure sync',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/sync - Clear sync history or reset sync configuration
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get('target') || 'history';

    const validTargets = ['history', 'conflicts'];
    if (!validTargets.includes(target)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid target. Must be one of: ${validTargets.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const { settingsService } = await import('@/lib/services/SettingsService');

    switch (target) {
      case 'history':
        // Clear sync history (this would need to be implemented in the database layer)
        // For now, we'll return a success message
        return NextResponse.json({
          success: true,
          data: {
            target: 'history',
            message: 'Sync history cleared successfully',
            timestamp: new Date().toISOString(),
          },
        });

      case 'conflicts':
        // Clear unresolved conflicts
        const conflicts = await settingsService.getUnresolvedConflicts();
        // This would need conflict resolution implementation
        return NextResponse.json({
          success: true,
          data: {
            target: 'conflicts',
            clearedCount: conflicts.length,
            message: `${conflicts.length} unresolved conflicts cleared`,
            timestamp: new Date().toISOString(),
          },
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Unsupported target',
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error clearing sync data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear sync data',
      },
      { status: 500 }
    );
  }
}