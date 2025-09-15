import { useState, useEffect } from 'react'
import type { TMDBMovie, TVDBSeries } from '@/lib/types/media'

interface MonitoringState {
  isMonitoringMovie: boolean
  isMonitoringSeries: boolean
  canMonitorMovies: boolean
  canMonitorSeries: boolean
  radarrAvailable: boolean
  sonarrAvailable: boolean
  movieError: string | null
  seriesError: string | null
}

interface MonitoringServices {
  radarr: {
    configured: boolean
    available: boolean
  }
  sonarr: {
    configured: boolean
    available: boolean
  }
}

export function useMonitoring() {
  const [state, setState] = useState<MonitoringState>({
    isMonitoringMovie: false,
    isMonitoringSeries: false,
    canMonitorMovies: false,
    canMonitorSeries: false,
    radarrAvailable: false,
    sonarrAvailable: false,
    movieError: null,
    seriesError: null
  })

  // Check service availability on mount
  useEffect(() => {
    checkServiceAvailability()
  }, [])

  const checkServiceAvailability = async () => {
    try {
      const [radarrResponse, sonarrResponse] = await Promise.all([
        fetch('/api/monitor/movie').catch(() => ({ ok: false })),
        fetch('/api/monitor/series').catch(() => ({ ok: false }))
      ])

      const radarrJson = radarrResponse.ok ? await radarrResponse.json() : { success: false, data: { configured: false, available: false } }
      const sonarrJson = sonarrResponse.ok ? await sonarrResponse.json() : { success: false, data: { configured: false, available: false } }

      // Extract data from the API response format
      const radarrData = radarrJson.success ? radarrJson.data : { configured: false, available: false }
      const sonarrData = sonarrJson.success ? sonarrJson.data : { configured: false, available: false }

      setState(prev => ({
        ...prev,
        canMonitorMovies: radarrData.configured, // Show buttons if configured, even if temporarily unavailable
        canMonitorSeries: sonarrData.configured, // Show buttons if configured, even if temporarily unavailable
        radarrAvailable: radarrData.available,
        sonarrAvailable: sonarrData.available
      }))
    } catch (error) {
      console.error('Error checking monitoring service availability:', error)
    }
  }

  const monitorMovie = async (movie: TMDBMovie): Promise<boolean> => {
    setState(prev => ({ ...prev, isMonitoringMovie: true, movieError: null }))

    try {
      const response = await fetch('/api/monitor/movie', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tmdbId: movie.id,
          title: movie.title,
          year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add movie to monitoring')
      }

      setState(prev => ({ ...prev, isMonitoringMovie: false }))
      return true

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to monitor movie'
      setState(prev => ({
        ...prev,
        isMonitoringMovie: false,
        movieError: errorMessage
      }))
      return false
    }
  }

  const monitorSeries = async (series: TVDBSeries | { name: string; year?: string }): Promise<boolean> => {
    setState(prev => ({ ...prev, isMonitoringSeries: true, seriesError: null }))

    try {
      const response = await fetch('/api/monitor/series', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'name' in series ? series.name : series.title || series.name,
          year: series.year,
          // For TVDBSeries, include tvdbId if available
          ...(('id' in series) && { tvdbId: series.id })
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add series to monitoring')
      }

      setState(prev => ({ ...prev, isMonitoringSeries: false }))
      return true

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to monitor series'
      setState(prev => ({
        ...prev,
        isMonitoringSeries: false,
        seriesError: errorMessage
      }))
      return false
    }
  }

  const clearMovieError = () => {
    setState(prev => ({ ...prev, movieError: null }))
  }

  const clearSeriesError = () => {
    setState(prev => ({ ...prev, seriesError: null }))
  }

  return {
    ...state,
    monitorMovie,
    monitorSeries,
    clearMovieError,
    clearSeriesError,
    checkServiceAvailability
  }
}
