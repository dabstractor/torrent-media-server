import React, { useState, useCallback } from 'react'
import { useTMDBSearch } from '@/hooks/use-tmdb-search'
import type { TMDBMovie, TMDBTVShow } from '@/lib/types/media'

interface MediaDiscoveryTabProps {
  onMovieSelect?: (movie: TMDBMovie) => void
  onSeriesSelect?: (series: TMDBTVShow) => void
  isLoading?: boolean
}

type MediaType = 'movie' | 'tv'

const MediaDiscoveryTab: React.FC<MediaDiscoveryTabProps> = ({
  onMovieSelect,
  onSeriesSelect,
  isLoading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [mediaType, setMediaType] = useState<MediaType>('movie')
  const [searchYear, setSearchYear] = useState<string>('')

  // Use the TMDB search hook for both movies and TV shows
  const {
    movies,
    tvShows: series,
    total: movieTotal,
    tvTotal: seriesTotal,
    isLoading: isLoadingTMDB,
    error: tmdbError,
    searchMovies,
    searchTVShows,
    clearResults
  } = useTMDBSearch()

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()

    if (!searchQuery.trim()) {
      return
    }

    if (mediaType === 'movie') {
      searchMovies({
        query: searchQuery.trim(),
        year: searchYear ? parseInt(searchYear) : undefined
      })
    } else {
      searchTVShows({
        query: searchQuery.trim()
      })
    }
  }, [searchQuery, mediaType, searchYear, searchMovies, searchTVShows])

  const handleMediaTypeChange = (newType: MediaType) => {
    setMediaType(newType)
    // Clear results when switching types
    clearResults()
  }

  const handleClearResults = () => {
    setSearchQuery('')
    setSearchYear('')
    clearResults()
  }

  const isSearching = isLoadingTMDB || isLoading
  const currentResults = mediaType === 'movie' ? movies : series
  const currentTotal = mediaType === 'movie' ? movieTotal : seriesTotal

  return (
    <div className="space-y-4">
      {/* Search Form */}
      <form onSubmit={handleSearch} className="space-y-4">
        {/* Media type toggle */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => handleMediaTypeChange('movie')}
            className={`btn min-h-[44px] px-4 ${
              mediaType === 'movie' ? 'btn-primary' : 'btn-secondary'
            }`}
            disabled={isSearching}
          >
            🎬 Movies
          </button>
          <button
            type="button"
            onClick={() => handleMediaTypeChange('tv')}
            className={`btn min-h-[44px] px-4 ${
              mediaType === 'tv' ? 'btn-primary' : 'btn-secondary'
            }`}
            disabled={isSearching}
          >
            📺 TV Series
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          {/* Main search input */}
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${mediaType === 'movie' ? 'movies' : 'TV series'}...`}
              className="input w-full min-h-[44px]"
              disabled={isSearching}
            />
          </div>

          {/* Year filter (movies only) */}
          {mediaType === 'movie' && (
            <div className="w-full sm:w-32">
              <input
                type="number"
                value={searchYear}
                onChange={(e) => setSearchYear(e.target.value)}
                placeholder="Year"
                min="1900"
                max={new Date().getFullYear() + 5}
                className="input w-full min-h-[44px] text-center"
                disabled={isSearching}
              />
            </div>
          )}

          {/* Search button */}
          <button
            type="submit"
            disabled={!searchQuery.trim() || isSearching}
            className="btn btn-primary min-h-[44px] px-6 sm:px-8"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>

          {/* Clear button */}
          {(currentResults.length > 0 || searchQuery) && (
            <button
              type="button"
              onClick={handleClearResults}
              className="btn btn-secondary min-h-[44px] px-4"
              disabled={isSearching}
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Error display */}
      {tmdbError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {tmdbError}
        </div>
      )}

      {/* Results summary */}
      {currentTotal > 0 && (
        <div className="text-sm text-gray-600">
          Found {currentTotal} {mediaType === 'movie' ? 'movies' : 'TV series'} for "{searchQuery}"
          {mediaType === 'movie' && searchYear && ` in ${searchYear}`}
        </div>
      )}

      {/* Results grid */}
      {currentResults.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {mediaType === 'movie'
            ? movies.map((movie) => (
                <div key={movie.id} className="card hover:shadow-md transition-shadow cursor-pointer">
                  <div
                    onClick={() => onMovieSelect?.(movie)}
                    className="flex flex-col space-y-3"
                  >
                    {/* Poster */}
                    <div className="aspect-[2/3] bg-gray-200 rounded overflow-hidden">
                      <img
                        src={movie.poster_path
                          ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
                          : '/placeholder-poster.jpg'
                        }
                        alt={movie.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>

                    {/* Movie details */}
                    <div className="flex-1 space-y-2">
                      <h3 className="font-medium text-sm leading-5 line-clamp-2">
                        {movie.title}
                      </h3>

                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex items-center justify-between">
                          <span>⭐ {movie.vote_average.toFixed(1)}</span>
                          <span>{movie.release_date ? movie.release_date.split('-')[0] : 'TBA'}</span>
                        </div>
                        {movie.overview && (
                          <p className="line-clamp-2 leading-4">
                            {movie.overview}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Select button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onMovieSelect?.(movie)
                      }}
                      className="btn btn-primary w-full min-h-[36px] text-sm"
                    >
                      Select Movie
                    </button>
                  </div>
                </div>
              ))
            : series.map((show) => (
                <div key={show.id} className="card hover:shadow-md transition-shadow cursor-pointer">
                  <div
                    onClick={() => onSeriesSelect?.(show)}
                    className="flex flex-col space-y-3"
                  >
                    {/* Series image */}
                    <div className="aspect-[2/3] bg-gray-200 rounded overflow-hidden">
                      <img
                        src={show.poster_path
                          ? `https://image.tmdb.org/t/p/w342${show.poster_path}`
                          : '/placeholder-series.jpg'
                        }
                        alt={show.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>

                    {/* Series details */}
                    <div className="flex-1 space-y-2">
                      <h3 className="font-medium text-sm leading-5 line-clamp-2">
                        {show.name}
                      </h3>

                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex items-center justify-between">
                          <span>⭐ {show.vote_average.toFixed(1)}</span>
                          <span>{show.first_air_date ? show.first_air_date.split('-')[0] : 'TBA'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>{show.status || 'Unknown'}</span>
                          <span>{show.origin_country?.[0] || 'N/A'}</span>
                        </div>
                        {show.overview && (
                          <p className="line-clamp-2 leading-4">
                            {show.overview}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Select button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onSeriesSelect?.(show)
                      }}
                      className="btn btn-primary w-full min-h-[36px] text-sm"
                    >
                      Select Series
                    </button>
                  </div>
                </div>
              ))
          }
        </div>
      )}

      {/* Empty state */}
      {!isSearching && currentResults.length === 0 && searchQuery && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-4">
            {mediaType === 'movie' ? '🎬' : '📺'}
          </div>
          <p>No {mediaType === 'movie' ? 'movies' : 'TV series'} found for "{searchQuery}"</p>
          <p className="text-sm mt-2">Try different search terms or check the spelling</p>
        </div>
      )}

      {/* Initial state */}
      {!searchQuery && currentResults.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-4">🔍</div>
          <p>Search for {mediaType === 'movie' ? 'movies' : 'TV series'} to discover new content</p>
          <p className="text-sm mt-2">Use the search box above to get started</p>
        </div>
      )}
    </div>
  )
}

export default MediaDiscoveryTab