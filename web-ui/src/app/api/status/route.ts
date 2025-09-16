import { createErrorResponse, createSuccessResponse, HTTP_STATUS } from '@/lib/api/errors';

export async function GET() {
  try {
    const services = {
      prowlarr: await checkServiceHealth(`${process.env.PROWLARR_BACKEND_URL}/api/v1/system/status`),
      qbittorrent: await checkQBittorrentHealth(),
      plex: await checkServiceHealth(`${process.env.PLEX_BACKEND_URL}/identity`),
      sonarr: await checkServiceHealth(`${process.env.SONARR_BACKEND_URL}/api/v3/system/status`),
      radarr: await checkServiceHealth(`${process.env.RADARR_BACKEND_URL}/api/v3/system/status`),
    };

    return createSuccessResponse({ 
      services 
    }, HTTP_STATUS.OK);
  } catch {
    return createErrorResponse(
      'Failed to check service status',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}

async function checkServiceHealth(url: string) {
  try {
    const response = await fetch(url, { 
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    return {
      status: response.ok ? 'healthy' : 'unhealthy',
      url,
      lastCheck: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unknown' as const,
      url,
      lastCheck: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function checkQBittorrentHealth() {
  const url = `${process.env.QBITTORRENT_BACKEND_URL}/api/v2/app/version`;
  
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (response.ok) {
      const version = await response.text();
      return {
        status: 'healthy' as const,
        url,
        lastCheck: new Date().toISOString(),
        version: version.trim()
      };
    } else {
      return {
        status: 'unhealthy' as const,
        url,
        lastCheck: new Date().toISOString(),
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }
  } catch (error) {
    return {
      status: 'unknown' as const,
      url,
      lastCheck: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}