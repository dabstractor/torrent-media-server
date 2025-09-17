import React from 'react'
import { ServiceCardProps } from '@/lib/types/services'
import ServiceStatus from './ServiceStatus'

const ServiceCard: React.FC<ServiceCardProps> = ({ service, health, loading }) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
        <div className="flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
          </div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  // Generate dynamic URL using the browser's current hostname
  const generateDynamicUrl = (originalUrl: string): string => {
    try {
      const serviceUrl = new URL(originalUrl);
      // Use window.location.protocol for the protocol, window.location.hostname for the hostname,
      // and keep the original port and pathname
      return `${window.location.protocol}//${window.location.hostname}:${serviceUrl.port}${serviceUrl.pathname}`;
    } catch (error) {
      // If URL parsing fails, fall back to the original URL
      console.warn('Failed to parse service URL, falling back to original:', originalUrl);
      return originalUrl;
    }
  };

  const dynamicUrl = generateDynamicUrl(service.url);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'media':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'download':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'indexer':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'proxy':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'media':
        return '🎬'
      case 'download':
        return '⬇️'
      case 'indexer':
        return '🔍'
      case 'proxy':
        return '🌐'
      default:
        return '⚙️'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
      <div className="flex flex-col space-y-4">
        {/* Header with service name and status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl" aria-hidden="true">
              {getCategoryIcon(service.category)}
            </span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {service.name}
              </h3>
              {/* Category badge */}
              <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getCategoryColor(service.category)}`}>
                {service.category}
              </span>
            </div>
          </div>
          <ServiceStatus health={health} />
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {service.description}
        </p>

        {/* Service metadata */}
        <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center space-x-2">
            <span className="text-gray-400">🔗</span>
            <span className="truncate" title={dynamicUrl}>
              {window.location.hostname}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-400">🔐</span>
            <span>{service.requiresAuth ? 'Requires Auth' : 'No Auth'}</span>
          </div>
        </div>

        {/* Action button */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
          <a
            href={dynamicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium rounded-md min-h-[44px] transition-colors ${
              health.available
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
            aria-disabled={!health.available}
            title={health.available ? `Open ${service.name}` : `${service.name} is unavailable`}
          >
            <span className="mr-2">🚀</span>
            Open {service.name}
          </a>
        </div>
      </div>
    </div>
  )
}

export default ServiceCard