import { useState, useCallback } from 'react'

export interface DownloadItem {
  id: string
  fileName: string
  url: string
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled'
  progress: number
  size?: number
  downloaded?: number
  startTime?: number
  endTime?: number
}

export function useDownloads() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([])

  // Simulate download progress (in a real app, this would be replaced with actual download logic)
  const simulateDownload = useCallback((downloadId: string) => {
    const interval = setInterval(() => {
      setDownloads(prev => prev.map(download => {
        if (download.id === downloadId && download.status === 'downloading') {
          const newProgress = Math.min(download.progress + 10, 100)
          const status = newProgress === 100 ? 'completed' : 'downloading'
          
          if (status === 'completed') {
            clearInterval(interval)
            return { 
              ...download, 
              progress: newProgress, 
              status,
              endTime: Date.now()
            }
          }
          
          return { ...download, progress: newProgress }
        }
        return download
      }))
    }, 500)

    // Clean up interval after 5 seconds (simulation)
    setTimeout(() => {
      clearInterval(interval)
      setDownloads(prev => prev.map(download => 
        download.id === downloadId && download.status === 'downloading'
          ? { ...download, status: 'completed', progress: 100, endTime: Date.now() }
          : download
      ))
    }, 5000)
  }, [])

  // Initiate the actual download process
  const initiateDownload = useCallback(async (downloadId: string) => {
    setDownloads(prev => prev.map(download => 
      download.id === downloadId 
        ? { ...download, status: 'downloading', startTime: Date.now() } 
        : download
    ))

    try {
      // For now, we'll simulate a download process
      simulateDownload(downloadId)
    } catch {
      setDownloads(prev => prev.map(download => 
        download.id === downloadId 
          ? { ...download, status: 'failed' } 
          : download
      ))
    }
  }, [simulateDownload])

  // Add a new download
  const addDownload = useCallback((url: string, fileName: string) => {
    const newDownload: DownloadItem = {
      id: Date.now().toString(),
      fileName,
      url,
      status: 'pending',
      progress: 0
    }
    
    setDownloads(prev => [...prev, newDownload])
    
    // Start the download process
    initiateDownload(newDownload.id)
  }, [initiateDownload])

  // Cancel a download
  const cancelDownload = useCallback((id: string) => {
    setDownloads(prev => prev.map(download => 
      download.id === id 
        ? { ...download, status: 'cancelled', endTime: Date.now() } 
        : download
    ))
  }, [])

  // Retry a failed download
  const retryDownload = useCallback((id: string) => {
    setDownloads(prev => prev.map(download => 
      download.id === id 
        ? { ...download, status: 'pending', progress: 0, startTime: undefined, endTime: undefined } 
        : download
    ))
    
    // Restart the download process
    setTimeout(() => {
      initiateDownload(id)
    }, 100)
  }, [initiateDownload])

  // Clear completed downloads
  const clearCompleted = useCallback(() => {
    setDownloads(prev => prev.filter(download => 
      download.status !== 'completed' && download.status !== 'cancelled'
    ))
  }, [])

  // Clear all downloads
  const clearAll = useCallback(() => {
    setDownloads([])
  }, [])

  return {
    downloads,
    addDownload,
    cancelDownload,
    retryDownload,
    clearCompleted,
    clearAll
  }
}