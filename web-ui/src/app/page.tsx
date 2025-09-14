'use client'

import React, { Suspense, useState } from 'react'
import { useSearch } from '@/hooks/use-search'
import SearchForm, { type SearchMode } from '@/components/search/SearchForm'
import SearchResults from '@/components/search/SearchResults'
import SearchLoadingSkeleton from '@/components/search/SearchLoadingSkeleton'
import type { SearchRequest } from '@/lib/api/search'
import type { TorrentResult } from '@/lib/types'
import type { TMDBMovie, TVDBSeries } from '@/lib/types/media'

// CRITICAL: SearchContent component uses useSearchParams and must be wrapped in Suspense
const SearchContent: React.FC = () => {
  const [searchMode, setSearchMode] = useState<SearchMode>('torrent')

  const {
    results,
    total,
    indexers,
    isLoading,
    error,
    search,
    addToDownloads,
    clearResults
  } = useSearch()

  const handleSearch = (searchParams: SearchRequest) => {
    search(searchParams)
  }

  const handleAddTorrent = async (torrent: TorrentResult) => {
    const success = await addToDownloads(torrent)
    return success
  }

  const handleClearResults = () => {
    clearResults()
  }

  const handleMovieSelect = (movie: TMDBMovie) => {
    // TODO: Handle movie selection - could search for torrents or show monitoring options
    console.log('Selected movie:', movie)
    // For now, let's search for torrents of this movie
    const query = `${movie.title} ${movie.release_date?.split('-')[0] || ''}`
    setSearchMode('torrent')
    search({ query: query.trim(), limit: 50, offset: 0 })
  }

  const handleSeriesSelect = (series: TVDBSeries) => {
    // TODO: Handle series selection - could search for torrents or show monitoring options
    console.log('Selected series:', series)
    // For now, let's search for torrents of this series
    const query = `${series.name} ${series.year || ''}`
    setSearchMode('torrent')
    search({ query: query.trim(), limit: 50, offset: 0 })
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 min-h-screen bg-white dark:bg-gray-900">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            {searchMode === 'torrent' ? 'Search Torrents' : 'Media Discovery'}
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {searchMode === 'torrent'
              ? 'Search across multiple indexers for torrents'
              : 'Discover movies and TV series, optionally add to monitoring'
            }
          </p>
        </div>

        {/* Clear results button */}
        {results.length > 0 && (
          <button
            onClick={handleClearResults}
            className="btn btn-secondary min-h-[44px] px-4"
          >
            Clear Results
          </button>
        )}
      </div>

      {/* Search form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <SearchForm
          onSearch={handleSearch}
          onMovieSelect={handleMovieSelect}
          onSeriesSelect={handleSeriesSelect}
          isLoading={isLoading}
          searchMode={searchMode}
          onSearchModeChange={setSearchMode}
        />
      </div>

      {/* Search results - only show for torrent search mode */}
      {searchMode === 'torrent' && (
        <SearchResults
          results={results}
          total={total}
          indexers={indexers}
          isLoading={isLoading}
          error={error}
          onAddTorrent={handleAddTorrent}
        />
      )}
    </div>
  )
}

// Main SearchPage component with required Suspense boundary
export default function SearchPage() {
  return (
    <Suspense fallback={<SearchLoadingSkeleton />}>
      <SearchContent />
    </Suspense>
  )
}