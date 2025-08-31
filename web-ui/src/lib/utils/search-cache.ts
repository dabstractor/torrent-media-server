import type { SearchResponse } from '@/lib/types'
import type { SearchRequest } from '@/lib/api/search'

interface CachedItem<T> {
  data: T
  timestamp: number
  ttl: number
  key: string
}

interface CacheMetadata {
  size: number
  lastCleanup: number
  hitCount: number
  missCount: number
}

export class SearchCacheManager {
  private readonly storageKey = 'search-cache-v1'
  private readonly metadataKey = 'search-cache-metadata-v1'
  private readonly defaultTtl = 5 * 60 * 1000 // 5 minutes
  private readonly maxCacheSize = 50 // Maximum number of cached items
  private readonly cleanupInterval = 15 * 60 * 1000 // 15 minutes

  /**
   * Generate a consistent cache key from search parameters
   */
  private generateCacheKey(searchParams: SearchRequest): string {
    const keyObject = {
      query: searchParams.query.toLowerCase().trim(),
      categories: (searchParams.categories || []).sort(),
      minSeeders: searchParams.minSeeders || 0,
      maxSize: searchParams.maxSize || 0,
      sortBy: searchParams.sortBy || 'seeders',
      sortOrder: searchParams.sortOrder || 'desc',
      // Don't include offset/limit in cache key to allow for pagination caching
    }
    
    return btoa(JSON.stringify(keyObject)).replace(/[+/=]/g, '_')
  }

  /**
   * Get cached data if it exists and hasn't expired
   */
  get(searchParams: SearchRequest): SearchResponse | null {
    if (typeof window === 'undefined') return null

    try {
      const cacheKey = this.generateCacheKey(searchParams)
      const cached = localStorage.getItem(`${this.storageKey}_${cacheKey}`)
      
      if (!cached) {
        this.incrementMissCount()
        return null
      }

      const cachedItem: CachedItem<SearchResponse> = JSON.parse(cached)
      const now = Date.now()
      
      // Check if item has expired
      if (now - cachedItem.timestamp > cachedItem.ttl) {
        this.remove(searchParams)
        this.incrementMissCount()
        return null
      }
      
      this.incrementHitCount()
      return cachedItem.data
    } catch (error) {
      console.error('Error reading from search cache:', error)
      this.incrementMissCount()
      return null
    }
  }

  /**
   * Store search results in cache with TTL
   */
  set(searchParams: SearchRequest, data: SearchResponse, ttl?: number): void {
    if (typeof window === 'undefined') return

    try {
      const cacheKey = this.generateCacheKey(searchParams)
      const cachedItem: CachedItem<SearchResponse> = {
        data,
        timestamp: Date.now(),
        ttl: ttl || this.defaultTtl,
        key: cacheKey
      }

      // Check cache size and cleanup if needed
      this.cleanupIfNeeded()

      localStorage.setItem(
        `${this.storageKey}_${cacheKey}`,
        JSON.stringify(cachedItem)
      )

      this.updateMetadata()
    } catch (error) {
      console.error('Error storing search cache:', error)
      // If storage is full, try clearing expired items and retry once
      this.cleanup()
      try {
        const cacheKey = this.generateCacheKey(searchParams)
        const cachedItem: CachedItem<SearchResponse> = {
          data,
          timestamp: Date.now(),
          ttl: ttl || this.defaultTtl,
          key: cacheKey
        }
        localStorage.setItem(
          `${this.storageKey}_${cacheKey}`,
          JSON.stringify(cachedItem)
        )
      } catch (retryError) {
        console.error('Failed to cache search results after cleanup:', retryError)
      }
    }
  }

  /**
   * Remove specific cached item
   */
  remove(searchParams: SearchRequest): void {
    if (typeof window === 'undefined') return

    try {
      const cacheKey = this.generateCacheKey(searchParams)
      localStorage.removeItem(`${this.storageKey}_${cacheKey}`)
      this.updateMetadata()
    } catch (error) {
      console.error('Error removing from search cache:', error)
    }
  }

  /**
   * Clear all cached search results
   */
  clear(): void {
    if (typeof window === 'undefined') return

    try {
      const keys = Object.keys(localStorage)
      const cacheKeys = keys.filter(key => key.startsWith(this.storageKey))
      
      cacheKeys.forEach(key => {
        localStorage.removeItem(key)
      })
      
      localStorage.removeItem(this.metadataKey)
      this.resetMetadata()
    } catch (error) {
      console.error('Error clearing search cache:', error)
    }
  }

  /**
   * Remove expired items from cache
   */
  cleanup(): void {
    if (typeof window === 'undefined') return

    try {
      const keys = Object.keys(localStorage)
      const cacheKeys = keys.filter(key => key.startsWith(this.storageKey))
      const now = Date.now()
      let removedCount = 0

      cacheKeys.forEach(key => {
        try {
          const cached = localStorage.getItem(key)
          if (!cached) return

          const cachedItem: CachedItem<SearchResponse> = JSON.parse(cached)
          
          if (now - cachedItem.timestamp > cachedItem.ttl) {
            localStorage.removeItem(key)
            removedCount++
          }
        } catch {
          // Remove invalid cache items
          localStorage.removeItem(key)
          removedCount++
        }
      })

      if (removedCount > 0) {
        this.updateMetadata()
      }
    } catch (error) {
      console.error('Error during cache cleanup:', error)
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheMetadata {
    if (typeof window === 'undefined') {
      return { size: 0, lastCleanup: 0, hitCount: 0, missCount: 0 }
    }

    try {
      const metadata = localStorage.getItem(this.metadataKey)
      if (metadata) {
        return JSON.parse(metadata)
      }
    } catch (error) {
      console.error('Error reading cache metadata:', error)
    }

    return { size: 0, lastCleanup: 0, hitCount: 0, missCount: 0 }
  }

  /**
   * Check if cache needs cleanup and perform it
   */
  private cleanupIfNeeded(): void {
    const metadata = this.getStats()
    const now = Date.now()
    
    // Cleanup if it's been more than cleanupInterval since last cleanup
    if (now - metadata.lastCleanup > this.cleanupInterval) {
      this.cleanup()
      return
    }

    // Cleanup if cache size exceeds limit
    if (metadata.size >= this.maxCacheSize) {
      this.cleanup()
    }
  }

  /**
   * Update cache metadata
   */
  private updateMetadata(): void {
    if (typeof window === 'undefined') return

    try {
      const keys = Object.keys(localStorage)
      const cacheKeys = keys.filter(key => key.startsWith(this.storageKey))
      const currentMetadata = this.getStats()
      
      const metadata: CacheMetadata = {
        ...currentMetadata,
        size: cacheKeys.length,
        lastCleanup: Date.now()
      }

      localStorage.setItem(this.metadataKey, JSON.stringify(metadata))
    } catch (error) {
      console.error('Error updating cache metadata:', error)
    }
  }

  private resetMetadata(): void {
    const metadata: CacheMetadata = {
      size: 0,
      lastCleanup: Date.now(),
      hitCount: 0,
      missCount: 0
    }

    try {
      localStorage.setItem(this.metadataKey, JSON.stringify(metadata))
    } catch (error) {
      console.error('Error resetting cache metadata:', error)
    }
  }

  private incrementHitCount(): void {
    const metadata = this.getStats()
    metadata.hitCount++
    
    try {
      localStorage.setItem(this.metadataKey, JSON.stringify(metadata))
    } catch (error) {
      console.error('Error updating hit count:', error)
    }
  }

  private incrementMissCount(): void {
    const metadata = this.getStats()
    metadata.missCount++
    
    try {
      localStorage.setItem(this.metadataKey, JSON.stringify(metadata))
    } catch (error) {
      console.error('Error updating miss count:', error)
    }
  }
}

// Export singleton instance
export const searchCache = new SearchCacheManager()

// Utility functions for common cache operations
export const cacheSearchResults = (
  searchParams: SearchRequest, 
  results: SearchResponse, 
  ttl?: number
): void => {
  searchCache.set(searchParams, results, ttl)
}

export const getCachedSearchResults = (
  searchParams: SearchRequest
): SearchResponse | null => {
  return searchCache.get(searchParams)
}

export const clearSearchCache = (): void => {
  searchCache.clear()
}

export const cleanupSearchCache = (): void => {
  searchCache.cleanup()
}