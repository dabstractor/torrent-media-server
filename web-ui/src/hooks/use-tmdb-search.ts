import { useState, useCallback, useMemo, useEffect } from 'react'
import useSWR from 'swr'
import type { TMDBMovie, MediaSearchResponse, MediaSearchRequest } from '@/lib/types/media'

// Debounce utility function (reused from use-search.ts pattern)
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

interface UseTMDBSearchParams {
  query: string
  page?: number
  year?: number
}

interface UseTMDBSearchReturn {
  movies: TMDBMovie[]
  total: number
  totalPages: number
  currentPage: number
  isLoading: boolean
  error: string | null
  searchMovies: (params: UseTMDBSearchParams) => void
  refetch: () => void
  clearResults: () => void
}

const DEFAULT_SEARCH_PARAMS: UseTMDBSearchParams = {
  query: '',
  page: 1
}

export function useTMDBSearch(): UseTMDBSearchReturn {
  const [searchParams, setSearchParams] = useState<UseTMDBSearchParams>(DEFAULT_SEARCH_PARAMS)

  // Debounce search parameters to avoid excessive API calls
  const debouncedParams = useDebounce(searchParams, 500)

  // Generate consistent cache key for SWR deduplication
  const searchKey = useMemo(() => {
    // Don't search if query too short
    if (!debouncedParams.query || debouncedParams.query.length < 2) {
      return null
    }

    return ['tmdb-search', debouncedParams.query, JSON.stringify({
      page: debouncedParams.page,
      year: debouncedParams.year
    })]
  }, [debouncedParams])

  // SWR configuration following existing patterns
  const { data, error, mutate, isLoading } = useSWR<MediaSearchResponse<TMDBMovie>>(
    searchKey,
    async () => {
      const url = new URL('/api/tmdb/search', window.location.origin)
      url.searchParams.set('query', debouncedParams.query)
      if (debouncedParams.page && debouncedParams.page > 1) {
        url.searchParams.set('page', debouncedParams.page.toString())
      }
      if (debouncedParams.year) {
        url.searchParams.set('year', debouncedParams.year.toString())
      }

      const response = await fetch(url.toString())
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'TMDB search failed')
      }
      return response.json()
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 2000, // 2 second deduplication
      errorRetryInterval: 5000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      onError: (error) => {
        console.error('TMDB search error:', error)
      }
    }
  )

  const searchMovies = useCallback((params: UseTMDBSearchParams) => {
    setSearchParams(params)
  }, [])

  const refetch = useCallback(() => {
    mutate()
  }, [mutate])

  const clearResults = useCallback(() => {
    setSearchParams(DEFAULT_SEARCH_PARAMS)
    mutate(undefined, false) // Clear cache without revalidation
  }, [mutate])

  return {
    movies: data?.results || [],
    total: data?.total_results || 0,
    totalPages: data?.total_pages || 0,
    currentPage: data?.page || 1,
    isLoading,
    error: error?.message || null,
    searchMovies,
    refetch,
    clearResults
  }
}