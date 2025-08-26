import { renderHook, waitFor } from '@testing-library/react'
import { useDownloads } from '@/hooks/use-downloads'
import * as api from '@/lib/api/torrents'

// Mock SWR
jest.mock('swr', () => {
  return jest.fn(() => ({
    data: {
      downloads: [],
      stats: {
        totalSize: 0,
        downloadSpeed: 0,
        uploadSpeed: 0,
        activeCount: 0,
      },
    },
    error: null,
    mutate: jest.fn(),
    isLoading: false,
  }))
})

// Mock API functions
jest.mock('@/lib/api/torrents', () => ({
  getDownloads: jest.fn(),
  controlDownload: jest.fn(),
}))

const mockControlDownload = api.controlDownload as jest.MockedFunction<typeof api.controlDownload>

describe('useDownloads', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return download data and control functions', () => {
    const { result } = renderHook(() => useDownloads())

    expect(result.current).toHaveProperty('downloads')
    expect(result.current).toHaveProperty('stats')
    expect(result.current).toHaveProperty('isLoading')
    expect(result.current).toHaveProperty('error')
    expect(result.current).toHaveProperty('pauseDownload')
    expect(result.current).toHaveProperty('resumeDownload')
    expect(result.current).toHaveProperty('deleteDownload')
  })

  it('should call controlDownload API when pausing', async () => {
    mockControlDownload.mockResolvedValue(true)
    
    const { result } = renderHook(() => useDownloads())
    
    await result.current.pauseDownload('test-hash')
    
    expect(mockControlDownload).toHaveBeenCalledWith('test-hash', 'pause')
  })

  it('should call controlDownload API when resuming', async () => {
    mockControlDownload.mockResolvedValue(true)
    
    const { result } = renderHook(() => useDownloads())
    
    await result.current.resumeDownload('test-hash')
    
    expect(mockControlDownload).toHaveBeenCalledWith('test-hash', 'resume')
  })

  it('should call controlDownload API when deleting', async () => {
    mockControlDownload.mockResolvedValue(true)
    
    const { result } = renderHook(() => useDownloads())
    
    await result.current.deleteDownload('test-hash')
    
    expect(mockControlDownload).toHaveBeenCalledWith('test-hash', 'delete')
  })
})