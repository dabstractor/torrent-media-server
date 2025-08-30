import { createErrorResponse, createSuccessResponse, HTTP_STATUS } from '@/lib/api/errors';

export async function GET() {
  try {
    // Check if qBittorrent credentials are configured
    const qbUrl = process.env.QBITTORRENT_URL;
    const qbUser = process.env.QBITTORRENT_USER;
    const qbPassword = process.env.QBITTORRENT_PASSWORD;
    
    if (!qbUrl || !qbUser || !qbPassword) {
      return createSuccessResponse({
        status: 'not_configured',
        message: 'qBittorrent credentials not configured',
        configured: false,
        lastSync: null,
        error: 'Missing qBittorrent configuration in environment variables'
      });
    }

    // Test connection to qBittorrent
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${qbUrl}/api/v2/app/version`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        return createSuccessResponse({
          status: 'connected',
          message: 'qBittorrent is accessible',
          configured: true,
          lastSync: new Date().toISOString(),
          version: await response.text()
        });
      } else {
        return createSuccessResponse({
          status: 'error',
          message: `qBittorrent returned HTTP ${response.status}`,
          configured: true,
          lastSync: null,
          error: `HTTP ${response.status}: ${response.statusText}`
        });
      }
    } catch (error) {
      return createSuccessResponse({
        status: 'unreachable',
        message: 'qBittorrent is not reachable',
        configured: true,
        lastSync: null,
        error: error instanceof Error ? error.message : 'Connection failed'
      });
    }
  } catch (error) {
    console.error('qBittorrent sync status check failed:', error);
    return createErrorResponse(
      'Failed to check qBittorrent sync status',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}