import React, { useState } from 'react'
import TorrentCard from './TorrentCard'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ErrorMessage from '@/components/common/ErrorMessage'
import PaginationControls from './PaginationControls'
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination'
import type { TorrentResult } from '@/lib/types'

interface SearchResultsProps {
  results: TorrentResult[]
  total: number
  indexers: string[]
  isLoading: boolean
  error: string | null
  onAddTorrent: (torrent: TorrentResult) => Promise<boolean>
  currentPage?: number
  totalPages?: number
  pageSize?: number
  onPageSizeChange?: (size: number) => void
  onPageChange?: (page: number) => void
}

const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  total,
  indexers,
  isLoading,
  error,
  onAddTorrent,
  currentPage = 1,
  totalPages = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  onPageSizeChange,
  onPageChange
}) => {
  const [addingTorrents, setAddingTorrents] = useState<Set<string>>(new Set())
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
      {/* Top pagination controls */}
      {(onPageSizeChange || onPageChange) && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange || (() => {})}
          onPageChange={onPageChange || (() => {})}
          total={total}
          currentCount={results.length}
        />
      )}

      {/* Indexer list */}
      {indexers.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Results from{' '}
            <span className="font-medium">{indexers.length}</span>{' '}
            indexer{indexers.length !== 1 ? 's' : ''}
          </div>
          <div className="flex flex-wrap gap-1">
            {indexers.map((indexer) => (
              <span
                key={indexer}
                className="inline-flex px-2 py-1 text-xs rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                {indexer}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Results grid */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {results.map((torrent) => (
          <TorrentCard
            key={torrent.id}
            torrent={torrent}
            onAdd={handleAddTorrent}
            isAdding={addingTorrents.has(torrent.id)}
          />
        ))}
      </div>

      {/* Bottom pagination controls */}
      {(onPageSizeChange || onPageChange) && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange || (() => {})}
          onPageChange={onPageChange || (() => {})}
          total={total}
          currentCount={results.length}
        />
      )}
    </div>
  )
}

export default SearchResults
