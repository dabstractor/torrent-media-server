import { useState, useCallback, useMemo, useEffect } from 'react'
import useSWR from 'swr'
import { searchTorrents, addTorrentToDownloads, type SearchRequest } from '@/lib/api/search'
import type { SearchResponse, TorrentResult } from '@/lib/types'

// Debounce utility function
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

interface UseSearchReturn {
  results: TorrentResult[]
  total: number
  indexers: string[]
  isLoading: boolean
  error: string | null
  search: (params: SearchRequest) => void
  refetch: () => void
  addToDownloads: (torrent: TorrentResult) => Promise<boolean>
  clearResults: () => void
}

const DEFAULT_SEARCH_PARAMS: SearchRequest = {
  query: '',
  limit: 50,
  offset: 0
}

export function useSearch(): UseSearchReturn {
  const [searchParams, setSearchParams] = useState<SearchRequest>(DEFAULT_SEARCH_PARAMS)
  
  // Debounce search parameters to avoid excessive API calls
  const debouncedParams = useDebounce(searchParams, 500)
  
  // Generate consistent cache key for SWR deduplication
  const searchKey = useMemo(() => {
    if (!debouncedParams.query || debouncedParams.query.length < 2) {
      return null // Don't search for queries less than 2 characters
    }
    return ['search', debouncedParams.query, JSON.stringify({
      categories: debouncedParams.categories,
      minSeeders: debouncedParams.minSeeders,
      maxSize: debouncedParams.maxSize,
      sortBy: debouncedParams.sortBy,
      sortOrder: debouncedParams.sortOrder,
      offset: debouncedParams.offset,
      limit: debouncedParams.limit
    })]
  }, [debouncedParams])
  
  // SWR configuration following existing patterns
  const { data, error, mutate, isLoading } = useSWR<SearchResponse>(
    searchKey,
    async () => {
      const result = await searchTorrents(debouncedParams)
      if (!result.success) {
        throw new Error(result.error || 'Search failed')
      }
      return result.data
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 2000, // 2 second deduplication
      errorRetryInterval: 5000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      onError: (error) => {
        console.error('Search error:', error)
      }
    }
  )
  
  const search = useCallback((params: SearchRequest) => {
    setSearchParams(prevParams => ({
      ...prevParams,
      ...params
    }))
  }, [])
  
  const refetch = useCallback(() => {
    mutate()
  }, [mutate])
  
  const addToDownloads = useCallback(async (torrent: TorrentResult): Promise<boolean> => {
    try {
      const result = await addTorrentToDownloads(torrent)
      if (result.success) {
        // Optionally trigger a refresh of the downloads list
        // This could be done by calling a global mutate function if available
        return true
      } else {
        console.error('Failed to add torrent:', result.error)
        return false
      }
    } catch (error) {
      console.error('Error adding torrent to downloads:', error)
      return false
    }
  }, [])
  
  const clearResults = useCallback(() => {
    setSearchParams(DEFAULT_SEARCH_PARAMS)
    mutate(undefined, false) // Clear cache without revalidation
  }, [mutate])
  
  return {
    results: data?.results || [],
    total: data?.total || 0,
    indexers: data?.indexers || [],
    isLoading,
    error: error?.message || null,
    search,
    refetch,
    addToDownloads,
    clearResults
  }
}

// Hook for managing search filters separately
export function useSearchFilters() {
  const [filters, setFilters] = useState({
    categories: [] as string[],
    minSeeders: 0,
    maxSize: 0, // 0 means no limit
    sortBy: 'seeders' as const,
    sortOrder: 'desc' as const
  })
  
  const updateFilters = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])
  
  const resetFilters = useCallback(() => {
    setFilters({
      categories: [],
      minSeeders: 0,
      maxSize: 0,
      sortBy: 'seeders',
      sortOrder: 'desc'
    })
  }, [])
  
  return {
    filters,
    updateFilters,
    resetFilters
  }
}