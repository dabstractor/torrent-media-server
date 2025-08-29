import React from 'react'

interface ProgressBarProps {
  progress: number // 0-100
  downloadSpeed?: number // bytes per second
  uploadSpeed?: number // bytes per second
  eta?: number // seconds
  showDetails?: boolean
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  downloadSpeed = 0,
  uploadSpeed = 0,
  eta = 0,
  showDetails = true
}) => {
  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond === 0) return '0 B/s'
    
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s']
    let speed = bytesPerSecond
    let unitIndex = 0
    
    while (speed >= 1024 && unitIndex < units.length - 1) {
      speed /= 1024
      unitIndex++
    }
    
    return `${speed.toFixed(1)} ${units[unitIndex]}`
  }

  const formatETA = (seconds: number): string => {
    if (seconds === 0 || seconds === Infinity || isNaN(seconds)) {
      return '∞'
    }
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    } else {
      return `${remainingSeconds}s`
    }
  }


  const getProgressGradient = (progress: number): string => {
    if (progress === 100) {
      return 'from-green-400 to-green-600 dark:from-green-400 dark:to-green-500'
    } else if (progress >= 75) {
      return 'from-blue-400 to-blue-600 dark:from-blue-400 dark:to-blue-500'
    } else if (progress >= 50) {
      return 'from-indigo-400 to-indigo-600 dark:from-indigo-400 dark:to-indigo-500'
    } else if (progress >= 25) {
      return 'from-purple-400 to-purple-600 dark:from-purple-400 dark:to-purple-500'
    }
    return 'from-gray-300 to-gray-500 dark:from-gray-500 dark:to-gray-600'
  }

  // Clamp progress to valid range
  const clampedProgress = Math.max(0, Math.min(100, progress))
  const isCompleted = clampedProgress === 100
  const isActive = downloadSpeed > 0 || uploadSpeed > 0

  return (
    <div className="w-full space-y-2">
      {/* Progress bar */}
      <div className="relative">
        {/* Background bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          {/* Progress fill */}
          <div
            className={`h-full bg-gradient-to-r ${getProgressGradient(clampedProgress)} transition-all duration-300 ease-out relative`}
            style={{ width: `${clampedProgress}%` }}
          >
            {/* Animated shimmer effect for active downloads */}
            {isActive && !isCompleted && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse" />
            )}
          </div>
        </div>
        
        {/* Progress percentage overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xs font-medium ${clampedProgress > 50 ? 'text-white dark:text-white' : 'text-gray-700 dark:text-gray-200'}`}>
            {clampedProgress.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Progress details */}
      {showDetails && (
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center space-x-3">
            {/* Download speed */}
            <div className="flex items-center space-x-1">
              <span className={`${downloadSpeed > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                ⬇
              </span>
              <span className={downloadSpeed > 0 ? 'text-green-600 dark:text-green-400 font-medium' : ''}>
                {formatSpeed(downloadSpeed)}
              </span>
            </div>
            
            {/* Upload speed */}
            <div className="flex items-center space-x-1">
              <span className={`${uploadSpeed > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'}`}>
                ⬆
              </span>
              <span className={uploadSpeed > 0 ? 'text-purple-600 dark:text-purple-400 font-medium' : ''}>
                {formatSpeed(uploadSpeed)}
              </span>
            </div>
          </div>

          {/* ETA */}
          <div className="flex items-center space-x-1">
            <span className="text-gray-400 dark:text-gray-500">⏱</span>
            <span className={eta > 0 && eta !== Infinity ? 'font-medium' : ''}>
              {isCompleted ? 'Completed' : formatETA(eta)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProgressBar