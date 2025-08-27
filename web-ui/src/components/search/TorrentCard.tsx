import React from 'react'
import type { TorrentResult } from '@/lib/types'

interface TorrentCardProps {
  torrent: TorrentResult
  onAdd: (torrent: TorrentResult) => void
  isAdding?: boolean
}

const TorrentCard: React.FC<TorrentCardProps> = ({ 
  torrent, 
  onAdd, 
  isAdding = false 
}) => {
  const handleAddClick = () => {
    onAdd(torrent)
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return 'Unknown'
    }
  }

  const getCategoryColor = (category: string) => {
    // Assign colors based on category type
    const categoryLower = category.toLowerCase()
    
    if (categoryLower.includes('movie') || categoryLower.includes('film')) {
      return 'bg-blue-100 text-blue-800'
    } else if (categoryLower.includes('tv') || categoryLower.includes('show')) {
      return 'bg-green-100 text-green-800'
    } else if (categoryLower.includes('music') || categoryLower.includes('audio')) {
      return 'bg-purple-100 text-purple-800'
    } else if (categoryLower.includes('software') || categoryLower.includes('pc')) {
      return 'bg-orange-100 text-orange-800'
    } else if (categoryLower.includes('book') || categoryLower.includes('ebook')) {
      return 'bg-yellow-100 text-yellow-800'
    }
    
    return 'bg-gray-100 text-gray-800'
  }

  const getSeederColor = (seeders: number) => {
    if (seeders >= 50) return 'text-green-600'
    if (seeders >= 10) return 'text-yellow-600'
    if (seeders >= 1) return 'text-orange-600'
    return 'text-red-600'
  }

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex flex-col space-y-3">
        {/* Title and category */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm sm:text-base line-clamp-2 leading-5">
              {torrent.title}
            </h3>
          </div>
          
          {/* Category badge */}
          <div className="flex-shrink-0">
            <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getCategoryColor(torrent.category)}`}>
              {torrent.category}
            </span>
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <span className="text-gray-400">📦</span>
            <span>{torrent.sizeText}</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <span className="text-green-400">↑</span>
            <span className={getSeederColor(torrent.seeders)}>
              {torrent.seeders}
            </span>
          </div>
          
          <div className="flex items-center space-x-1">
            <span className="text-red-400">↓</span>
            <span>{torrent.leechers}</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <span className="text-gray-400">📡</span>
            <span className="truncate">{torrent.indexer}</span>
          </div>
        </div>

        {/* Date and indexer */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Published: {formatDate(torrent.publishDate)}</span>
          <span>ID: {torrent.id.slice(0, 8)}...</span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          {/* Download links */}
          <div className="flex-1 flex gap-2">
            {torrent.magnetUrl && (
              <a
                href={torrent.magnetUrl}
                className="btn btn-secondary flex-1 min-h-[44px] text-xs"
                title="Open magnet link"
              >
                🧲 Magnet
              </a>
            )}
            
            <a
              href={torrent.downloadUrl}
              className="btn btn-secondary flex-1 min-h-[44px] text-xs"
              title="Download torrent file"
              target="_blank"
              rel="noopener noreferrer"
            >
              💾 .torrent
            </a>
          </div>
          
          {/* Add button */}
          <button
            onClick={handleAddClick}
            disabled={isAdding}
            className="btn btn-primary min-h-[44px] px-4 text-sm"
            title="Add to downloads"
          >
            {isAdding ? (
              <>
                <span className="inline-block animate-spin">⏳</span>
                <span className="ml-1">Adding...</span>
              </>
            ) : (
              <>
                <span>➕</span>
                <span className="ml-1">Add</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default TorrentCard