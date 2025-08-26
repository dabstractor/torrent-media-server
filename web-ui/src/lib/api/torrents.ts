import apiClient from './client'
import type { 
  SearchResponse, 
  DownloadsResponse, 
  TorrentResult,
  Download 
} from '@/types'

// Search torrents via Prowlarr/Jackett
export const searchTorrents = async (
  query: string, 
  category?: string
): Promise<SearchResponse | null> => {
  const params = new URLSearchParams({ query })
  if (category) params.append('category', category)
  
  const response = await apiClient.get<SearchResponse>(
    `/search?${params.toString()}`
  )
  
  return response.success ? response.data : null
}

// Add torrent to qBittorrent
export const addTorrent = async (
  torrent: Pick<TorrentResult, 'downloadUrl' | 'magnetUrl'>,
  category?: string
): Promise<boolean> => {
  const response = await apiClient.post<{ hash: string }>('/downloads', {
    url: torrent.magnetUrl || torrent.downloadUrl,
    category,
  })
  
  return response.success
}

// Get all downloads
export const getDownloads = async (): Promise<DownloadsResponse | null> => {
  const response = await apiClient.get<DownloadsResponse>('/downloads')
  return response.success ? response.data : null
}

// Control download (pause, resume, delete)
export const controlDownload = async (
  hash: string, 
  action: 'pause' | 'resume' | 'delete'
): Promise<boolean> => {
  const response = await apiClient.post<void>(`/downloads/${hash}/${action}`)
  return response.success
}

// Get download details
export const getDownloadDetails = async (
  hash: string
): Promise<Download | null> => {
  const response = await apiClient.get<Download>(`/downloads/${hash}`)
  return response.success ? response.data : null
}