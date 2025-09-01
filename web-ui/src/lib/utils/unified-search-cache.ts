import type { SearchResponse } from '@/lib/types'
import type { SearchRequest } from '@/lib/api/search'
import { SearchCacheManager } from './search-cache'

interface CachedResponse {
  data: SearchResponse
  timestamp: number
  ttl: number
  key: string
}

interface CacheConfig {
  memory: {
    maxSize: number        // 20 items for fast access
    ttl: number           // 10 minutes
  }
  session: {
    maxSize: number        // 50 items for current session
    ttl: number           // 30 minutes  
  }
  persistent: {
    maxSize: number        // 100 items across sessions
    ttl: number           // 24 hours
  }
}

interface CacheStats {
  memory: {
    size: number
    hitCount: number
    missCount: number
  }
  session: {
    size: number
    hitCount: number
    missCount: number
  }
  persistent: {
    size: number
    hitCount: number
    missCount: number
  }
}

/**
 * Multi-tier caching system for search results
 * Provides <10ms response times for repeat searches within session
 * Cache hierarchy: Memory (fastest) → Session Storage → Persistent (localStorage)
 */
export class UnifiedSearchCache {
  private memoryCache = new Map<string, CachedResponse>()
  private sessionKey = 'search-session-cache-v1'
  private statsKey = 'unified-cache-stats-v1'
  private persistentCache: SearchCacheManager
  
  private config: CacheConfig = {
    memory: {
      maxSize: 20,
      ttl: 10 * 60 * 1000 // 10 minutes
    },
    session: {
      maxSize: 50,
      ttl: 30 * 60 * 1000 // 30 minutes
    },
    persistent: {
      maxSize: 100,
      ttl: 24 * 60 * 60 * 1000 // 24 hours
    }
  }

  constructor() {
    this.persistentCache = new SearchCacheManager()
  }

  /**
   * Generate consistent cache key from search parameters
   */
  private generateCacheKey(params: SearchRequest): string {
    const keyObject = {
      query: params.query.toLowerCase().trim(),
      categories: (params.categories || []).sort(),
      minSeeders: params.minSeeders || 0,
      maxSize: params.maxSize || 0,
      sortBy: params.sortBy || 'seeders',
      sortOrder: params.sortOrder || 'desc',
      // Don't include offset/limit in cache key to allow for pagination caching
    }
    
    return btoa(JSON.stringify(keyObject)).replace(/[+/=]/g, '_')
  }

  /**
   * Check if cached item has expired
   */
  private isExpired(cachedItem: CachedResponse): boolean {
    return Date.now() - cachedItem.timestamp > cachedItem.ttl
  }

  /**
   * Get cached data with multi-tier lookup
   * Returns null if not found or expired in all tiers
   */
  async get(params: SearchRequest): Promise<SearchResponse | null> {
    const key = this.generateCacheKey(params)
    
    // Check memory first (fastest: <10ms)
    const memoryResult = this.memoryCache.get(key)
    if (memoryResult && !this.isExpired(memoryResult)) {
      this.incrementStats('memory', 'hit')
      return memoryResult.data
    }
    this.incrementStats('memory', 'miss')

    // Check session storage (fast: 20-50ms) 
    const sessionResult = this.getFromSessionStorage(key)
    if (sessionResult && !this.isExpired(sessionResult)) {
      // Promote to memory cache for faster future access
      this.memoryCache.set(key, sessionResult)
      this.cleanupMemoryCache()
      this.incrementStats('session', 'hit')
      return sessionResult.data
    }
    this.incrementStats('session', 'miss')

    // Check persistent storage (slower: 50-100ms)
    const persistentResult = this.persistentCache.get(params)
    if (persistentResult) {
      const cachedItem: CachedResponse = {
        data: persistentResult,
        timestamp: Date.now(),
        ttl: this.config.persistent.ttl,
        key
      }
      
      // Promote to higher tiers for faster future access
      this.setInSessionStorage(key, cachedItem)
      this.memoryCache.set(key, cachedItem)
      this.cleanupMemoryCache()
      this.incrementStats('persistent', 'hit')
      return persistentResult
    }
    this.incrementStats('persistent', 'miss')

    return null
  }

  /**
   * Store search results in all cache tiers
   */
  async set(params: SearchRequest, data: SearchResponse): Promise<void> {
    const key = this.generateCacheKey(params)
    const now = Date.now()
    
    // Create cached items for different tiers
    const memoryCachedItem: CachedResponse = {
      data,
      timestamp: now,
      ttl: this.config.memory.ttl,
      key
    }
    
    const sessionCachedItem: CachedResponse = {
      data,
      timestamp: now,
      ttl: this.config.session.ttl,
      key
    }

    // Store in memory cache
    this.memoryCache.set(key, memoryCachedItem)
    this.cleanupMemoryCache()

    // Store in session storage
    this.setInSessionStorage(key, sessionCachedItem)
    this.cleanupSessionStorage()

    // Store in persistent storage (handles its own cleanup)
    this.persistentCache.set(params, data, this.config.persistent.ttl)
  }

  /**
   * Clear all cache tiers
   */
  clear(): void {
    this.memoryCache.clear()
    this.clearSessionStorage()
    this.persistentCache.clear()
    this.resetStats()
  }

  /**
   * Get cache statistics for all tiers
   */
  getStats(): CacheStats {
    if (typeof window === 'undefined') {
      return {
        memory: { size: 0, hitCount: 0, missCount: 0 },
        session: { size: 0, hitCount: 0, missCount: 0 },
        persistent: { size: 0, hitCount: 0, missCount: 0 }
      }
    }

    try {
      const stats = localStorage.getItem(this.statsKey)
      const persistentStats = this.persistentCache.getStats()
      
      const defaultStats: CacheStats = {
        memory: { size: this.memoryCache.size, hitCount: 0, missCount: 0 },
        session: { size: this.getSessionStorageSize(), hitCount: 0, missCount: 0 },
        persistent: { 
          size: persistentStats.size, 
          hitCount: persistentStats.hitCount, 
          missCount: persistentStats.missCount 
        }
      }

      if (stats) {
        const parsedStats = JSON.parse(stats) as CacheStats
        parsedStats.memory.size = this.memoryCache.size
        parsedStats.session.size = this.getSessionStorageSize()
        parsedStats.persistent = {
          size: persistentStats.size,
          hitCount: persistentStats.hitCount,
          missCount: persistentStats.missCount
        }
        return parsedStats
      }

      return defaultStats
    } catch (error) {
      console.error('Error reading unified cache stats:', error)
      return {
        memory: { size: this.memoryCache.size, hitCount: 0, missCount: 0 },
        session: { size: 0, hitCount: 0, missCount: 0 },
        persistent: { size: 0, hitCount: 0, missCount: 0 }
      }
    }
  }

  /**
   * Get item from session storage
   */
  private getFromSessionStorage(key: string): CachedResponse | null {
    if (typeof window === 'undefined') return null

    try {
      const cached = sessionStorage.getItem(`${this.sessionKey}_${key}`)
      if (cached) {
        return JSON.parse(cached) as CachedResponse
      }
    } catch (error) {
      console.error('Error reading from session storage cache:', error)
    }
    return null
  }

  /**
   * Set item in session storage
   */
  private setInSessionStorage(key: string, cachedItem: CachedResponse): void {
    if (typeof window === 'undefined') return

    try {
      sessionStorage.setItem(
        `${this.sessionKey}_${key}`,
        JSON.stringify(cachedItem)
      )
    } catch (error) {
      console.error('Error storing in session storage cache:', error)
      // If storage is full, cleanup and retry
      this.cleanupSessionStorage()
      try {
        sessionStorage.setItem(
          `${this.sessionKey}_${key}`,
          JSON.stringify(cachedItem)
        )
      } catch (retryError) {
        console.error('Failed to cache in session storage after cleanup:', retryError)
      }
    }
  }

  /**
   * Clean up memory cache when it exceeds size limit
   */
  private cleanupMemoryCache(): void {
    if (this.memoryCache.size <= this.config.memory.maxSize) return

    // Remove oldest entries first
    const entries = Array.from(this.memoryCache.entries())
    entries.sort(([, a], [, b]) => a.timestamp - b.timestamp)
    
    const toRemove = entries.slice(0, this.memoryCache.size - this.config.memory.maxSize)
    toRemove.forEach(([key]) => {
      this.memoryCache.delete(key)
    })
  }

  /**
   * Clean up session storage cache
   */
  private cleanupSessionStorage(): void {
    if (typeof window === 'undefined') return

    try {
      const keys = Object.keys(sessionStorage)
      const cacheKeys = keys.filter(key => key.startsWith(this.sessionKey))
      const now = Date.now()
      const validItems: Array<{key: string, item: CachedResponse}> = []

      // Collect valid items and remove expired ones
      cacheKeys.forEach(storageKey => {
        try {
          const cached = sessionStorage.getItem(storageKey)
          if (!cached) return

          const cachedItem: CachedResponse = JSON.parse(cached)
          
          if (now - cachedItem.timestamp > cachedItem.ttl) {
            sessionStorage.removeItem(storageKey)
          } else {
            validItems.push({ key: storageKey, item: cachedItem })
          }
        } catch {
          // Remove invalid cache items
          sessionStorage.removeItem(storageKey)
        }
      })

      // If still too many items, remove oldest ones
      if (validItems.length > this.config.session.maxSize) {
        validItems.sort((a, b) => a.item.timestamp - b.item.timestamp)
        const toRemove = validItems.slice(0, validItems.length - this.config.session.maxSize)
        toRemove.forEach(({ key }) => {
          sessionStorage.removeItem(key)
        })
      }
    } catch (error) {
      console.error('Error during session storage cleanup:', error)
    }
  }

  /**
   * Clear all session storage cache items
   */
  private clearSessionStorage(): void {
    if (typeof window === 'undefined') return

    try {
      const keys = Object.keys(sessionStorage)
      const cacheKeys = keys.filter(key => key.startsWith(this.sessionKey))
      cacheKeys.forEach(key => {
        sessionStorage.removeItem(key)
      })
    } catch (error) {
      console.error('Error clearing session storage cache:', error)
    }
  }

  /**
   * Get current session storage cache size
   */
  private getSessionStorageSize(): number {
    if (typeof window === 'undefined') return 0

    try {
      const keys = Object.keys(sessionStorage)
      return keys.filter(key => key.startsWith(this.sessionKey)).length
    } catch {
      return 0
    }
  }

  /**
   * Increment cache statistics
   */
  private incrementStats(tier: keyof CacheStats, type: 'hit' | 'miss'): void {
    if (typeof window === 'undefined') return

    try {
      const stats = this.getStats()
      stats[tier][`${type}Count`]++
      localStorage.setItem(this.statsKey, JSON.stringify(stats))
    } catch (error) {
      console.error(`Error updating ${tier} ${type} count:`, error)
    }
  }

  /**
   * Reset all cache statistics
   */
  private resetStats(): void {
    if (typeof window === 'undefined') return

    const stats: CacheStats = {
      memory: { size: 0, hitCount: 0, missCount: 0 },
      session: { size: 0, hitCount: 0, missCount: 0 },
      persistent: { size: 0, hitCount: 0, missCount: 0 }
    }

    try {
      localStorage.setItem(this.statsKey, JSON.stringify(stats))
    } catch (error) {
      console.error('Error resetting unified cache stats:', error)
    }
  }
}

// Export singleton instance
export const unifiedSearchCache = new UnifiedSearchCache()

// Utility functions for common cache operations
export const getCachedSearchResults = async (
  searchParams: SearchRequest
): Promise<SearchResponse | null> => {
  return unifiedSearchCache.get(searchParams)
}

export const cacheSearchResults = async (
  searchParams: SearchRequest, 
  results: SearchResponse
): Promise<void> => {
  return unifiedSearchCache.set(searchParams, results)
}

export const clearUnifiedCache = (): void => {
  unifiedSearchCache.clear()
}

export const getUnifiedCacheStats = (): CacheStats => {
  return unifiedSearchCache.getStats()
}