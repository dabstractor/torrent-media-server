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

// Service status
export interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'error';
  message?: string;
}

// Download Management Extensions
export interface DownloadFilters {
  state: DownloadState[]
  categories: string[]
  dateRange?: [Date, Date]
  sizeRange?: [number, number]
  progressRange?: [number, number]
}

export interface QueueItem {
  id: string
  priority: number
  position: number
}

export interface BatchOperation {
  action: 'pause' | 'resume' | 'delete' | 'setPriority' | 'setCategory'
  targetIds: string[]
  params?: Record<string, unknown>
}

export interface DownloadNotification {
  id: string
  torrentId: string
  type: 'completed' | 'error' | 'paused'
  message: string
  timestamp: Date
  read: boolean
}