import React, { useState } from 'react'
import type { TVDBSeries } from '@/lib/types/media'

interface TVSeriesCardProps {
  series: TVDBSeries
  onMonitor?: (series: TVDBSeries) => void
  onSearchTorrents?: (series: TVDBSeries) => void
  isMonitoring?: boolean
  showMonitorOption?: boolean
  isCompact?: boolean
}

const TVSeriesCard: React.FC<TVSeriesCardProps> = ({
  series,
  onMonitor,
  onSearchTorrents,
  isMonitoring = false,
  showMonitorOption = true,
  isCompact = false
}) => {
  const [imageError, setImageError] = useState(false)

  // Handle TVDB image URLs (can be relative or absolute)
  const imageUrl = (() => {
    if (!series.image || imageError) return '/placeholder-series.jpg'
    if (series.image.startsWith('http')) return series.image
    return `https://artworks.thetvdb.com${series.image}`
  })()

  const getStatusColor = (status?: { name: string }) => {
    if (!status) return 'bg-gray-100 text-gray-800'

    const statusName = status.name.toLowerCase()
    if (statusName.includes('continuing') || statusName.includes('returning')) {
      return 'bg-green-100 text-green-800'
    } else if (statusName.includes('ended') || statusName.includes('canceled')) {
      return 'bg-red-100 text-red-800'
    } else if (statusName.includes('upcoming')) {
      return 'bg-blue-100 text-blue-800'
    }
    return 'bg-gray-100 text-gray-800'
  }

  const handleMonitorClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onMonitor) {
      onMonitor(series)
    }
  }

  const handleSearchTorrentsClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onSearchTorrents) {
      onSearchTorrents(series)
    }
  }

  if (isCompact) {
    return (
      <div className="card hover:shadow-md transition-shadow">
        <div className="flex space-x-3">
          {/* Compact poster */}
          <div className="flex-shrink-0">
            <img
              src={imageUrl}
              alt={series.name}
              className="w-16 h-24 object-cover rounded"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          </div>

          {/* Compact details */}
          <div className="flex-1 min-w-0 space-y-2">
            <h3 className="font-medium text-sm line-clamp-2 leading-5">
              {series.name}
            </h3>

            <div className="text-xs text-gray-600">
              <div className="flex items-center space-x-3">
                <span>⭐ {series.score ? series.score.toFixed(1) : 'N/A'}</span>
                <span>📅 {series.year || 'TBA'}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(series.status)}`}>
                  {series.status?.name || 'Unknown'}
                </span>
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
                  title="Monitor with Sonarr"
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
        {/* Series image */}
        <div className="aspect-[2/3] bg-gray-200 rounded overflow-hidden">
          <img
            src={imageUrl}
            alt={series.name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        </div>

        {/* Series details */}
        <div className="flex-1 space-y-2">
          <h3 className="font-semibold text-sm leading-5 line-clamp-2">
            {series.name}
          </h3>

          {/* Metadata */}
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <span>⭐</span>
                <span>{series.score ? series.score.toFixed(1) : 'N/A'}</span>
              </span>
              <span className="flex items-center space-x-1">
                <span>📅</span>
                <span>{series.year || 'TBA'}</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <span>🌍</span>
                <span>{series.originalCountry || 'N/A'}</span>
              </span>
              <span className="flex items-center space-x-1">
                <span>🗣️</span>
                <span className="uppercase">{series.originalLanguage || 'N/A'}</span>
              </span>
            </div>

            {/* Status and runtime */}
            <div className="flex items-center justify-between">
              <span className={`px-2 py-1 rounded text-xs ${getStatusColor(series.status)}`}>
                {series.status?.name || 'Unknown'}
              </span>
              {series.averageRuntime > 0 && (
                <span className="flex items-center space-x-1 text-xs">
                  <span>⏱️</span>
                  <span>{series.averageRuntime}min</span>
                </span>
              )}
            </div>

            {/* Air dates */}
            {(series.firstAired || series.lastAired || series.nextAired) && (
              <div className="text-xs space-y-0.5">
                {series.firstAired && (
                  <div>First aired: {new Date(series.firstAired).toLocaleDateString()}</div>
                )}
                {series.lastAired && (
                  <div>Last aired: {new Date(series.lastAired).toLocaleDateString()}</div>
                )}
                {series.nextAired && (
                  <div>Next aired: {new Date(series.nextAired).toLocaleDateString()}</div>
                )}
              </div>
            )}
          </div>

          {/* Overview */}
          {series.overview && (
            <p className="text-xs text-gray-600 line-clamp-3 leading-4">
              {series.overview}
            </p>
          )}

          {/* Genres */}
          {series.genres && series.genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {series.genres.slice(0, 3).map((genre) => (
                <span
                  key={genre.id}
                  className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded"
                >
                  {genre.name}
                </span>
              ))}
              {series.genres.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{series.genres.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Networks */}
          {series.networks && series.networks.length > 0 && (
            <div className="text-xs text-gray-500">
              <span className="font-medium">Network: </span>
              {series.networks.map(n => n.name).join(', ')}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          {/* Search torrents button */}
          <button
            onClick={handleSearchTorrentsClick}
            className="btn btn-secondary flex-1 min-h-[36px] text-xs"
            title="Search for torrents of this series"
          >
            🔍 Search Torrents
          </button>

          {/* Monitor button */}
          {showMonitorOption && (
            <button
              onClick={handleMonitorClick}
              disabled={isMonitoring}
              className="btn btn-primary flex-1 min-h-[36px] text-xs"
              title="Monitor this series with Sonarr"
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

        {/* TVDB info */}
        <div className="text-xs text-gray-400 text-center pt-1 border-t border-gray-50">
          TVDB ID: {series.id}
        </div>
      </div>
    </div>
  )
}

export default TVSeriesCard