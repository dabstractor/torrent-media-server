import { searchTorrents, addTorrentToDownloads } from '@/lib/api/search'
import type { SearchRequest } from '@/lib/api/search'
import type { TorrentResult } from '@/lib/types'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock AbortSignal.timeout if not available
if (!global.AbortSignal.timeout) {
  global.AbortSignal.timeout = jest.fn().mockImplementation((timeout: number) => {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), timeout)
    return controller.signal
  })
}

const mockProwlarrResponse = {
  results: [
    {
      guid: 'test-guid-123',
      title: 'Ubuntu 22.04.3 Desktop amd64.iso',
      size: 4294967296,
      publishDate: '2023-08-10T12:00:00Z',
      indexer: 'Test Indexer',
      indexerId: 1,
      downloadUrl: 'https://example.com/download/ubuntu.torrent',
      magnetUrl: 'magnet:?xt=urn:btih:test123',
      seeders: 150,
      peers: 25,
      categories: [2000],
      categoryDesc: 'PC/Software'
    }
  ],
  offset: 0,
  limit: 50,
  total: 1
}

describe('searchTorrents', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    // Suppress console.error for tests that expect errors
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('successfully searches for torrents', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockProwlarrResponse
    })

    const searchParams: SearchRequest = {
      query: 'ubuntu',
      limit: 50,
      offset: 0
    }

    const result = await searchTorrents(searchParams)

    expect(result.success).toBe(true)
    expect(result.data.results).toHaveLength(1)
    expect(result.data.results[0]).toMatchObject({
      id: 'test-guid-123',
      title: 'Ubuntu 22.04.3 Desktop amd64.iso',
      size: 4294967296,
      sizeText: '4.0 GB',
      seeders: 150,
      leechers: 25,
      category: 'PC/Software',
      indexer: 'Test Indexer',
      downloadUrl: 'https://example.com/download/ubuntu.torrent',
      magnetUrl: 'magnet:?xt=urn:btih:test123',
      publishDate: '2023-08-10T12:00:00Z'
    })
    expect(result.data.total).toBe(1)
    expect(result.data.indexers).toEqual(['Test Indexer'])
  })

  it('builds correct query parameters', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockProwlarrResponse
    })

    const searchParams: SearchRequest = {
      query: 'test query',
      categories: ['2000', '5000'],
      minSeeders: 5,
      limit: 25,
      offset: 50
    }

    await searchTorrents(searchParams)

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/prowlarr/search?query=test+query&offset=50&limit=25&categories=2000%2C5000&minSeeders=5',
      expect.objectContaining({
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: expect.any(AbortSignal)
      })
    )
  })

  it('handles search API errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Server error details'
    })

    const searchParams: SearchRequest = {
      query: 'test',
      limit: 50,
      offset: 0
    }

    const result = await searchTorrents(searchParams)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Search failed: 500 Internal Server Error')
    expect(result.data.results).toEqual([])
  })

  it('handles network errors', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    const searchParams: SearchRequest = {
      query: 'test',
      limit: 50,
      offset: 0
    }

    const result = await searchTorrents(searchParams)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Network error')
    expect(result.data.results).toEqual([])
  })

  it('sorts results by seeders in descending order', async () => {
    const mockMultipleResults = {
      ...mockProwlarrResponse,
      results: [
        { ...mockProwlarrResponse.results[0], guid: 'test-1', seeders: 10 },
        { ...mockProwlarrResponse.results[0], guid: 'test-2', seeders: 50 },
        { ...mockProwlarrResponse.results[0], guid: 'test-3', seeders: 25 }
      ]
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockMultipleResults
    })

    const searchParams: SearchRequest = {
      query: 'test',
      sortBy: 'seeders',
      sortOrder: 'desc'
    }

    const result = await searchTorrents(searchParams)

    expect(result.success).toBe(true)
    expect(result.data.results[0].seeders).toBe(50)
    expect(result.data.results[1].seeders).toBe(25)
    expect(result.data.results[2].seeders).toBe(10)
  })

  it('sorts results by size in ascending order', async () => {
    const mockMultipleResults = {
      ...mockProwlarrResponse,
      results: [
        { ...mockProwlarrResponse.results[0], guid: 'test-1', size: 3000000000 },
        { ...mockProwlarrResponse.results[0], guid: 'test-2', size: 1000000000 },
        { ...mockProwlarrResponse.results[0], guid: 'test-3', size: 2000000000 }
      ]
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockMultipleResults
    })

    const searchParams: SearchRequest = {
      query: 'test',
      sortBy: 'size',
      sortOrder: 'asc'
    }

    const result = await searchTorrents(searchParams)

    expect(result.success).toBe(true)
    expect(result.data.results[0].size).toBe(1000000000)
    expect(result.data.results[1].size).toBe(2000000000)
    expect(result.data.results[2].size).toBe(3000000000)
  })

  it('formats file sizes correctly', async () => {
    const mockWithDifferentSizes = {
      ...mockProwlarrResponse,
      results: [
        { ...mockProwlarrResponse.results[0], guid: 'test-1', size: 1024 }, // 1 KB
        { ...mockProwlarrResponse.results[0], guid: 'test-2', size: 1048576 }, // 1 MB
        { ...mockProwlarrResponse.results[0], guid: 'test-3', size: 1073741824 }, // 1 GB
        { ...mockProwlarrResponse.results[0], guid: 'test-4', size: 1099511627776 }, // 1 TB
      ]
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockWithDifferentSizes
    })

    const result = await searchTorrents({ query: 'test' })

    expect(result.success).toBe(true)
    expect(result.data.results[0].sizeText).toBe('1.0 KB')
    expect(result.data.results[1].sizeText).toBe('1.0 MB')
    expect(result.data.results[2].sizeText).toBe('1.0 GB')
    expect(result.data.results[3].sizeText).toBe('1.0 TB')
  })
})

describe('addTorrentToDownloads', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    // Suppress console.error for tests that expect errors
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  const mockTorrent: TorrentResult = {
    id: 'test-123',
    title: 'Test Torrent',
    size: 1073741824,
    sizeText: '1.0 GB',
    seeders: 50,
    leechers: 10,
    category: 'Movies',
    indexer: 'Test Indexer',
    downloadUrl: 'https://example.com/test.torrent',
    magnetUrl: 'magnet:?xt=urn:btih:test123',
    publishDate: '2023-08-10T12:00:00Z'
  }

  it('successfully adds torrent with magnet URL', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    })

    const result = await addTorrentToDownloads(mockTorrent)

    expect(result.success).toBe(true)
    expect(result.data.success).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/qbittorrent/torrents/add',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: mockTorrent.magnetUrl,
          category: mockTorrent.category
        })
      })
    )
  })

  it('falls back to download URL when no magnet URL', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    })

    const torrentWithoutMagnet = { ...mockTorrent, magnetUrl: undefined }
    await addTorrentToDownloads(torrentWithoutMagnet)

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/qbittorrent/torrents/add',
      expect.objectContaining({
        body: JSON.stringify({
          urls: torrentWithoutMagnet.downloadUrl,
          category: torrentWithoutMagnet.category
        })
      })
    )
  })

  it('handles add torrent API errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      statusText: 'Bad Request'
    })

    const result = await addTorrentToDownloads(mockTorrent)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Failed to add torrent: Bad Request')
    expect(result.data.success).toBe(false)
  })

  it('handles network errors during torrent addition', async () => {
    mockFetch.mockRejectedValue(new Error('Connection failed'))

    const result = await addTorrentToDownloads(mockTorrent)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Connection failed')
    expect(result.data.success).toBe(false)
  })
})