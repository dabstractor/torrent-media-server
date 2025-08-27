'use client'

import React from 'react'
import { useSearch } from '@/hooks/use-search'
import SearchForm from '@/components/search/SearchForm'
import SearchResults from '@/components/search/SearchResults'
import type { SearchRequest } from '@/lib/api/search'
import type { TorrentResult } from '@/lib/types'

const SearchPage: React.FC = () => {
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Search Torrents
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Search across multiple indexers for torrents
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
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <SearchForm
          onSearch={handleSearch}
          isLoading={isLoading}
        />
      </div>

      {/* Search results */}
      <SearchResults
        results={results}
        total={total}
        indexers={indexers}
        isLoading={isLoading}
        error={error}
        onAddTorrent={handleAddTorrent}
      />
    </div>
  )
}

export default SearchPage
