import type { ApiResponse, SearchResponse, TorrentResult } from '@/lib/types'
import { transformDownloadUrls } from '@/lib/utils/download-url-utils'
import { getQBittorrentCategory } from '@/lib/utils/content-detection'

export interface SearchRequest {
  query: string
  categories?: string[]
  minSeeders?: number
  maxSize?: number
  sortBy?: 'seeders' | 'size' | 'date' | 'relevance'
  sortOrder?: 'asc' | 'desc'
  offset?: number
  limit?: number
}

interface ProwlarrSearchResult {
  guid: string
  title: string
  size: number
  publishDate: string
  indexer: string
  indexerId: number
  downloadUrl: string
  magnetUrl?: string
  seeders: number
  peers: number
  categories: number[]
  categoryDesc?: string
}

interface ProwlarrSearchResponse {
  results: ProwlarrSearchResult[]
  offset: number
  limit: number
  total: number
}

function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

function normalizeTorrentResult(prowlarrResult: ProwlarrSearchResult): TorrentResult {
  // Transform download URLs to use secure proxy endpoints
  const secureUrls = transformDownloadUrls(
    prowlarrResult.downloadUrl,
    prowlarrResult.magnetUrl,
    prowlarrResult.guid
  )

  return {
    id: prowlarrResult.guid,
    title: prowlarrResult.title,
    size: prowlarrResult.size,
    sizeText: formatFileSize(prowlarrResult.size),
    seeders: prowlarrResult.seeders || 0,
    leechers: prowlarrResult.peers || 0,
    category: prowlarrResult.categoryDesc || 'Unknown',
    indexer: prowlarrResult.indexer,
    downloadUrl: secureUrls.downloadUrl, // Uses secure proxy endpoint
    magnetUrl: secureUrls.magnetUrl, // Uses secure magnet endpoint if needed
    publishDate: prowlarrResult.publishDate
  }
}

export async function searchTorrents(params: SearchRequest): Promise<ApiResponse<SearchResponse>> {
  try {
    // Build query parameters for Prowlarr API
    const queryParams = new URLSearchParams({
      query: params.query
    })

    if (params.categories && params.categories.length > 0) {
      queryParams.append('categories', params.categories.join(','))
    }

    if (params.minSeeders !== undefined) {
      queryParams.append('minSeeders', params.minSeeders.toString())
    }

    // Determine base URL for server-side calls
    const baseUrl = typeof window === 'undefined'
      ? process.env.NEXTAUTH_URL || `http://localhost:${process.env.WEB_UI_PORT}`
      : ''

    // Call Prowlarr directly via proxy route for authentication and proper headers
    const response = await fetch(`${baseUrl}/api/prowlarr/search?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(30000) // 30 second timeout to match existing patterns
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Search failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const rawData = await response.json()

    // Handle both response formats: array directly or structured object
    let allResults: ProwlarrSearchResult[];
    if (Array.isArray(rawData)) {
      allResults = rawData;
    } else {
      // Prowlarr returned structured response
      allResults = (rawData as ProwlarrSearchResponse).results || [];
    }

    // Normalize all results to match our TorrentResult interface
    const allNormalizedResults: TorrentResult[] = allResults.map(normalizeTorrentResult)

    // Apply client-side sorting if specified
    if (params.sortBy) {
      allNormalizedResults.sort((a, b) => {
        let aValue: number, bValue: number

        switch (params.sortBy) {
          case 'seeders':
            aValue = a.seeders
            bValue = b.seeders
            break
          case 'size':
            aValue = a.size
            bValue = b.size
            break
          case 'date':
            aValue = new Date(a.publishDate).getTime()
            bValue = new Date(b.publishDate).getTime()
            break
          default:
            return 0 // relevance - keep original order
        }

        const result = params.sortOrder === 'desc' ? bValue - aValue : aValue - bValue
        return result
      })
    }

    // Get unique indexers from all results
    const indexers = Array.from(new Set(allNormalizedResults.map(result => result.indexer)))

    const searchResponse: SearchResponse = {
      results: allNormalizedResults,
      total: allNormalizedResults.length,
      indexers
    }

    return {
      success: true,
      data: searchResponse
    }
  } catch (error) {
    console.error('Search API error:', error)
    
    return {
      success: false,
      data: {
        results: [],
        total: 0,
        indexers: []
      },
      error: error instanceof Error ? error.message : 'Unknown search error'
    }
  }
}

export async function addTorrentToDownloads(torrent: TorrentResult): Promise<ApiResponse<{ success: boolean }>> {
  try {
    // Determine the appropriate qBittorrent category for automatic organization
    const autoCategory = getQBittorrentCategory(torrent.title, torrent.category)

    // Use auto-detected category if available, otherwise keep original
    const categoryToUse = autoCategory || torrent.category

    // Log category assignment for debugging
    if (autoCategory) {
      console.log(`Smart category assignment: "${torrent.title}" → ${autoCategory}`)
    } else {
      console.log(`No auto-category detected for: "${torrent.title}" (keeping original: ${torrent.category})`)
    }

    // Use qBittorrent API via proxy to add torrent
    const response = await fetch('/api/qbittorrent/torrents/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        urls: torrent.magnetUrl || torrent.downloadUrl,
        category: categoryToUse
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to add torrent: ${response.statusText}`)
    }

    return {
      success: true,
      data: { success: true }
    }
  } catch (error) {
    console.error('Add torrent error:', error)
    
    return {
      success: false,
      data: { success: false },
      error: error instanceof Error ? error.message : 'Failed to add torrent'
    }
  }
}