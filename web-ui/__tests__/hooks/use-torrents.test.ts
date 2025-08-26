import { renderHook, waitFor } from '@testing-library/react'
import { useTorrents } from '@/hooks/use-torrents'
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
  getTorrents: jest.fn(),
  controlTorrent: jest.fn(),
}))

const mockControlTorrent = api.controlTorrent as jest.MockedFunction<typeof api.controlTorrent>

describe('useTorrents', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return torrent data and control functions', () => {
    const { result } = renderHook(() => useTorrents())

    expect(result.current).toHaveProperty('torrents')
    expect(result.current).toHaveProperty('stats')
    expect(result.current).toHaveProperty('isLoading')
    expect(result.current).toHaveProperty('error')
    expect(result.current).toHaveProperty('pauseTorrent')
    expect(result.current).toHaveProperty('resumeTorrent')
    expect(result.current).toHaveProperty('deleteTorrent')
  })

  it('should call controlTorrent API when pausing', async () => {
    mockControlTorrent.mockResolvedValue(true)
    
    const { result } = renderHook(() => useTorrents())
    
    await result.current.pauseTorrent('test-hash')
    
    expect(mockControlTorrent).toHaveBeenCalledWith('test-hash', 'pause')
  })

  it('should call controlTorrent API when resuming', async () => {
    mockControlTorrent.mockResolvedValue(true)
    
    const { result } = renderHook(() => useTorrents())
    
    await result.current.resumeTorrent('test-hash')
    
    expect(mockControlTorrent).toHaveBeenCalledWith('test-hash', 'resume')
  })

  it('should call controlTorrent API when deleting', async () => {
    mockControlTorrent.mockResolvedValue(true)
    
    const { result } = renderHook(() => useTorrents())
    
    await result.current.deleteTorrent('test-hash')
    
    expect(mockControlTorrent).toHaveBeenCalledWith('test-hash', 'delete')
  })
})