import { UnifiedSearchCache } from '@/lib/utils/unified-search-cache'
import type { SearchRequest, SearchResponse } from '@/lib/api/search'
import '@testing-library/jest-dom'

// Mock the SearchCacheManager
jest.mock('@/lib/utils/search-cache', () => ({
  SearchCacheManager: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn(),
    getStats: jest.fn().mockReturnValue({ size: 0, hitCount: 0, missCount: 0 })
  }))
}))

// Mock localStorage and sessionStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value.toString() }),
    removeItem: jest.fn((key: string) => { delete store[key] }),
    clear: jest.fn(() => { store = {} }),
    key: jest.fn(),
    length: 0
  }
})()

const sessionStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value.toString() }),
    removeItem: jest.fn((key: string) => { delete store[key] }),
    clear: jest.fn(() => { store = {} }),
    key: jest.fn(),
    length: 0
  }
})()

// Mock Object.keys to return storage keys
Object.keys = jest.fn(() => [])

Object.defineProperty(window, 'localStorage', { value: localStorageMock })
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock })

// Mock console.error for cache error messages
const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

describe('UnifiedSearchCache', () => {
  let cache: UnifiedSearchCache
  
  const mockSearchRequest: SearchRequest = {
    query: 'ubuntu',
    categories: ['2000'],
    minSeeders: 10,
    sortBy: 'seeders',
    sortOrder: 'desc',
    limit: 50,
    offset: 0
  }

  const mockSearchResponse: SearchResponse = {
    results: [
      {
        id: 'test-1',
        title: 'Ubuntu 22.04 LTS',
        size: 3000000000,
        sizeText: '2.8 GB',
        seeders: 150,
        leechers: 25,
        category: 'Software',
        indexer: 'TestIndexer',
        downloadUrl: 'http://example.com/download',
        magnetUrl: 'magnet:?xt=urn:btih:test',
        publishDate: '2023-08-10T12:00:00Z'
      }
    ],
    total: 1,
    indexers: ['TestIndexer']
  }

  beforeEach(() => {
    cache = new UnifiedSearchCache()
    jest.clearAllMocks()
    localStorageMock.clear()
    sessionStorageMock.clear()
    // Reset the Object.keys mock
    ;(Object.keys as jest.Mock).mockReturnValue([])
  })

  afterAll(() => {
    consoleSpy.mockRestore()
  })

  describe('Basic Cache Operations', () => {
    it('stores and retrieves from memory cache', async () => {
      await cache.set(mockSearchRequest, mockSearchResponse)
      
      const result = await cache.get(mockSearchRequest)
      
      expect(result).toEqual(mockSearchResponse)
    })

    it('returns null when cache is empty', async () => {
      const result = await cache.get(mockSearchRequest)
      
      expect(result).toBeNull()
    })

    it('clears all cache tiers', async () => {
      await cache.set(mockSearchRequest, mockSearchResponse)
      
      cache.clear()
      
      const result = await cache.get(mockSearchRequest)
      expect(result).toBeNull()
    })
  })

  describe('Cache Statistics', () => {
    it('returns default stats when empty', () => {
      const stats = cache.getStats()
      
      expect(stats).toHaveProperty('memory')
      expect(stats).toHaveProperty('session')  
      expect(stats).toHaveProperty('persistent')
      expect(stats.memory.size).toBe(0)
      expect(stats.session.size).toBe(0)
      expect(stats.persistent.size).toBe(0)
    })

    it('handles localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('LocalStorage error')
      })

      const stats = cache.getStats()
      
      expect(stats).toBeDefined()
      expect(consoleSpy).toHaveBeenCalledWith('Error reading unified cache stats:', expect.any(Error))
    })
  })

  describe('Session Storage Integration', () => {
    it('handles sessionStorage errors gracefully', async () => {
      sessionStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('SessionStorage error')
      })

      // Should not throw
      await expect(cache.set(mockSearchRequest, mockSearchResponse)).resolves.not.toThrow()
      
      expect(consoleSpy).toHaveBeenCalledWith('Error storing in session storage cache:', expect.any(Error))
    })

    it('handles sessionStorage retrieval errors gracefully', async () => {
      sessionStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('SessionStorage error')
      })

      const result = await cache.get(mockSearchRequest)
      
      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith('Error reading from session storage cache:', expect.any(Error))
    })
  })

  describe('Cache Key Consistency', () => {
    it('generates consistent cache keys for normalized requests', async () => {
      const request1 = { ...mockSearchRequest, query: ' UBUNTU ' }
      const request2 = { ...mockSearchRequest, query: 'ubuntu' }
      
      await cache.set(request1, mockSearchResponse)
      const result = await cache.get(request2)
      
      // Should get the same result due to query normalization
      expect(result).toEqual(mockSearchResponse)
    })

    it('generates consistent cache keys regardless of category order', async () => {
      const request1 = { ...mockSearchRequest, categories: ['2000', '5000'] }
      const request2 = { ...mockSearchRequest, categories: ['5000', '2000'] }
      
      await cache.set(request1, mockSearchResponse)
      const result = await cache.get(request2)
      
      // Should get the same result due to category sorting
      expect(result).toEqual(mockSearchResponse)
    })
  })
})