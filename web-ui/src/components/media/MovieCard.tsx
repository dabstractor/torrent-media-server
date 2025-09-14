import React, { useState } from 'react'
import type { TMDBMovie } from '@/lib/types/media'

interface MovieCardProps {
  movie: TMDBMovie
  onMonitor?: (movie: TMDBMovie) => void
  onSearchTorrents?: (movie: TMDBMovie) => void
  isMonitoring?: boolean
  showMonitorOption?: boolean
  isCompact?: boolean
}

const MovieCard: React.FC<MovieCardProps> = ({
  movie,
  onMonitor,
  onSearchTorrents,
  isMonitoring = false,
  showMonitorOption = true,
  isCompact = false
}) => {
  const [imageError, setImageError] = useState(false)

  const posterUrl = movie.poster_path && !imageError
    ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
    : '/placeholder-poster.jpg'

  const year = movie.release_date ? movie.release_date.split('-')[0] : 'TBA'

  const handleMonitorClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onMonitor) {
      onMonitor(movie)
    }
  }

  const handleSearchTorrentsClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onSearchTorrents) {
      onSearchTorrents(movie)
    }
  }

  if (isCompact) {
    return (
      <div className="card hover:shadow-md transition-shadow">
        <div className="flex space-x-3">
          {/* Compact poster */}
          <div className="flex-shrink-0">
            <img
              src={posterUrl}
              alt={movie.title}
              className="w-16 h-24 object-cover rounded"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          </div>

          {/* Compact details */}
          <div className="flex-1 min-w-0 space-y-2">
            <h3 className="font-medium text-sm line-clamp-2 leading-5">
              {movie.title}
            </h3>

            <div className="text-xs text-gray-600">
              <div className="flex items-center space-x-3">
                <span>⭐ {movie.vote_average.toFixed(1)}</span>
                <span>📅 {year}</span>
                <span>🗳️ {movie.vote_count}</span>
              </div>
            </div>

            {/* Compact actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSearchTorrentsClick}
                className="btn btn-secondary text-xs px-2 py-1 min-h-[32px]"
                title="Search for torrents"
              >
                🔍 Search
              </button>

              {showMonitorOption && (
                <button
                  onClick={handleMonitorClick}
                  disabled={isMonitoring}
                  className="btn btn-primary text-xs px-2 py-1 min-h-[32px]"
                  title="Monitor with Radarr"
                >
                  {isMonitoring ? '⏳ Adding...' : '📡 Monitor'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex flex-col space-y-3">
        {/* Poster */}
        <div className="aspect-[2/3] bg-gray-200 rounded overflow-hidden">
          <img
            src={posterUrl}
            alt={movie.title}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        </div>

        {/* Movie details */}
        <div className="flex-1 space-y-2">
          <h3 className="font-semibold text-sm leading-5 line-clamp-2">
            {movie.title}
          </h3>

          {/* Metadata */}
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <span>⭐</span>
                <span>{movie.vote_average.toFixed(1)}</span>
              </span>
              <span className="flex items-center space-x-1">
                <span>📅</span>
                <span>{year}</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <span>🗳️</span>
                <span>{movie.vote_count.toLocaleString()} votes</span>
              </span>
              <span className="flex items-center space-x-1">
                <span>🌟</span>
                <span>{Math.round(movie.popularity)}</span>
              </span>
            </div>

            {/* Language and Adult rating */}
            <div className="flex items-center justify-between">
              <span className="uppercase text-xs bg-gray-100 px-2 py-1 rounded">
                {movie.original_language}
              </span>
              {movie.adult && (
                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                  18+
                </span>
              )}
            </div>
          </div>

          {/* Overview */}
          {movie.overview && (
            <p className="text-xs text-gray-600 line-clamp-3 leading-4">
              {movie.overview}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          {/* Search torrents button */}
          <button
            onClick={handleSearchTorrentsClick}
            className="btn btn-secondary flex-1 min-h-[36px] text-xs"
            title="Search for torrents of this movie"
          >
            🔍 Search Torrents
          </button>

          {/* Monitor button */}
          {showMonitorOption && (
            <button
              onClick={handleMonitorClick}
              disabled={isMonitoring}
              className="btn btn-primary flex-1 min-h-[36px] text-xs"
              title="Monitor this movie with Radarr"
            >
              {isMonitoring ? (
                <>
                  <span className="inline-block animate-spin">⏳</span>
                  <span className="ml-1">Adding...</span>
                </>
              ) : (
                <>
                  <span>📡</span>
                  <span className="ml-1">Monitor</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* TMDB info */}
        <div className="text-xs text-gray-400 text-center pt-1 border-t border-gray-50">
          TMDB ID: {movie.id}
        </div>
      </div>
    </div>
  )
}

export default MovieCard