import { useState, useEffect, useCallback, useRef } from 'react'
import { ServiceConfig, ServiceHealth } from '@/lib/types/services'

export const useHealthCheck = (service: ServiceConfig, interval = 30000): ServiceHealth => {
  const [health, setHealth] = useState<ServiceHealth>({
    available: false,
    lastCheck: null
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const checkHealth = useCallback(async () => {
    const startTime = Date.now()

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    try {
      // Set up timeout manually
      const timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }
      }, 5000)

      // If healthEndpoint starts with http, use it as-is, otherwise combine with service.url
      const healthUrl = service.healthEndpoint.startsWith('http')
        ? service.healthEndpoint
        : `${service.url}${service.healthEndpoint}`

      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: abortControllerRef.current.signal
      })

      clearTimeout(timeoutId)

      const responseTime = Date.now() - startTime

      setHealth({
        available: response.ok,
        lastCheck: new Date(),
        status: response.status,
        responseTime,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
      })
    } catch (error) {
      const responseTime = Date.now() - startTime

      // Don't update state if request was aborted (component unmounted or new request started)
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }

      setHealth({
        available: false,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime
      })
    } finally {
      abortControllerRef.current = null
    }
  }, [service.url, service.healthEndpoint])

  useEffect(() => {
    // Initial health check
    checkHealth()

    // Set up polling interval
    if (interval > 0) {
      intervalRef.current = setInterval(checkHealth, interval)
    }

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [checkHealth, interval])

  return health
}