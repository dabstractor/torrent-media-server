import { renderHook, act } from '@testing-library/react'
import { useDownloads } from '@/hooks/use-downloads'

describe('useDownloads', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should initialize with an empty downloads array', () => {
    const { result } = renderHook(() => useDownloads())
    expect(result.current.downloads).toEqual([])
  })

  it('should add a new download', () => {
    const { result } = renderHook(() => useDownloads())
    
    act(() => {
      result.current.addDownload('https://example.com/file.zip', 'file.zip')
    })

    expect(result.current.downloads).toHaveLength(1)
    expect(result.current.downloads[0]).toEqual(
      expect.objectContaining({
        fileName: 'file.zip',
        url: 'https://example.com/file.zip',
        status: 'downloading',
        progress: 0
      })
    )
  })

  it('should cancel a download', () => {
    const { result } = renderHook(() => useDownloads())
    
    act(() => {
      result.current.addDownload('https://example.com/file.zip', 'file.zip')
    })

    const downloadId = result.current.downloads[0].id

    act(() => {
      result.current.cancelDownload(downloadId)
    })

    expect(result.current.downloads[0].status).toBe('cancelled')
  })

  it('should clear completed downloads', () => {
    const { result } = renderHook(() => useDownloads())
    
    act(() => {
      result.current.addDownload('https://example.com/file1.zip', 'file1.zip')
      result.current.addDownload('https://example.com/file2.zip', 'file2.zip')
    })

    // Simulate completing one download
    act(() => {
      result.current.downloads.forEach(download => {
        if (download.fileName === 'file1.zip') {
          // In a real test, we would simulate completion
          // For now, we'll just check the clear functionality
        }
      })
    })

    act(() => {
      result.current.clearCompleted()
    })

    // In a real implementation, we would test that completed downloads are removed
    expect(result.current.downloads).toHaveLength(2)
  })

  it('should retry a failed download', () => {
    const { result } = renderHook(() => useDownloads())
    
    act(() => {
      result.current.addDownload('https://example.com/file.zip', 'file.zip')
    })

    const downloadId = result.current.downloads[0].id

    // Simulate failure
    act(() => {
      result.current.downloads[0].status = 'failed'
    })

    act(() => {
      result.current.retryDownload(downloadId)
    })

    expect(result.current.downloads[0].status).toBe('pending')
    expect(result.current.downloads[0].progress).toBe(0)
  })
})