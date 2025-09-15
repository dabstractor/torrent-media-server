import chokidar from 'chokidar'
import path from 'path'
import { promises as fs } from 'fs'
import { getFileHistoryDB } from '@/lib/db/file-history'
import type { CompletedFile, DownloadHistoryEntry } from '@/lib/types/file-history'
import type { Download } from '@/lib/types'
import { getMediaType, isPlexCompatible, extractQuality } from '@/lib/api/files'
import { plexIntegrationManager } from '@/lib/managers/PlexIntegrationManager'
import { v4 as uuidv4 } from 'uuid'

interface FileMonitorOptions {
  watchPaths: string[]
  torrentCompletionPath?: string
  ignoredExtensions?: string[]
  debounceDelay?: number
}

export class FileMonitor {
  private watchers: Map<string, chokidar.FSWatcher> = new Map()
  private db = getFileHistoryDB()
  private options: Required<FileMonitorOptions>
  private pendingFiles: Map<string, NodeJS.Timeout> = new Map()

  constructor(options: FileMonitorOptions) {
    this.options = {
      watchPaths: options.watchPaths,
      torrentCompletionPath: options.torrentCompletionPath || '/downloads/complete',
      ignoredExtensions: options.ignoredExtensions || ['.tmp', '.part', '.!qb', '.crdownload'],
      debounceDelay: options.debounceDelay || 5000, // 5 second delay to ensure file is fully written
    }
  }

  start(): void {
    console.log('Starting file monitoring service...')
    
    for (const watchPath of this.options.watchPaths) {
      this.startWatching(watchPath)
    }
  }

  stop(): void {
    console.log('Stopping file monitoring service...')
    
    for (const [path, watcher] of this.watchers) {
      console.log(`Stopping watcher for: ${path}`)
      watcher.close()
    }
    
    this.watchers.clear()
    
    // Clear pending timeouts
    for (const timeout of this.pendingFiles.values()) {
      clearTimeout(timeout)
    }
    this.pendingFiles.clear()
  }

  private startWatching(watchPath: string): void {
    const fullPath = path.resolve(watchPath)
    
    console.log(`Starting file watcher for: ${fullPath}`)
    
    const watcher = chokidar.watch(fullPath, {
      persistent: true,
      ignoreInitial: true,
      depth: Infinity,
      ignored: [
        // Ignore temporary files and system files
        /(^|[\/\\])\../, // Hidden files
        /\.tmp$/,
        /\.part$/,
        /\.!qb$/,
        /\.crdownload$/,
        // Add custom ignored extensions
        ...this.options.ignoredExtensions.map(ext => new RegExp(`\\${ext}$`))
      ],
      // Polling settings for better reliability in containers
      usePolling: process.env.NODE_ENV === 'production',
      interval: 1000,
    })

    watcher
      .on('add', (filePath) => this.handleFileAdded(filePath))
      .on('change', (filePath) => this.handleFileChanged(filePath))
      .on('unlink', (filePath) => this.handleFileRemoved(filePath))
      .on('addDir', (dirPath) => this.handleDirectoryAdded(dirPath))
      .on('unlinkDir', (dirPath) => this.handleDirectoryRemoved(dirPath))
      .on('error', (error) => this.handleError(error))
      .on('ready', () => {
        console.log(`File watcher ready for: ${fullPath}`)
      })

    this.watchers.set(fullPath, watcher)
  }

  private handleFileAdded(filePath: string): void {
    console.log(`File added: ${filePath}`)
    this.scheduleFileProcessing(filePath, 'add')
  }

  private handleFileChanged(filePath: string): void {
    console.log(`File changed: ${filePath}`)
    this.scheduleFileProcessing(filePath, 'change')
  }

  private handleFileRemoved(filePath: string): void {
    console.log(`File removed: ${filePath}`)
    this.handleFileRemovedImmediate(filePath)
  }

  private handleDirectoryAdded(dirPath: string): void {
    console.log(`Directory added: ${dirPath}`)
    // Check if this looks like a completed download directory
    this.checkForCompletedDownload(dirPath)
  }

  private handleDirectoryRemoved(dirPath: string): void {
    console.log(`Directory removed: ${dirPath}`)
    // Update any files that were in this directory
    this.updateRemovedDirectory(dirPath)
  }

  private handleError(error: unknown): void {
    console.error('File watcher error:', error)
  }

  private scheduleFileProcessing(filePath: string, event: 'add' | 'change'): void {
    // Clear existing timeout for this file
    const existingTimeout = this.pendingFiles.get(filePath)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Schedule processing after debounce delay
    const timeout = setTimeout(() => {
      this.processFile(filePath, event)
      this.pendingFiles.delete(filePath)
    }, this.options.debounceDelay)

    this.pendingFiles.set(filePath, timeout)
  }

  private async processFile(filePath: string, event: 'add' | 'change'): Promise<void> {
    try {
      const stats = await fs.stat(filePath)
      
      if (!stats.isFile()) {
        return
      }

      const fileName = path.basename(filePath)
      const relativePath = path.relative(process.cwd(), filePath)

      // Check if this file is already in our database
      const existingFiles = this.db.getCompletedFiles()
      const existing = existingFiles.find(f => f.path === relativePath)

      const fileInfo: CompletedFile = {
        path: relativePath,
        name: fileName,
        size: stats.size,
        modifiedDate: stats.mtime,
        mediaType: getMediaType(fileName),
        plexCompatible: isPlexCompatible(fileName),
        quality: extractQuality(fileName),
      }

      if (existing) {
        // File already exists, this might be a modification
        console.log(`Updating existing file: ${fileName}`)
      } else {
        console.log(`Adding new completed file: ${fileName}`)
      }

      this.db.addCompletedFile(fileInfo)

      // FILE MONITORING: Track new files for UI display only
      // Note: File organization is handled by Radarr/Sonarr automatically
      if (event === 'add' && filePath.includes('/downloads')) {
        console.log(`📁 New download file detected (monitoring only): ${fileName}`);
      }

    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error)
    }
  }

  private handleFileRemovedImmediate(filePath: string): void {
    try {
      const relativePath = path.relative(process.cwd(), filePath)
      
      // Update the file status to 'deleted' in completed_files
      // This would require adding an update method to the database class
      console.log(`File deleted: ${relativePath}`)
      
      // For now, we'll leave the file in the database but could add a 'deleted' flag
      // in a future enhancement
      
    } catch (error) {
      console.error(`Error handling removed file ${filePath}:`, error)
    }
  }

  private async checkForCompletedDownload(dirPath: string): Promise<void> {
    try {
      // Check if this directory looks like a completed torrent
      const dirName = path.basename(dirPath)
      
      // This is a simplified check - in a real implementation, we'd integrate
      // with the torrent client to get actual completion events
      if (dirPath.includes('complete') || dirPath.includes('finished')) {
        console.log(`Potential completed download detected: ${dirName}`)
        
        // Scan the directory for files
        const files = await this.scanDirectoryFiles(dirPath)
        
        if (files.length > 0) {
          // Create a history entry for this download
          await this.createHistoryEntryFromFiles(dirName, dirPath, files)
        }
      }
    } catch (error) {
      console.error(`Error checking completed download ${dirPath}:`, error)
    }
  }

  private async scanDirectoryFiles(dirPath: string): Promise<CompletedFile[]> {
    const files: CompletedFile[] = []
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)
        
        if (entry.isFile()) {
          const stats = await fs.stat(fullPath)
          const relativePath = path.relative(process.cwd(), fullPath)
          
          files.push({
            path: relativePath,
            name: entry.name,
            size: stats.size,
            modifiedDate: stats.mtime,
            mediaType: getMediaType(entry.name),
            plexCompatible: isPlexCompatible(entry.name),
            quality: extractQuality(entry.name),
          })
        } else if (entry.isDirectory()) {
          // Recursively scan subdirectories
          const subFiles = await this.scanDirectoryFiles(fullPath)
          files.push(...subFiles)
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error)
    }
    
    return files
  }

  private async createHistoryEntryFromFiles(
    name: string, 
    downloadPath: string, 
    files: CompletedFile[]
  ): Promise<void> {
    try {
      const totalSize = files.reduce((sum, file) => sum + file.size, 0)
      const now = new Date()
      
      // Create a synthetic history entry
      const historyEntry: DownloadHistoryEntry = {
        id: uuidv4(),
        torrentHash: `synthetic-${Date.now()}`, // Synthetic hash for directory-based detection
        name,
        originalSize: totalSize,
        downloadedSize: totalSize,
        downloadPath: path.relative(process.cwd(), downloadPath),
        startedAt: new Date(now.getTime() - 60000), // Assume 1 minute download for synthetic entry
        completedAt: now,
        downloadTime: 60000, // 1 minute
        averageSpeed: totalSize / 60, // bytes per second
        seeders: 0,
        leechers: 0,
        ratio: 0,
        category: 'auto-detected',
        tags: ['file-monitor'],
        status: 'completed',
      }
      
      this.db.addHistoryEntry(historyEntry)
      
      // Add all files with the torrent hash reference
      for (const file of files) {
        const fileWithHash = { ...file, torrentHash: historyEntry.torrentHash }
        this.db.addCompletedFile(fileWithHash)
      }
      
      console.log(`Created history entry for: ${name} (${files.length} files)`)
      
      // MONITOR: Track completed download for UI display only
      // Note: Media organization handled by Radarr/Sonarr
      
    } catch (error) {
      console.error(`Error creating history entry for ${name}:`, error)
    }
  }

  // REMOVED: handleNewDownloadFile() - file organization now handled by Radarr/Sonarr
  // This method was part of the DIY organization system that conflicted with proper *arr automation

  // REMOVED: triggerPlexOrganization() - file organization now handled by Radarr/Sonarr
  // This method was part of the DIY organization system that conflicted with proper *arr automation

  private checkForTorrentCompletion(filePath: string, fileInfo: CompletedFile): void {
    // This would integrate with torrent client APIs to determine if this file
    // is part of a torrent that just completed
    // For now, we just log the potential completion
    console.log(`File completion detected: ${fileInfo.name}`)
  }

  private updateRemovedDirectory(dirPath: string): void {
    try {
      const relativePath = path.relative(process.cwd(), dirPath)
      console.log(`Directory removed: ${relativePath}`)
      
      // In a full implementation, we'd update all files that were in this directory
      // to mark them as 'deleted' or 'moved'
      
    } catch (error) {
      console.error(`Error handling removed directory ${dirPath}:`, error)
    }
  }

  // Public methods for controlling the monitor
  addWatchPath(watchPath: string): void {
    if (!this.watchers.has(path.resolve(watchPath))) {
      this.options.watchPaths.push(watchPath)
      this.startWatching(watchPath)
    }
  }

  removeWatchPath(watchPath: string): void {
    const fullPath = path.resolve(watchPath)
    const watcher = this.watchers.get(fullPath)
    
    if (watcher) {
      watcher.close()
      this.watchers.delete(fullPath)
      this.options.watchPaths = this.options.watchPaths.filter(p => 
        path.resolve(p) !== fullPath
      )
    }
  }

  getWatchedPaths(): string[] {
    return Array.from(this.watchers.keys())
  }

  getStatus(): { isRunning: boolean; watchedPaths: number; pendingFiles: number } {
    return {
      isRunning: this.watchers.size > 0,
      watchedPaths: this.watchers.size,
      pendingFiles: this.pendingFiles.size,
    }
  }
}

// Singleton instance for use across the application
let fileMonitorInstance: FileMonitor | null = null

export function getFileMonitor(): FileMonitor {
  if (!fileMonitorInstance) {
    fileMonitorInstance = new FileMonitor({
      watchPaths: [
        '/downloads',  // Watch actual downloads directory in container
        '/media',      // Watch media directory for changes
      ],
    })
  }
  return fileMonitorInstance
}

export function startFileMonitoring(): void {
  const monitor = getFileMonitor()
  monitor.start()
}

export function stopFileMonitoring(): void {
  if (fileMonitorInstance) {
    fileMonitorInstance.stop()
  }
}