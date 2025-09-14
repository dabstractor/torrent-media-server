import { useState } from 'react'
import useSWR from 'swr'
import type { TMDBMovie } from '@/lib/types/media'

interface MonitoringState {
  isMonitoring: boolean
  error: string | null
}

interface MonitoringConfig {
  radarr: {
    configured: boolean
    available: boolean
    status?: any
    config?: {
      rootFolders: any[]
      qualityProfiles: any[]
    }
  }
  sonarr: {
    configured: boolean
    available: boolean
    status?: any
    config?: {
      rootFolders: any[]
      qualityProfiles: any[]
      languageProfiles: any[]
    }
  }
}

// Fetcher function for SWR
const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export function useMonitoring() {
  const [movieState, setMovieState] = useState<MonitoringState>({
    isMonitoring: false,
    error: null
  })

  const [seriesState, setSeriesState] = useState<MonitoringState>({
    isMonitoring: false,
    error: null
  })

  // Fetch monitoring configuration
  const { data: radarrConfig, error: radarrError } = useSWR(
    '/api/monitor/movie',
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: false
    }
  )

  const { data: sonarrConfig, error: sonarrError } = useSWR(
    '/api/monitor/series',
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: false
    }
  )

  const monitorMovie = async (
    movie: TMDBMovie,
    options?: {
      rootFolderPath?: string
      qualityProfileId?: number
    }
  ): Promise<boolean> => {
    setMovieState({ isMonitoring: true, error: null })

    try {
      const payload = {
        tmdbId: movie.id,
        title: movie.title,
        year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
        overview: movie.overview,
        posterPath: movie.poster_path,
        rootFolderPath: options?.rootFolderPath,
        qualityProfileId: options?.qualityProfileId
      }

      const response = await fetch('/api/monitor/movie', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to monitor movie')
      }

      setMovieState({ isMonitoring: false, error: null })
      return true

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setMovieState({ isMonitoring: false, error: errorMessage })
      return false
    }
  }

  const monitorSeries = async (
    series: {
      id?: number
      name: string
      year?: string
      overview?: string
      image?: string
    },
    options?: {
      rootFolderPath?: string
      qualityProfileId?: number
      languageProfileId?: number
    }
  ): Promise<boolean> => {
    setSeriesState({ isMonitoring: true, error: null })

    try {
      const payload = {
        tvdbId: series.id || 0,
        title: series.name,
        year: series.year,
        overview: series.overview || '',
        image: series.image || '',
        rootFolderPath: options?.rootFolderPath,
        qualityProfileId: options?.qualityProfileId,
        languageProfileId: options?.languageProfileId
      }

      const response = await fetch('/api/monitor/series', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to monitor series')
      }

      setSeriesState({ isMonitoring: false, error: null })
      return true

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setSeriesState({ isMonitoring: false, error: errorMessage })
      return false
    }
  }

  // Get monitoring configuration
  const config: MonitoringConfig = {
    radarr: {
      configured: radarrConfig?.data?.configured || false,
      available: radarrConfig?.data?.available || false,
      status: radarrConfig?.data?.status,
      config: radarrConfig?.data?.config
    },
    sonarr: {
      configured: sonarrConfig?.data?.configured || false,
      available: sonarrConfig?.data?.available || false,
      status: sonarrConfig?.data?.status,
      config: sonarrConfig?.data?.config
    }
  }

  return {
    // Movie monitoring
    isMonitoringMovie: movieState.isMonitoring,
    movieError: movieState.error,
    monitorMovie,

    // Series monitoring
    isMonitoringSeries: seriesState.isMonitoring,
    seriesError: seriesState.error,
    monitorSeries,

    // Configuration
    config,
    configError: radarrError || sonarrError,

    // Helper functions
    canMonitorMovies: config.radarr.configured && config.radarr.available,
    canMonitorSeries: config.sonarr.configured && config.sonarr.available,

    // Clear errors
    clearMovieError: () => setMovieState(prev => ({ ...prev, error: null })),
    clearSeriesError: () => setSeriesState(prev => ({ ...prev, error: null }))
  }
}