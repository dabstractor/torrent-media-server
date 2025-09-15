import React from 'react'
import ServiceCard from './ServiceCard'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ErrorMessage from '@/components/common/ErrorMessage'
import { ServiceConfig, ServiceHealth } from '@/lib/types/services'

interface ServiceGridProps {
  services: ServiceConfig[]
  healthData: Map<string, ServiceHealth>
  isLoading: boolean
  error: string | null
}

const ServiceGrid: React.FC<ServiceGridProps> = ({
  services,
  healthData,
  isLoading,
  error
}) => {
  // Show loading state
  if (isLoading && services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <LoadingSpinner />
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          Loading service configurations...
        </p>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="py-8">
        <ErrorMessage message={error} />
        <div className="mt-4 text-center">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Unable to load service configurations. Please check your configuration settings.
          </p>
        </div>
      </div>
    )
  }

  // Show empty state
  if (!isLoading && services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-6xl mb-4">⚙️</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No services configured
        </h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-md">
          No services are currently configured in your environment.
          Check your environment variables and Docker configuration.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Service count and info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">{services.length}</span>{' '}
          service{services.length !== 1 ? 's' : ''} configured
        </div>

        {/* Service categories */}
        <div className="flex flex-wrap gap-1">
          {Array.from(new Set(services.map(service => service.category))).map((category) => (
            <span
              key={category}
              className="inline-flex px-2 py-1 text-xs rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize"
            >
              {category}
            </span>
          ))}
        </div>
      </div>

      {/* Services grid */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {services.map((service) => {
          const health = healthData.get(service.id) || {
            available: false,
            lastCheck: null
          }

          return (
            <ServiceCard
              key={service.id}
              service={service}
              health={health}
              loading={isLoading}
            />
          )
        })}
      </div>

      {/* Health check info */}
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-4 border-t border-gray-100 dark:border-gray-700">
        Service health checks are performed every 30 seconds.
        Status indicators show real-time availability.
      </div>
    </div>
  )
}

export default ServiceGrid