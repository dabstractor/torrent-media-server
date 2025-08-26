import { useState, useEffect, useRef } from 'react'
import type { DownloadsResponse } from '@/types'

export function useRealtimeDownloads() {
  const [data, setData] = useState<DownloadsResponse | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    // Create EventSource for Server-Sent Events
    const eventSource = new EventSource('/api/downloads/stream')
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setIsConnected(true)
      console.log('Real-time connection established')
    }

    eventSource.onmessage = (event) => {
      try {
        const newData = JSON.parse(event.data)
        setData(newData)
      } catch (error) {
        console.error('Failed to parse real-time data:', error)
      }
    }

    eventSource.onerror = (error) => {
      setIsConnected(false)
      console.error('Real-time connection error:', error)
    }

    // Cleanup on unmount
    return () => {
      eventSource.close()
      eventSourceRef.current = null
    }
  }, [])

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
      setIsConnected(false)
    }
  }

  return {
    data,
    isConnected,
    disconnect
  }
}

// Hook for real-time search suggestions (if needed)
export function useRealtimeSearch(query: string, debounceMs = 300) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([])
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`)
        const data = await response.json()
        setSuggestions(data.suggestions || [])
      } catch (error) {
        console.error('Failed to fetch suggestions:', error)
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }, debounceMs)

    return () => clearTimeout(timeoutId)
  }, [query, debounceMs])

  return {
    suggestions,
    isLoading
  }
}