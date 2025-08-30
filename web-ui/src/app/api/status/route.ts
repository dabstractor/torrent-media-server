import { createErrorResponse, createSuccessResponse, HTTP_STATUS } from '@/lib/api/errors';

export async function GET() {
  try {
    const services = {
      prowlarr: await checkServiceHealth('http://prowlarr:9696/api/v1/system/status'),
      transmission: await checkTransmissionHealth(),
      plex: await checkServiceHealth('http://plex:32400/web/index.html'),
      sonarr: await checkServiceHealth('http://sonarr:8989/api/v3/system/status'),
      radarr: await checkServiceHealth('http://radarr:7878/api/v3/system/status'),
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

async function checkTransmissionHealth() {
  const url = 'http://transmission:9091/transmission/rpc';
  const username = process.env.TRANSMISSION_USERNAME || 'admin';
  const password = process.env.TRANSMISSION_PASSWORD || 'adminpass123';
  
  try {
    // Create session-get request to test Transmission RPC
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add Basic Auth
    if (username && password) {
      headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        method: 'session-get',
        arguments: {}
      }),
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    // Handle 409 response (session ID required) as healthy
    if (response.status === 409) {
      return {
        status: 'healthy' as const,
        url,
        lastCheck: new Date().toISOString(),
        message: 'Transmission daemon responding (session ID required)'
      };
    }

    if (response.ok) {
      const data = await response.json();
      return {
        status: data.result === 'success' ? 'healthy' : 'unhealthy',
        url,
        lastCheck: new Date().toISOString(),
        version: data.arguments?.version
      };
    } else if (response.status === 401) {
      return {
        status: 'unhealthy' as const,
        url,
        lastCheck: new Date().toISOString(),
        error: 'Authentication failed - check credentials'
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