import apiClient from './client'
import type { 
  SearchResponse, 
  DownloadsResponse, 
  TorrentResult,
  Download 
} from '@/lib/types';

// Search torrents via Prowlarr/Jackett
export const searchTorrents = async (
  query: string, 
  category?: string
): Promise<SearchResponse> => {
  const params = new URLSearchParams({ query })
  if (category) params.append('category', category)
  
  const response = await apiClient.get<SearchResponse>(
    `/search?${params.toString()}`
  )
  
  if (response.success) {
    return response.data;
  }
  throw new Error(response.error || 'Search failed');
}

// Add torrent to qBittorrent
export const addTorrent = async (
  torrent: Pick<TorrentResult, 'downloadUrl' | 'magnetUrl'>,
  category?: string
): Promise<boolean> => {
  const response = await apiClient.post<{ hash: string }>('/torrents', {
    url: torrent.magnetUrl || torrent.downloadUrl,
    category,
  })
  
  return response.success
}

// Get all torrents
export const getTorrents = async (): Promise<DownloadsResponse> => {
  const response = await apiClient.get<DownloadsResponse>('/torrents');
  if (response.success) {
    return response.data;
  }
  throw new Error(response.error || 'Failed to fetch torrents');
}

// Control torrent (pause, resume, delete)
export const controlTorrent = async (
  hash: string, 
  action: 'pause' | 'resume' | 'delete'
): Promise<boolean> => {
  const response = await apiClient.post<void>(`/torrents/${hash}/${action}`)
  return response.success
}

// Get torrent details
export const getTorrentDetails = async (
  hash: string
): Promise<Download> => {
  const response = await apiClient.get<Download>(`/torrents/${hash}`);
  if (response.success) {
    return response.data;
  }
  throw new Error(response.error || 'Failed to fetch torrent details');
}