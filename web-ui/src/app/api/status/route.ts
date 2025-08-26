export async function GET() {
  try {
    const services = {
      prowlarr: await checkServiceHealth('http://prowlarr:9696/api/v1/system/status'),
      transmission: await checkServiceHealth('http://transmission:9091/transmission/rpc'),
      plex: await checkServiceHealth('http://plex:32400/web/index.html'),
      sonarr: await checkServiceHealth('http://sonarr:8989/api/v3/system/status'),
      radarr: await checkServiceHealth('http://radarr:7878/api/v3/system/status'),
    };

    return Response.json({ 
      success: true, 
      data: services 
    });
  } catch {
    return Response.json({ 
      success: false, 
      error: 'Failed to check service status' 
    }, { status: 500 });
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