import React from 'react'
import { ServiceHealth } from '@/lib/types/services'

interface ServiceStatusProps {
  health: ServiceHealth
}

const ServiceStatus: React.FC<ServiceStatusProps> = ({ health }) => {
  const { available, lastCheck, status, error, responseTime } = health

  const formatResponseTime = (time?: number): string => {
    if (!time) return ''
    return time < 1000 ? `${time}ms` : `${(time / 1000).toFixed(1)}s`
  }

  const formatLastCheck = (date: Date | null): string => {
    if (!date) return 'Never'
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="flex items-center space-x-2">
      {/* Status indicator */}
      <div className="flex items-center space-x-1">
        <div
          className={`w-3 h-3 rounded-full ${
            available
              ? 'bg-green-500 shadow-green-500/50 shadow-sm'
              : 'bg-red-500 shadow-red-500/50 shadow-sm'
          }`}
          aria-label={available ? 'Service online' : 'Service offline'}
        />
        <span className={`text-sm font-medium ${
          available
            ? 'text-green-600 dark:text-green-400'
            : 'text-red-600 dark:text-red-400'
        }`}>
          {available ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Response time and status code */}
      {available && responseTime && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {formatResponseTime(responseTime)}
          {status && ` (${status})`}
        </div>
      )}

      {/* Error message */}
      {!available && error && (
        <div
          className="text-xs text-red-600 dark:text-red-400 truncate max-w-[150px]"
          title={error}
        >
          {error}
        </div>
      )}

      {/* Last check time */}
      <div className="text-xs text-gray-400 dark:text-gray-500">
        {formatLastCheck(lastCheck)}
      </div>
    </div>
  )
}

export default ServiceStatus