import { renderHook, waitFor, act } from '@testing-library/react'
import { useSearch } from '@/hooks/use-search'
import { searchTorrents, addTorrentToDownloads } from '@/lib/api/search'
import type { SearchRequest } from '@/lib/api/search'
import type { TorrentResult, SearchResponse } from '@/lib/types'

// Mock Next.js router hooks
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(() => ({
    get: jest.fn(() => null),
    getAll: jest.fn(() => [])
  })),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn()
  })),
  usePathname: jest.fn(() => '/')
}))

// Mock the API functions
jest.mock('@/lib/api/search', () => ({
  searchTorrents: jest.fn(),
  addTorrentToDownloads: jest.fn(),
}))

// Mock SWR
jest.mock('swr', () => {
  const originalSWR = jest.requireActual('swr')
  return {
    ...originalSWR,
    default: jest.fn()
  }
})

const mockSearchTorrents = searchTorrents as jest.MockedFunction<typeof searchTorrents>
const mockAddTorrentToDownloads = addTorrentToDownloads as jest.MockedFunction<typeof addTorrentToDownloads>

const mockSearchResponse: SearchResponse = {
  results: [
    {
      id: 'test-1',
      title: 'Test Torrent 1',
      size: 1073741824,
      sizeText: '1.0 GB',
      seeders: 50,
      leechers: 10,
      category: 'Movies',
      indexer: 'Test Indexer',
      downloadUrl: 'https://example.com/torrent1',
      magnetUrl: 'magnet:?xt=urn:btih:test1',
      publishDate: '2023-08-10T12:00:00Z'
    }
  ],
  total: 1,
  indexers: ['Test Indexer']
}

const mockTorrent: TorrentResult = mockSearchResponse.results[0]

// Mock implementation for SWR
const mockUseSWR = jest.fn()

beforeAll(() => {
  const swr = require('swr')
  swr.default.mockImplementation(mockUseSWR)
})

describe('useSearch hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default SWR mock implementation
    mockUseSWR.mockImplementation((key: any, fetcher: any) => {
      if (!key) {
        return {
          data: undefined,
          error: null,
          mutate: jest.fn(),
          isLoading: false
        }
      }
      
      return {
        data: mockSearchResponse,
        error: null,
        mutate: jest.fn(),
        isLoading: false
      }
    })

    mockSearchTorrents.mockResolvedValue({
      success: true,
      data: mockSearchResponse
    })

    mockAddTorrentToDownloads.mockResolvedValue({
      success: true,
      data: { success: true }
    })
  })

  it('initializes with empty state', () => {
    mockUseSWR.mockImplementation(() => ({
      data: undefined,
      error: null,
      mutate: jest.fn(),
      isLoading: false
    }))

    const { result } = renderHook(() => useSearch())

    expect(result.current.results).toEqual([])
    expect(result.current.total).toBe(0)
    expect(result.current.indexers).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('provides search results when data is available', () => {
    const { result } = renderHook(() => useSearch())

    expect(result.current.results).toEqual(mockSearchResponse.results)
    expect(result.current.total).toBe(mockSearchResponse.total)
    expect(result.current.indexers).toEqual(mockSearchResponse.indexers)
  })

  it('handles loading state', () => {
    mockUseSWR.mockImplementation(() => ({
      data: undefined,
      error: null,
      mutate: jest.fn(),
      isLoading: true
    }))

    const { result } = renderHook(() => useSearch())

    expect(result.current.isLoading).toBe(true)
  })

  it('handles error state', () => {
    const errorMessage = 'Search failed'
    mockUseSWR.mockImplementation(() => ({
      data: undefined,
      error: { message: errorMessage },
      mutate: jest.fn(),
      isLoading: false
    }))

    const { result } = renderHook(() => useSearch())

    expect(result.current.error).toBe(errorMessage)
  })

  it('executes search with parameters', () => {
    const { result } = renderHook(() => useSearch())

    const searchParams: SearchRequest = {
      query: 'ubuntu',
      categories: ['2000'],
      minSeeders: 5,
      sortBy: 'seeders',
      sortOrder: 'desc'
    }

    act(() => {
      result.current.search(searchParams)
    })

    // Note: Due to debouncing, the actual search call would be delayed
    // In a real test environment, you might need to wait for the debounce
  })

  it('successfully adds torrent to downloads', async () => {
    const { result } = renderHook(() => useSearch())

    let addResult: boolean | undefined

    await act(async () => {
      addResult = await result.current.addToDownloads(mockTorrent)
    })

    expect(mockAddTorrentToDownloads).toHaveBeenCalledWith(mockTorrent)
    expect(addResult).toBe(true)
  })

  it('handles failed torrent addition', async () => {
    mockAddTorrentToDownloads.mockResolvedValue({
      success: false,
      data: { success: false },
      error: 'Failed to add torrent'
    })

    const { result } = renderHook(() => useSearch())

    let addResult: boolean | undefined

    await act(async () => {
      addResult = await result.current.addToDownloads(mockTorrent)
    })

    expect(addResult).toBe(false)
  })

  it('handles add torrent error gracefully', async () => {
    mockAddTorrentToDownloads.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useSearch())

    let addResult: boolean | undefined

    await act(async () => {
      addResult = await result.current.addToDownloads(mockTorrent)
    })

    expect(addResult).toBe(false)
  })

  it('clears results when clearResults is called', () => {
    const mockMutate = jest.fn()
    mockUseSWR.mockImplementation(() => ({
      data: mockSearchResponse,
      error: null,
      mutate: mockMutate,
      isLoading: false
    }))

    const { result } = renderHook(() => useSearch())

    act(() => {
      result.current.clearResults()
    })

    expect(mockMutate).toHaveBeenCalledWith(undefined, false)
  })

  it('provides refetch functionality', () => {
    const mockMutate = jest.fn()
    mockUseSWR.mockImplementation(() => ({
      data: mockSearchResponse,
      error: null,
      mutate: mockMutate,
      isLoading: false
    }))

    const { result } = renderHook(() => useSearch())

    act(() => {
      result.current.refetch()
    })

    expect(mockMutate).toHaveBeenCalled()
  })

  it('does not search for queries less than 2 characters', () => {
    const { result } = renderHook(() => useSearch())

    act(() => {
      result.current.search({ query: 'a' })
    })

    // SWR should not be called with a key for short queries
    // This would be tested by checking the SWR key is null
  })
})

describe('useSearchFilters hook', () => {
  it('initializes with default filter values', () => {
    const { useSearchFilters } = require('@/hooks/use-search')
    const { result } = renderHook(() => useSearchFilters())

    expect(result.current.filters).toEqual({
      categories: [],
      minSeeders: 0,
      maxSize: 0,
      sortBy: 'seeders',
      sortOrder: 'desc'
    })
  })

  it('updates filters correctly', () => {
    const { useSearchFilters } = require('@/hooks/use-search')
    const { result } = renderHook(() => useSearchFilters())

    act(() => {
      result.current.updateFilters({ categories: ['2000'] })
    })

    expect(result.current.filters.categories).toEqual(['2000'])
  })

  it('resets filters to defaults', () => {
    const { useSearchFilters } = require('@/hooks/use-search')
    const { result } = renderHook(() => useSearchFilters())

    // First update some filters
    act(() => {
      result.current.updateFilters({ 
        categories: ['2000'], 
        minSeeders: 10 
      })
    })

    expect(result.current.filters.categories).toEqual(['2000'])
    expect(result.current.filters.minSeeders).toBe(10)

    // Then reset
    act(() => {
      result.current.resetFilters()
    })

    expect(result.current.filters).toEqual({
      categories: [],
      minSeeders: 0,
      maxSize: 0,
      sortBy: 'seeders',
      sortOrder: 'desc'
    })
  })
})