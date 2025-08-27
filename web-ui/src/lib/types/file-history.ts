import { z } from 'zod'

export interface DownloadHistoryEntry {
  id: string                    // UUID for unique identification
  torrentHash: string          // Links to original torrent
  name: string                 // Display name from torrent
  originalSize: number         // Total size in bytes
  downloadedSize: number       // Actually downloaded bytes
  downloadPath: string         // Absolute path to downloaded content
  torrentFile?: string         // Path to stored .torrent file
  magnetUrl?: string           // Magnet link if available
  startedAt: Date             // Download initiation timestamp
  completedAt: Date           // Download completion timestamp  
  downloadTime: number         // Duration in milliseconds
  averageSpeed: number         // Average speed in bytes/second
  seeders: number             // Seeder count at completion
  leechers: number            // Leecher count at completion
  ratio: number               // Upload ratio if available
  category: string            // Category classification
  tags: string[]              // User/system tags
  status: 'completed' | 'deleted' | 'moved' | 'error'
  metadata?: Record<string, unknown> // Additional torrent metadata
}

export interface TorrentFileInfo {
  name: string                // File name
  size: number               // File size in bytes
  path: string               // Relative path within torrent
}

export interface StoredTorrentFile {
  filename: string            // Original .torrent filename
  hash: string               // Torrent info hash
  title: string              // Human readable title
  size: number               // Total content size in bytes
  createdDate: Date          // When .torrent was created
  trackers: string[]         // Tracker URLs
  files: TorrentFileInfo[]   // Individual files in torrent
  magnetUrl?: string         // Generated magnet link
  storagePath: string        // Path to stored .torrent file
}

export interface CompletedFile {
  path: string               // Absolute file path
  name: string               // Filename
  size: number               // File size in bytes
  modifiedDate: Date         // Last modified timestamp
  mediaType?: 'video' | 'audio' | 'image' | 'archive' | 'document'
  torrentHash?: string       // Links back to download history
  plexCompatible: boolean    // Whether Plex can process this file
  quality?: string           // Extracted quality info (1080p, etc.)
}

export interface HistoryFilters {
  category?: string
  status?: DownloadHistoryEntry['status'][]
  dateRange?: [Date, Date]
  sizeRange?: [number, number]
  searchTerm?: string
}

export interface FileHistoryStats {
  totalDownloads: number
  totalSize: number
  totalTime: number
  averageSpeed: number
  categoryBreakdown: Record<string, number>
  statusBreakdown: Record<string, number>
}

// Pydantic-style validators for runtime type safety
export const DownloadHistoryEntrySchema = z.object({
  id: z.string().uuid(),
  torrentHash: z.string().min(40).max(40), // SHA-1 hash length
  name: z.string().min(1).max(500),
  originalSize: z.number().positive(),
  downloadedSize: z.number().nonnegative(),
  downloadPath: z.string().min(1),
  torrentFile: z.string().optional(),
  magnetUrl: z.string().optional(),
  startedAt: z.date(),
  completedAt: z.date(),
  downloadTime: z.number().positive(),
  averageSpeed: z.number().nonnegative(),
  seeders: z.number().nonnegative(),
  leechers: z.number().nonnegative(),
  ratio: z.number().nonnegative(),
  category: z.string(),
  tags: z.array(z.string()),
  status: z.enum(['completed', 'deleted', 'moved', 'error']),
  metadata: z.record(z.unknown()).optional(),
})

export const StoredTorrentFileSchema = z.object({
  filename: z.string().min(1),
  hash: z.string().min(40).max(40),
  title: z.string().min(1),
  size: z.number().positive(),
  createdDate: z.date(),
  trackers: z.array(z.string()),
  files: z.array(z.object({
    name: z.string(),
    size: z.number(),
    path: z.string(),
  })),
  magnetUrl: z.string().optional(),
  storagePath: z.string(),
})

export const CompletedFileSchema = z.object({
  path: z.string().min(1),
  name: z.string().min(1),
  size: z.number().nonnegative(),
  modifiedDate: z.date(),
  mediaType: z.enum(['video', 'audio', 'image', 'archive', 'document']).optional(),
  torrentHash: z.string().optional(),
  plexCompatible: z.boolean(),
  quality: z.string().optional(),
})