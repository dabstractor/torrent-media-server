import React, { useState, useMemo } from 'react'
import { useTorrents } from '@/hooks/use-torrents'
import DownloadCard from './DownloadCard'
import BatchControls from './BatchControls'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ErrorMessage from '@/components/common/ErrorMessage'
import type { DownloadState } from '@/lib/types'

interface DownloadFiltersState {
  state: DownloadState[]
  categories: string[]
  sortBy: 'name' | 'progress' | 'downloadSpeed' | 'eta' | 'addedTime'
  sortOrder: 'asc' | 'desc'
}

const DownloadsDashboard: React.FC = () => {
  const { torrents, stats, isLoading, error, refresh } = useTorrents()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<DownloadFiltersState>({
    state: [],
    categories: [],
    sortBy: 'addedTime',
    sortOrder: 'desc'
  })


  // Filter and sort downloads
  const filteredTorrents = useMemo(() => {
    let filtered = [...torrents]
    
    // Apply state filter
    if (filters.state.length > 0) {
      filtered = filtered.filter(download => filters.state.includes(download.state))
    }
    
    // Apply category filter
    if (filters.categories.length > 0) {
      filtered = filtered.filter(download => 
        download.category && filters.categories.includes(download.category)
      )
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[filters.sortBy]
      let bValue = b[filters.sortBy]
      
      if (typeof aValue === 'string') aValue = aValue.toLowerCase()
      if (typeof bValue === 'string') bValue = bValue.toLowerCase()
      
      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1
      return 0
    })
    
    return filtered
  }, [torrents, filters])

  const handleSelectTorrent = (hash: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (selected) {
        next.add(hash)
      } else {
        next.delete(hash)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === filteredTorrents.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredTorrents.map(t => t.hash)))
    }
  }

  const handleRefresh = () => {
    refresh()
  }

  // Show loading state
  if (isLoading && torrents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <LoadingSpinner />
        <p className="mt-4 text-gray-600">Loading downloads...</p>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="py-8">
        <ErrorMessage message={error.message || 'Failed to load downloads'} />
        <div className="mt-4 text-center">
          <button
            onClick={handleRefresh}
            className="btn btn-primary min-h-[44px] px-6"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Show empty state
  if (!isLoading && torrents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-6xl mb-4">📥</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No downloads yet</h3>
        <p className="text-gray-600 max-w-md">
          Start by searching for torrents and adding them to your downloads.
        </p>
        <a
          href="/search"
          className="btn btn-primary min-h-[44px] px-6 mt-4"
        >
          Search Torrents
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      {stats && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">
                {stats.activeCount}
              </div>
              <div className="text-gray-600">Active</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">
                ↓ {(stats.downloadSpeed / 1024 / 1024).toFixed(1)} MB/s
              </div>
              <div className="text-gray-600">Download</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-purple-600">
                ↑ {(stats.uploadSpeed / 1024 / 1024).toFixed(1)} MB/s
              </div>
              <div className="text-gray-600">Upload</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-700">
                {(stats.totalSize / 1024 / 1024 / 1024).toFixed(1)} GB
              </div>
              <div className="text-gray-600">Total Size</div>
            </div>
          </div>
        </div>
      )}

      {/* Controls bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Select all checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="select-all"
              checked={selectedIds.size === filteredTorrents.length && filteredTorrents.length > 0}
              onChange={handleSelectAll}
              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="select-all" className="ml-2 text-sm text-gray-700">
              Select All ({selectedIds.size})
            </label>
          </div>

          {/* Quick filters */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilters(prev => ({ ...prev, state: ['downloading'] }))}
              className={`btn btn-sm ${filters.state.includes('downloading') ? 'btn-primary' : 'btn-secondary'}`}
            >
              Downloading
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, state: ['completed'] }))}
              className={`btn btn-sm ${filters.state.includes('completed') ? 'btn-primary' : 'btn-secondary'}`}
            >
              Completed
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, state: [] }))}
              className="btn btn-sm btn-secondary"
            >
              All
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="btn btn-secondary min-h-[44px] px-4"
            title="Refresh downloads"
          >
            {isLoading ? '⏳' : '🔄'} Refresh
          </button>
        </div>
      </div>

      {/* Batch controls */}
      {selectedIds.size > 0 && (
        <BatchControls
          selectedIds={Array.from(selectedIds)}
          onBatchComplete={() => setSelectedIds(new Set())}
        />
      )}

      {/* Downloads summary */}
      <div className="text-sm text-gray-600">
        Showing <span className="font-medium">{filteredTorrents.length}</span> of{' '}
        <span className="font-medium">{torrents.length}</span> downloads
      </div>

      {/* Downloads grid */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {filteredTorrents.map((download) => (
          <DownloadCard
            key={download.hash}
            download={download}
            isSelected={selectedIds.has(download.hash)}
            onSelect={handleSelectTorrent}
          />
        ))}
      </div>

      {/* Auto-refresh indicator */}
      <div className="text-center text-xs text-gray-500">
        Auto-refreshing every 5 seconds • Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  )
}

export default DownloadsDashboard