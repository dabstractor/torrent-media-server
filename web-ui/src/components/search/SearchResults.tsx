import React, { useState } from 'react'
import TorrentCard from './TorrentCard'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ErrorMessage from '@/components/common/ErrorMessage'
import { useMonitoring } from '@/hooks/use-monitoring'
import type { TorrentResult } from '@/lib/types'

interface SearchResultsProps {
  results: TorrentResult[]
  total: number
  indexers: string[]
  isLoading: boolean
  error: string | null
  onAddTorrent: (torrent: TorrentResult) => Promise<boolean>
  onLoadMore?: () => void
  hasMore?: boolean
}

const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  total,
  indexers,
  isLoading,
  error,
  onAddTorrent,
  onLoadMore,
  hasMore = false
}) => {
  const [addingTorrents, setAddingTorrents] = useState<Set<string>>(new Set())

  // Use monitoring hook for Radarr/Sonarr integration
  const {
    isMonitoringMovie,
    isMonitoringSeries,
    monitorMovie,
    monitorSeries,
    canMonitorMovies,
    canMonitorSeries,
    movieError,
    seriesError,
    clearMovieError,
    clearSeriesError
  } = useMonitoring()

  const handleAddTorrent = async (torrent: TorrentResult) => {
    setAddingTorrents(prev => new Set([...prev, torrent.id]))

    try {
      const success = await onAddTorrent(torrent)
      if (!success) {
        // Show error feedback (could be enhanced with toast notifications)
        console.error('Failed to add torrent to downloads')
      }
    } catch (error) {
      console.error('Error adding torrent:', error)
    } finally {
      setAddingTorrents(prev => {
        const next = new Set(prev)
        next.delete(torrent.id)
        return next
      })
    }
  }

  // Handler for monitoring movies - search TMDB first, then monitor
  const handleMonitorMovie = async (torrent: TorrentResult) => {
    // Clear any previous error
    if (movieError) clearMovieError()

    try {
      // Extract basic movie info from torrent title
      const yearMatch = torrent.title.match(/\((\d{4})\)/) || torrent.title.match(/(\d{4})/)
      const year = yearMatch ? yearMatch[1] : ''

      // Clean the title for search
      const cleanTitle = torrent.title
        .replace(/\(\d{4}\)/g, '')
        .replace(/\d{4}/g, '')
        .replace(/\b(1080p|720p|480p|4k|uhd|bluray|webrip|webdl|dvdrip|hdtv|x264|x265|h264|h265)\b/gi, '')
        .replace(/\b(mkv|mp4|avi)\b/gi, '')
        .trim()

      if (!cleanTitle) {
        throw new Error('Could not extract movie title from torrent')
      }

      // Search TMDB for the movie
      const tmdbResponse = await fetch(`/api/tmdb/search?query=${encodeURIComponent(cleanTitle)}${year ? `&year=${year}` : ''}`)
      const tmdbData = await tmdbResponse.json()

      if (!tmdbResponse.ok || !tmdbData.data?.results?.length) {
        throw new Error(`No movie found for "${cleanTitle}" ${year ? `(${year})` : ''}`)
      }

      // Use the first result
      const movie = tmdbData.data.results[0]

      // Monitor the movie with actual TMDB data
      const success = await monitorMovie(movie)
      if (success) {
        console.log('Movie added to Radarr monitoring successfully')
      }
    } catch (error) {
      console.error('Error monitoring movie:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to monitor movie'
      setMovieState({ isMonitoring: false, error: errorMessage })
    }
  }

  // Handler for monitoring series - directly monitor with extracted title/year
  const handleMonitorSeries = async (torrent: TorrentResult) => {
    // Clear any previous error
    if (seriesError) clearSeriesError()

    try {
      // Extract basic series info from torrent title
      const yearMatch = torrent.title.match(/\((\d{4})\)/) || torrent.title.match(/(\d{4})/)
      const year = yearMatch ? yearMatch[1] : ''

      // Clean the title for search
      const cleanTitle = torrent.title
        .replace(/S\d{2}E\d{2}/gi, '')
        .replace(/\b\d{1,2}x\d{1,2}\b/gi, '')
        .replace(/\((\d{4})\)/g, '')
        .replace(/\d{4}/g, '')
        .replace(/\b(1080p|720p|480p|4k|uhd|bluray|webrip|webdl|dvdrip|hdtv|x264|x265|h264|h265)\b/gi, '')
        .replace(/\b(mkv|mp4|avi)\b/gi, '')
        .trim()

      if (!cleanTitle) {
        throw new Error('Could not extract series title from torrent')
      }

      // Create a basic series object for monitoring
      const seriesData = {
        name: cleanTitle,
        year: year
      }

      // Monitor the series directly with Sonarr
      const success = await monitorSeries(seriesData)
      if (success) {
        console.log('Series added to Sonarr monitoring')
      }
    } catch (error) {
      console.error('Error monitoring series:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to monitor series'
      setSeriesState({ isMonitoring: false, error: errorMessage })
    }
  }

  // Show loading state
  if (isLoading && results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <LoadingSpinner />
        <p className="mt-4 text-gray-600">Searching across indexers...</p>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="py-8">
        <ErrorMessage message={error} />
        <div className="mt-4 text-center">
          <p className="text-gray-600 text-sm">
            Try adjusting your search terms or check if your indexers are online.
          </p>
        </div>
      </div>
    )
  }

  // Show empty state
  if (!isLoading && results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No torrents found</h3>
        <p className="text-gray-600 max-w-md">
          Try different search terms, reduce filters, or check if your indexers are configured properly.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Monitoring errors */}
      {movieError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-red-400">❌</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">Movie Monitoring Error</p>
              <p className="mt-1 text-sm text-red-700">{movieError}</p>
              <button
                onClick={clearMovieError}
                className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {seriesError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-red-400">❌</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">Series Monitoring Error</p>
              <p className="mt-1 text-sm text-red-700">{seriesError}</p>
              <button
                onClick={clearSeriesError}
                className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-sm text-gray-600">
          Showing <span className="font-medium">{results.length}</span> of{' '}
          <span className="font-medium">{total}</span> results
          {indexers.length > 0 && (
            <>
              {' from '}
              <span className="font-medium">{indexers.length}</span>{' '}
              indexer{indexers.length !== 1 ? 's' : ''}
            </>
          )}
        </div>

        {/* Indexer list */}
        {indexers.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {indexers.map((indexer) => (
              <span
                key={indexer}
                className="inline-flex px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700"
              >
                {indexer}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Results grid */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {results.map((torrent) => (
          <TorrentCard
            key={torrent.id}
            torrent={torrent}
            onAdd={handleAddTorrent}
            onMonitorMovie={canMonitorMovies ? handleMonitorMovie : undefined}
            onMonitorSeries={canMonitorSeries ? handleMonitorSeries : undefined}
            isAdding={addingTorrents.has(torrent.id)}
            isMonitoring={isMonitoringMovie || isMonitoringSeries}
            showMonitorOptions={canMonitorMovies || canMonitorSeries}
          />
        ))}
      </div>

      {/* Loading more indicator */}
      {isLoading && results.length > 0 && (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
          <span className="ml-3 text-gray-600">Loading more results...</span>
        </div>
      )}

      {/* Load more button */}
      {!isLoading && hasMore && onLoadMore && (
        <div className="flex justify-center py-6">
          <button
            onClick={onLoadMore}
            className="btn btn-secondary min-h-[44px] px-8"
          >
            Load More Results
          </button>
        </div>
      )}

      {/* End of results indicator */}
      {!isLoading && !hasMore && results.length > 0 && total > results.length && (
        <div className="text-center py-6 text-sm text-gray-500">
          End of results. Try refining your search to find more torrents.
        </div>
      )}
    </div>
  )
}

export default SearchResults
