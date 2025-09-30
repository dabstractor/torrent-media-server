import { useState, useEffect, useCallback } from 'react'
import { ServiceConfig } from '@/lib/types/services'

interface UseServiceConfigReturn {
  config: ServiceConfig[]
  loading: boolean
  error: string | null
}

interface EnvConfig {
  PROWLARR_URL?: string
  QBITTORRENT_URL?: string
  PLEX_URL?: string
  SONARR_URL?: string
  RADARR_URL?: string
  JELLYFIN_URL?: string
  OVERSEERR_URL?: string
  JELLYSEER_URL?: string
  API_BASE_URL?: string
  WEB_UI_PORT?: string
}

const mapEnvToServices = (envConfig: EnvConfig): ServiceConfig[] => {
  const services: ServiceConfig[] = []
  const healthBaseUrl = `/api/health`

  // qBittorrent - CRITICAL: Uses VPN-isolated network via nginx proxy
  if (envConfig.QBITTORRENT_URL) {
    services.push({
      id: 'qbittorrent',
      name: 'qBittorrent',
      description: 'BitTorrent client for downloading torrents',
      icon: 'Download',
      url: envConfig.QBITTORRENT_URL,
      healthEndpoint: `${healthBaseUrl}/qbittorrent`,
      requiresAuth: false,
      category: 'download'
    })
  }

  // Prowlarr - Indexer proxy
  if (envConfig.PROWLARR_URL) {
    services.push({
      id: 'prowlarr',
      name: 'Prowlarr',
      description: 'Indexer manager for Sonarr and Radarr',
      icon: 'Search',
      url: envConfig.PROWLARR_URL,
      healthEndpoint: `${healthBaseUrl}/prowlarr`,
      requiresAuth: false,
      category: 'indexer'
    })
  }

  // Plex - Media server
  if (envConfig.PLEX_URL) {
    services.push({
      id: 'plex',
      name: 'Plex',
      description: 'Media server for streaming content',
      icon: 'Play',
      url: envConfig.PLEX_URL,
      healthEndpoint: `${healthBaseUrl}/plex`,
      requiresAuth: false,
      category: 'media'
    })
  }

  // Jellyfin - Open source media server
  if (envConfig.JELLYFIN_URL) {
    services.push({
      id: 'jellyfin',
      name: 'Jellyfin',
      description: 'Open source media server alternative to Plex',
      icon: 'Play',
      url: envConfig.JELLYFIN_URL,
      healthEndpoint: `${healthBaseUrl}/jellyfin`,
      requiresAuth: false,
      category: 'media'
    })
  }

  // Sonarr - TV Shows management
  if (envConfig.SONARR_URL) {
    services.push({
      id: 'sonarr',
      name: 'Sonarr',
      description: 'PVR for TV Shows management',
      icon: 'Tv',
      url: envConfig.SONARR_URL,
      healthEndpoint: `${healthBaseUrl}/sonarr`,
      requiresAuth: false,
      category: 'management'
    })
  }

  // Radarr - Movies management
  if (envConfig.RADARR_URL) {
    services.push({
      id: 'radarr',
      name: 'Radarr',
      description: 'PVR for Movies management',
      icon: 'Film',
      url: envConfig.RADARR_URL,
      healthEndpoint: `${healthBaseUrl}/radarr`,
      requiresAuth: false,
      category: 'management'
    })
  }

  // Overseerr - Media request management
  if (envConfig.OVERSEERR_URL) {
    services.push({
      id: 'overseerr',
      name: 'Overseerr',
      description: 'Media request management',
      icon: 'Request',
      url: envConfig.OVERSEERR_URL,
      healthEndpoint: `${healthBaseUrl}/overseerr`,
      requiresAuth: false,
      category: 'management'
    })
  }

  // Jellyseer - Media request management for Jellyfin
  if (envConfig.JELLYSEER_URL) {
    services.push({
      id: 'jellyseer',
      name: 'Jellyseer',
      description: 'Media request management for Jellyfin',
      icon: 'Play',
      url: envConfig.JELLYSEER_URL,
      healthEndpoint: `${healthBaseUrl}/jellyseer`,
      requiresAuth: false,
      category: 'management'
    })
  }

  return services
}

export const useServiceConfig = (): UseServiceConfigReturn => {
  const [config, setConfig] = useState<ServiceConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConfig = useCallback(async () => {
    try {
      console.log('[TEST] fetchConfig called')
      setLoading(true)
      setError(null)

      const response = await fetch('/api/config')
      console.log('[TEST] Config API response status:', response.status)
      if (!response.ok) {
        throw new Error(`Failed to fetch configuration: ${response.statusText}`)
      }

      const envConfig = await response.json()
      console.log('[TEST] Config API response data:', envConfig)
      const services = mapEnvToServices(envConfig)
      console.log('[TEST] Services after mapEnvToServices:', services)
      setConfig(services)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load configuration'
      setError(errorMessage)
      console.error('Error fetching service configuration:', err)
    } finally {
      setLoading(false)
      console.log('[TEST] fetchConfig completed')
    }
  }, [])

  useEffect(() => {
    console.log('[TEST] useEffect called')
    fetchConfig()
  }, [fetchConfig])

  return { config, loading, error }
}
