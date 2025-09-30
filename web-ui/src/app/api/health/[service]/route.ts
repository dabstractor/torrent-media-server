// Force dynamic rendering for health checks
export const dynamic = 'force-dynamic'

interface ServiceConfig {
  url: string
  healthEndpoint: string
  authType: 'none' | 'apikey' | 'session' | 'token'
  timeout: number
}

async function getServiceConfigs(): Promise<Record<string, ServiceConfig>> {
  return {
    prowlarr: {
      url: process.env.PROWLARR_BACKEND_URL || 'http://prowlarr:9696',
      healthEndpoint: '/api/v1/system/status',
      authType: 'apikey',
      timeout: 10000
    },
    qbittorrent: {
      url: process.env.QBITTORRENT_BACKEND_URL || 'http://vpn:8081',
      healthEndpoint: '/api/v2/app/version',
      authType: 'none', // Use unauthenticated endpoint for basic connectivity
      timeout: 15000 // Longer timeout for VPN routing
    },
    plex: {
      url: process.env.PLEX_BACKEND_URL || 'http://plex:32400',
      healthEndpoint: '/identity',
      authType: 'none', // Identity endpoint doesn't require auth and provides version info
      timeout: 8000
    },
    sonarr: {
      url: process.env.SONARR_BACKEND_URL || 'http://sonarr:8989',
      healthEndpoint: '/ping', // Use unauthenticated ping endpoint
      authType: 'none',
      timeout: 10000
    },
    radarr: {
      url: process.env.RADARR_BACKEND_URL || 'http://radarr:7878',
      healthEndpoint: '/ping', // Use unauthenticated ping endpoint
      authType: 'none',
      timeout: 10000
    },
    overseerr: {
      url: process.env.OVERSEERR_BACKEND_URL || 'http://overseerr:5055',
      healthEndpoint: '/api/v1/status',
      authType: 'none',
      timeout: 10000
    },
    jellyfin: {
      url: process.env.JELLYFIN_BACKEND_URL || 'http://jellyfin:8096',
      healthEndpoint: '/health',
      authType: 'none',
      timeout: 10000
    },
    jellyseer: {
      url: process.env.JELLYSEER_BACKEND_URL || 'http://jellyseer:5055',
      healthEndpoint: '/api/v1/status',
      authType: 'none',
      timeout: 10000
    }
  }
}

export async function GET(
  request: Request,
  { params }: { params: { service: string } }
) {
  const { service } = params
  const serviceConfigs = await getServiceConfigs()
  const config = serviceConfigs[service as keyof typeof serviceConfigs]

  if (!config) {
    return Response.json({ status: 'error', message: 'Unknown service' }, { status: 404 })
  }

  try {
    const startTime = Date.now()
    const fullUrl = `${config.url}${config.healthEndpoint}`

    // Prepare headers based on auth type
    const headers: Record<string, string> = {
      'User-Agent': 'torrents-services-healthcheck/1.0'
    }

    // Add API key authentication if required
    if (config.authType === 'apikey') {
      const apiKeyEnvVar = `${service.toUpperCase()}_API_KEY`
      const apiKey = process.env[apiKeyEnvVar]

      if (apiKey) {
        headers['X-Api-Key'] = apiKey
      } else {
        // Try without API key for basic connectivity test
        console.warn(`No API key found for ${service} (${apiKeyEnvVar})`)
      }
    }

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(config.timeout),
      cache: 'no-store'
    })

    const responseTime = Date.now() - startTime

    // Parse response based on content type
    let responseData: any = null
    let version: string | undefined = undefined

    try {
      const contentType = response.headers.get('content-type') || ''

      if (contentType.includes('application/json')) {
        responseData = await response.json()
        // Extract version information
        version = responseData?.version || responseData?.appVersion || responseData?.Version
      } else if (contentType.includes('xml')) {
        const text = await response.text()
        // For Plex identity endpoint, extract version from XML
        const versionMatch = text.match(/version="([^"]+)"/)
        version = versionMatch ? versionMatch[1] : undefined
      } else {
        responseData = await response.text()
        // For plain text responses (like qBittorrent version)
        if (typeof responseData === 'string' && responseData.match(/^\d+\.\d+/)) {
          version = responseData.trim()
        }
      }
    } catch (parseError) {
      // If we can't parse the response, that's OK as long as we got a good status
      console.warn(`Failed to parse response for ${service}:`, parseError)
    }

    // Determine health status
    let status: 'online' | 'offline' | 'degraded' = 'offline'
    let authStatus: string | undefined = undefined

    if (response.ok) {
      status = responseTime > 5000 ? 'degraded' : 'online'
    } else if (response.status === 401 || response.status === 403) {
      // Service is responding but needs authentication
      status = 'degraded'
      authStatus = 'authentication_required'
    } else if (response.status >= 500) {
      status = 'offline'
    } else {
      // Other 4xx errors - service is responding but there might be an issue
      status = 'degraded'
    }

    return Response.json({
      status,
      statusCode: response.status,
      responseTime,
      version,
      authStatus,
      endpoint: config.healthEndpoint,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return Response.json({
      status: 'offline',
      error: errorMessage,
      endpoint: config.healthEndpoint,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }
}