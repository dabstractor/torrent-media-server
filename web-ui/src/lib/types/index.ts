// Torrent search results from Prowlarr/Jackett
export interface TorrentResult {
  id: string
  title: string
  size: number
  sizeText: string
  seeders: number
  leechers: number
  category: string
  indexer: string
  downloadUrl: string
  magnetUrl?: string
  publishDate: string
}

// Download status from qBittorrent
export interface Download {
  hash: string
  name: string
  size: number
  progress: number
  state: DownloadState
  eta: number
  downloadSpeed: number
  uploadSpeed: number
  priority: number
  category?: string
  addedTime: number
  completedTime?: number
}

export type DownloadState = 
  | 'downloading' 
  | 'completed' 
  | 'paused' 
  | 'error' 
  | 'queued'
  | 'seeding'

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
}

export interface SearchResponse {
  results: TorrentResult[]
  total: number
  indexers: string[]
}

export interface DownloadsResponse {
  downloads: Download[]
  stats: {
    totalSize: number
    downloadSpeed: number
    uploadSpeed: number
    activeCount: number
  }
}

// Settings
export interface AppSettings {
  maxConcurrentDownloads: number
  downloadSpeedLimit: number
  uploadSpeedLimit: number
  defaultCategory: string
  autoStart: boolean
  notifications: boolean
}