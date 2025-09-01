'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import type { SearchRequest } from '@/lib/api/search'

interface UseSearchURLReturn {
  searchState: SearchRequest
  updateURL: (newParams: Partial<SearchRequest>) => void
  isInitialized: boolean
}


/**
 * Hook for URL parameter synchronization with Next.js 14 App Router
 * CRITICAL: Component using this hook MUST be wrapped in Suspense boundary
 */
// Calculate offset from page number
function calculateOffset(pageStr: string | null, limitStr: string | null): number {
  const page = parseInt(pageStr || '1') || 1
  const limit = parseInt(limitStr || '50') || 50
  return Math.max(0, (page - 1) * limit)
}

// Calculate page number from offset
function calculatePage(offset: number, limit: number): number {
  return Math.floor(offset / limit) + 1
}

export function useSearchURL(): UseSearchURLReturn {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const [isInitialized, setIsInitialized] = useState(false)

  // Parse URL parameters to SearchRequest format
  const searchState = useMemo((): SearchRequest => {
    const params = {
      query: searchParams.get('q') || '',
      categories: searchParams.get('cat')?.split(',').filter(Boolean) || [],
      minSeeders: parseInt(searchParams.get('seeds') || '0') || undefined,
      maxSize: parseInt(searchParams.get('size') || '0') || undefined,
      sortBy: (searchParams.get('sort') as 'seeders' | 'size' | 'date' | 'relevance') || 'seeders',
      sortOrder: (searchParams.get('order') as 'asc' | 'desc') || 'desc',
      offset: calculateOffset(searchParams.get('page'), searchParams.get('limit')),
      limit: parseInt(searchParams.get('limit') || '50') || 50
    }

    // Clean up undefined values
    Object.keys(params).forEach(key => {
      if (params[key as keyof SearchRequest] === undefined) {
        delete params[key as keyof SearchRequest]
      }
    })

    return params
  }, [searchParams])

  // Update URL with debounced parameter changes
  const updateURL = useCallback((newParams: Partial<SearchRequest>) => {
    const updatedParams = { ...searchState, ...newParams }
    const urlParams = new URLSearchParams()
    
    // Apply parameter updates with validation
    if (updatedParams.query && updatedParams.query.trim()) {
      urlParams.set('q', updatedParams.query.trim())
    }
    
    if (updatedParams.categories && updatedParams.categories.length > 0) {
      urlParams.set('cat', updatedParams.categories.join(','))
    }
    
    if (updatedParams.minSeeders && updatedParams.minSeeders > 0) {
      urlParams.set('seeds', updatedParams.minSeeders.toString())
    }
    
    if (updatedParams.maxSize && updatedParams.maxSize > 0) {
      urlParams.set('size', updatedParams.maxSize.toString())
    }
    
    if (updatedParams.sortBy && updatedParams.sortBy !== 'seeders') {
      urlParams.set('sort', updatedParams.sortBy)
    }
    
    if (updatedParams.sortOrder && updatedParams.sortOrder !== 'desc') {
      urlParams.set('order', updatedParams.sortOrder)
    }
    
    if (updatedParams.limit && updatedParams.limit !== 50) {
      urlParams.set('limit', updatedParams.limit.toString())
    }
    
    if (updatedParams.offset && updatedParams.offset > 0) {
      const page = calculatePage(updatedParams.offset, updatedParams.limit || 50)
      if (page > 1) {
        urlParams.set('page', page.toString())
      }
    }

    // CRITICAL: Use replace for non-query changes to prevent history pollution
    // Use push for new searches to enable proper browser history
    const shouldPush = newParams.query !== undefined && newParams.query !== searchState.query
    const method = shouldPush ? router.push : router.replace
    
    const newUrl = urlParams.toString() 
      ? `${pathname}?${urlParams.toString()}`
      : pathname
      
    method(newUrl, { scroll: false })
  }, [searchState, router, pathname])

  // Initialize state on mount
  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true)
    }
  }, [isInitialized])

  return {
    searchState,
    updateURL,
    isInitialized
  }
}

/**
 * Utility function to parse search parameters from URL
 * Used for server-side rendering and static generation
 */
export function parseSearchParams(searchParams: URLSearchParams): SearchRequest {
  return {
    query: searchParams.get('q') || '',
    categories: searchParams.get('cat')?.split(',').filter(Boolean) || [],
    minSeeders: parseInt(searchParams.get('seeds') || '0') || undefined,
    maxSize: parseInt(searchParams.get('size') || '0') || undefined,
    sortBy: (searchParams.get('sort') as 'seeders' | 'size' | 'date' | 'relevance') || 'seeders',
    sortOrder: (searchParams.get('order') as 'asc' | 'desc') || 'desc',
    offset: Math.max(0, ((parseInt(searchParams.get('page') || '1') || 1) - 1) * (parseInt(searchParams.get('limit') || '50') || 50)),
    limit: parseInt(searchParams.get('limit') || '50') || 50
  }
}

/**
 * Utility function to generate URL from search parameters
 * Used for creating shareable search URLs
 */
export function generateSearchURL(params: Partial<SearchRequest>, basePath = '/'): string {
  const urlParams = new URLSearchParams()
  
  if (params.query?.trim()) {
    urlParams.set('q', params.query.trim())
  }
  
  if (params.categories?.length) {
    urlParams.set('cat', params.categories.join(','))
  }
  
  if (params.minSeeders && params.minSeeders > 0) {
    urlParams.set('seeds', params.minSeeders.toString())
  }
  
  if (params.maxSize && params.maxSize > 0) {
    urlParams.set('size', params.maxSize.toString())
  }
  
  if (params.sortBy && params.sortBy !== 'seeders') {
    urlParams.set('sort', params.sortBy)
  }
  
  if (params.sortOrder && params.sortOrder !== 'desc') {
    urlParams.set('order', params.sortOrder)
  }
  
  if (params.limit && params.limit !== 50) {
    urlParams.set('limit', params.limit.toString())
  }
  
  if (params.offset && params.offset > 0) {
    const page = Math.floor(params.offset / (params.limit || 50)) + 1
    if (page > 1) {
      urlParams.set('page', page.toString())
    }
  }
  
  const queryString = urlParams.toString()
  return queryString ? `${basePath}?${queryString}` : basePath
}