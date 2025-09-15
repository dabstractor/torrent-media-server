'use client'

import React, { useState, useEffect } from 'react'
import { useServiceConfig } from '@/hooks/use-service-config'
import { useHealthCheck } from '@/hooks/use-health-check'
import ServiceCard from '@/components/services/ServiceCard'
import { ServiceHealth } from '@/lib/types/services'

// Custom hook to manage health checks for multiple services
const useMultiServiceHealth = (services: any[]) => {
  const [healthData, setHealthData] = useState<Map<string, ServiceHealth>>(new Map())

  // Create individual health check hooks for each service
  const healthResults = services.map(service => ({
    id: service.id,
    health: useHealthCheck(service)
  }))

  // Update health data map whenever individual health checks change
  useEffect(() => {
    const newHealthData = new Map<string, ServiceHealth>()
    healthResults.forEach(({ id, health }) => {
      newHealthData.set(id, health)
    })
    setHealthData(newHealthData)
  }, [healthResults.map(r => r.health).join(',')])

  return healthData
}

const ServicesPage: React.FC = () => {
  const { config: services, loading: configLoading, error: configError } = useServiceConfig()
  const healthData = useMultiServiceHealth(services)

  // Refresh function for manual refresh
  const handleRefresh = () => {
    window.location.reload()
  }

  // Calculate overall stats
  const totalServices = services.length
  const onlineServices = Array.from(healthData.values()).filter(health => health.available).length
  const offlineServices = totalServices - onlineServices

  // Loading state
  if (configLoading && services.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 min-h-screen bg-white dark:bg-gray-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96"></div>
          </div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Loading services...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (configError) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 min-h-screen bg-white dark:bg-gray-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              Services Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Monitor and access all configured services
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Configuration Error
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              {configError}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Empty state
  if (!configLoading && services.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 min-h-screen bg-white dark:bg-gray-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              Services Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Monitor and access all configured services
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚙️</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No Services Configured
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              No services are currently configured in your environment.
              Check your environment variables and Docker configuration.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 min-h-screen bg-white dark:bg-gray-900">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Services Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Monitor and access all configured services
          </p>
        </div>

        {/* Refresh button and stats */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Service stats */}
          {totalServices > 0 && (
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-600 dark:text-gray-400">
                  {onlineServices} online
                </span>
              </div>
              {offlineServices > 0 && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-gray-600 dark:text-gray-400">
                    {offlineServices} offline
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 min-h-[44px]"
            title="Refresh service status"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Services grid */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
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
                  loading={configLoading}
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
      </div>

      {/* Additional info section */}
      {totalServices > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Service Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                Security Notes
              </h3>
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                <li>• qBittorrent is VPN-isolated for IP protection</li>
                <li>• All external links open in new tabs</li>
                <li>• Services use proxy configurations where applicable</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                Health Monitoring
              </h3>
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                <li>• Status checks run every 30 seconds</li>
                <li>• Response time indicates service performance</li>
                <li>• Red indicators show connection issues</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ServicesPage