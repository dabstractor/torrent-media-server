import React from 'react'
import { useTorrents } from '@/hooks/use-torrents'
import ProgressBar from './ProgressBar'
import type { Download } from '@/lib/types'

interface DownloadCardProps {
  download: Download
  isSelected?: boolean
  onSelect: (hash: string, selected: boolean) => void
}

const DownloadCard: React.FC<DownloadCardProps> = ({ 
  download, 
  isSelected = false,
  onSelect 
}) => {
  const { pauseTorrent, resumeTorrent, deleteTorrent } = useTorrents()

  const handleSelect = () => {
    onSelect(download.hash, !isSelected)
  }

  const handlePause = async () => {
    await pauseTorrent(download.hash)
  }

  const handleResume = async () => {
    await resumeTorrent(download.hash)
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this download? This cannot be undone.')) {
      await deleteTorrent(download.hash)
    }
  }

  const formatBytes = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatBytes(bytesPerSecond)}/s`
  }

  const formatETA = (seconds: number): string => {
    if (seconds === 0 || seconds === Infinity) return '∞'
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStateColor = (state: string): string => {
    switch (state) {
      case 'downloading':
        return 'text-blue-600 bg-blue-100'
      case 'completed':
        return 'text-green-600 bg-green-100'
      case 'paused':
        return 'text-orange-600 bg-orange-100'
      case 'seeding':
        return 'text-purple-600 bg-purple-100'
      case 'error':
        return 'text-red-600 bg-red-100'
      case 'queued':
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStateIcon = (state: string): string => {
    switch (state) {
      case 'downloading':
        return '⬇️'
      case 'completed':
        return '✅'
      case 'paused':
        return '⏸️'
      case 'seeding':
        return '🌱'
      case 'error':
        return '❌'
      case 'queued':
        return '⏳'
      default:
        return '❓'
    }
  }

  const canPause = download.state === 'downloading' || download.state === 'queued'
  const canResume = download.state === 'paused'
  const isActive = download.state === 'downloading'

  return (
    <div className={`card hover:shadow-md transition-shadow ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
      <div className="flex flex-col space-y-3">
        {/* Header with checkbox and state */}
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleSelect}
            className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm sm:text-base line-clamp-2 leading-5">
              {download.name}
            </h3>
            
            {/* State badge */}
            <div className="mt-2">
              <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${getStateColor(download.state)}`}>
                <span className="mr-1">{getStateIcon(download.state)}</span>
                {download.state.toUpperCase()}
              </span>
              {download.category && (
                <span className="ml-2 inline-flex px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                  {download.category}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <ProgressBar 
          progress={download.progress}
          downloadSpeed={download.downloadSpeed}
          uploadSpeed={download.uploadSpeed}
          eta={download.eta}
        />

        {/* Download stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <span className="text-gray-400">📦</span>
            <span>{formatBytes(download.size)}</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <span className="text-green-400">↓</span>
            <span className={isActive ? 'text-green-600 font-medium' : ''}>
              {formatSpeed(download.downloadSpeed)}
            </span>
          </div>
          
          <div className="flex items-center space-x-1">
            <span className="text-purple-400">↑</span>
            <span className={download.uploadSpeed > 0 ? 'text-purple-600 font-medium' : ''}>
              {formatSpeed(download.uploadSpeed)}
            </span>
          </div>
          
          <div className="flex items-center space-x-1">
            <span className="text-blue-400">⏱️</span>
            <span>{formatETA(download.eta)}</span>
          </div>
        </div>

        {/* Additional metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Added: {formatDate(download.addedTime)}</span>
          <span>Priority: {download.priority}</span>
          {download.completedTime && (
            <span>Completed: {formatDate(download.completedTime)}</span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          {/* Control buttons */}
          <div className="flex gap-2">
            {canPause && (
              <button
                onClick={handlePause}
                className="btn btn-secondary flex-1 min-h-[44px] text-xs"
                title="Pause download"
              >
                ⏸️ Pause
              </button>
            )}
            
            {canResume && (
              <button
                onClick={handleResume}
                className="btn btn-primary flex-1 min-h-[44px] text-xs"
                title="Resume download"
              >
                ▶️ Resume
              </button>
            )}
            
            {download.state === 'completed' && (
              <button
                className="btn btn-secondary flex-1 min-h-[44px] text-xs"
                title="Open download location"
              >
                📁 Open
              </button>
            )}
          </div>
          
          {/* Delete button */}
          <button
            onClick={handleDelete}
            className="btn btn-secondary min-h-[44px] px-4 text-xs hover:bg-red-50 hover:text-red-600"
            title="Delete download"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  )
}

export default DownloadCard