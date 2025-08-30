import useSWR from 'swr'
import { useCallback, useEffect, useRef } from 'react'
import { getTorrents, controlTorrent } from '@/lib/api/torrents'
import type { DownloadsResponse } from '@/lib/types';

const TORRENTS_KEY = '/api/downloads'
const REFRESH_INTERVAL = 5000 // 5 seconds - fallback polling
const SSE_ENDPOINT = '/api/downloads/stream'

export function useTorrents() {
  const { data, error, mutate, isLoading } = useSWR<DownloadsResponse>(
    TORRENTS_KEY,
    getTorrents,
    {
      refreshInterval: REFRESH_INTERVAL,
      revalidateOnFocus: true,
      errorRetryInterval: 10000,
    }
  )

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastUpdateRef = useRef<number>(0)

  // Real-time SSE updates
  useEffect(() => {
    let isMounted = true

    const connectToSSE = () => {
      // Clean up existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      // Clear reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }

      try {
        const eventSource = new EventSource(SSE_ENDPOINT)
        eventSourceRef.current = eventSource

        eventSource.onopen = () => {
          // Downloads SSE connected
        }

        eventSource.onmessage = (event) => {
          if (!isMounted) return

          try {
            const message = JSON.parse(event.data)
            const now = Date.now()

            // Debounce updates - only process if 500ms have passed since last update
            if (now - lastUpdateRef.current < 500) {
              return
            }

            switch (message.type) {
              case 'connected':
                // SSE stream established
                break
                
              case 'update':
                if (message.data) {
                  // Update SWR cache with real-time data
                  mutate(message.data, false) // false = don't revalidate
                  lastUpdateRef.current = now
                }
                break
                
              case 'error':
                console.warn('SSE error message:', message.message)
                break
                
              default:
                // Unknown SSE message type
            }
          } catch (parseError) {
            console.error('Failed to parse SSE message:', parseError)
          }
        }

        eventSource.onerror = (error) => {
          console.error('SSE connection error:', error)
          
          if (!isMounted) return

          // Close the connection
          eventSource.close()
          
          // Attempt to reconnect after 5 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMounted) {
              // Attempting to reconnect to SSE
              connectToSSE()
            }
          }, 5000)
        }

      } catch (error) {
        console.error('Failed to create SSE connection:', error)
        
        // Fall back to polling only
        if (isMounted) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMounted) {
              connectToSSE()
            }
          }, 10000) // Retry after 10 seconds
        }
      }
    }

    // Only connect if browser supports EventSource
    if (typeof EventSource !== 'undefined') {
      // Small delay to allow component to mount
      const connectTimeout = setTimeout(connectToSSE, 100)
      
      return () => {
        clearTimeout(connectTimeout)
      }
    }

    return () => {
      isMounted = false
    }
  }, [mutate])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [])

  const pauseTorrent = useCallback(async (hash: string) => {
    const success = await controlTorrent(hash, 'pause')
    if (success) {
      mutate() // Revalidate data
    }
    return success
  }, [mutate])

  const resumeTorrent = useCallback(async (hash: string) => {
    const success = await controlTorrent(hash, 'resume')
    if (success) {
      mutate()
    }
    return success
  }, [mutate])

  const deleteTorrent = useCallback(async (hash: string) => {
    const success = await controlTorrent(hash, 'delete')
    if (success) {
      mutate()
    }
    return success
  }, [mutate])

  return {
    torrents: data?.downloads || [],
    stats: data?.stats,
    isLoading,
    error,
    refresh: mutate,
    pauseTorrent,
    resumeTorrent,
    deleteTorrent,
  }
}