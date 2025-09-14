'use client'

import React, { Suspense, useState, useEffect } from 'react'
import { useSearch } from '@/hooks/use-search'
import { useSearchURL } from '@/hooks/use-search-url'
import SearchForm from '@/components/search/SearchForm'
import SearchResults from '@/components/search/SearchResults'
import SearchLoadingSkeleton from '@/components/search/SearchLoadingSkeleton'
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination'
import type { SearchRequest } from '@/lib/api/search'
import type { TorrentResult } from '@/lib/types'

// CRITICAL: SearchContent component uses useSearchParams and must be wrapped in Suspense
const SearchContent: React.FC = () => {
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

  const { searchState, updateURL } = useSearchURL()

  // Get pagination parameters from URL
  const currentPage = searchState.page || 1
  const pageSize = searchState.limit || DEFAULT_PAGE_SIZE
  const totalPages = Math.ceil(total / pageSize)

  // State for paginated results to force re-render when pagination changes
  const [paginatedResults, setPaginatedResults] = useState<TorrentResult[]>([])

  // Update paginated results whenever pagination parameters change
  useEffect(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    setPaginatedResults(results.slice(startIndex, endIndex))
  }, [results, currentPage, pageSize])

  const handleSearch = (searchParams: SearchRequest) => {
    search(searchParams)
  }

  const handlePageSizeChange = (size: number) => {
    updateURL({ limit: size, page: 1 })
  }

  const handlePageChange = (page: number) => {
    updateURL({ page })
  }

  const handleAddTorrent = async (torrent: TorrentResult) => {
    const success = await addToDownloads(torrent)
    return success
  }

  const handleClearResults = () => {
    clearResults()
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 min-h-screen bg-white dark:bg-gray-900">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Search Torrents
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
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
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <SearchForm
          onSearch={handleSearch}
          isLoading={isLoading}
        />
      </div>

      {/* Search results */}
      <SearchResults
        results={paginatedResults}
        total={total}
        indexers={indexers}
        isLoading={isLoading}
        error={error}
        onAddTorrent={handleAddTorrent}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
        onPageChange={handlePageChange}
      />
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