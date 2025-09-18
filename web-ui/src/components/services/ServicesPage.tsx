'use client'

import React, { useState, useEffect } from 'react'
import { useServiceConfig } from '@/hooks/use-service-config'
import ServiceGrid from './ServiceGrid'
import { ServiceHealth } from '@/lib/types/services'

// Custom hook to manage health checks for multiple services
const useMultiServiceHealth = (services: any[]) => {
  const [healthData, setHealthData] = useState<Map<string, ServiceHealth>>(new Map())
  const [serviceHealthChecks] = useState<Map<string, any>>(new Map())

  // Update health checks when services change
  useEffect(() => {
    const newHealthData = new Map<string, ServiceHealth>()

    // Initialize health data for each service
    services.forEach(service => {
      if (!serviceHealthChecks.has(service.id)) {
        serviceHealthChecks.set(service.id, {
          service,
          health: {
            available: false,
            lastCheck: null
          }
        })
      }

      // Initialize with default health status
      newHealthData.set(service.id, {
        available: false,
        lastCheck: null
      })
    })

    // Remove health checks for services that no longer exist
    for (const [serviceId] of serviceHealthChecks) {
      if (!services.some(s => s.id === serviceId)) {
        serviceHealthChecks.delete(serviceId)
      }
    }

    setHealthData(newHealthData)
  }, [services, serviceHealthChecks])

  // Manually perform health checks for all services
  useEffect(() => {
    if (services.length === 0) return

    const performHealthChecks = async () => {
      const checks = services.map(async (service) => {
        try {
          const startTime = Date.now()
          // Always use healthEndpoint as-is (should be relative path like /api/health/servicename)
          const response = await fetch(service.healthEndpoint, {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
          })
          const responseTime = Date.now() - startTime

          // Parse the health check API response
          let healthData: any = {}
          try {
            healthData = await response.json()
          } catch (parseError) {
            console.warn(`Failed to parse health response for ${service.id}:`, parseError)
          }

          // Use the status from the health check API response
          const isAvailable = healthData.status === 'online'

          return {
            id: service.id,
            health: {
              available: isAvailable,
              lastCheck: new Date(),
              status: response.status,
              responseTime: healthData.responseTime || responseTime,
              error: isAvailable ? undefined : (healthData.error || `HTTP ${response.status}: ${response.statusText}`)
            }
          }
        } catch (error) {
          const responseTime = Date.now() - startTime
          return {
            id: service.id,
            health: {
              available: false,
              lastCheck: new Date(),
              error: error instanceof Error ? error.message : 'Unknown error',
              responseTime
            }
          }
        }
      })

      const results = await Promise.all(checks)
      const newHealthData = new Map<string, ServiceHealth>()

      results.forEach(({ id, health }) => {
        newHealthData.set(id, health)
      })

      setHealthData(newHealthData)
    }

    // Initial check
    performHealthChecks()

    // Set up interval for periodic checks
    const interval = setInterval(performHealthChecks, 30000)

    return () => clearInterval(interval)
  }, [services])

  return healthData
}

const ServicesPage: React.FC = () => {
  const { config: services, loading: configLoading, error: configError } = useServiceConfig()
  const healthData = useMultiServiceHealth(services)

  // Simple test to see if Jellyfin is in the services list
  const hasJellyfin = services.some(service => service.id === 'jellyfin')
  console.log('[TEST] Services list:', services)
  console.log('[TEST] Has Jellyfin:', hasJellyfin)

  // Refresh function for manual refresh
  const handleRefresh = () => {
    // Force a re-render which will trigger health checks
    window.location.reload()
  }

  // Calculate overall stats
  const totalServices = services.length
  const onlineServices = Array.from(healthData.values()).filter(health => health.available).length
  const offlineServices = totalServices - onlineServices

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
            className="btn btn-secondary min-h-[44px] px-4"
            title="Refresh service status"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Test message to see if Jellyfin is detected */}
      <div className="bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-700 text-yellow-700 dark:text-yellow-200 px-4 py-3 rounded">
        <p className="font-bold">Debug Info:</p>
        <p>Total services: {totalServices}</p>
        <p>Has Jellyfin: {hasJellyfin ? 'Yes' : 'No'}</p>
        <p>Services loading: {configLoading ? 'Yes' : 'No'}</p>
        {configError && <p>Error: {configError}</p>}
      </div>

      {/* Services grid */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <ServiceGrid
          services={services}
          healthData={healthData}
          isLoading={configLoading}
          error={configError}
        />
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