import { renderHook, act } from '@testing-library/react'
import { useSearchURL, parseSearchParams, generateSearchURL } from '@/hooks/use-search-url'

// Create stable mock objects to prevent infinite re-renders
const mockPush = jest.fn()
const mockReplace = jest.fn()
const mockSearchParams = {
  get: jest.fn(),
  getAll: jest.fn(() => [])
}

const mockRouter = {
  push: mockPush,
  replace: mockReplace,
  refresh: jest.fn()
}

// Mock Next.js router hooks
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(() => mockSearchParams),
  useRouter: jest.fn(() => mockRouter),
  usePathname: jest.fn(() => '/')
}))

describe('useSearchURL', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParams.get.mockReturnValue(null)
  })

  it('initializes with empty search state', () => {
    const { result } = renderHook(() => useSearchURL())

    expect(result.current.searchState).toEqual({
      query: '',
      categories: [],
      sortBy: 'seeders',
      sortOrder: 'desc',
      offset: 0,
      limit: 50
    })
    expect(result.current.isInitialized).toBe(true) // useEffect runs immediately in test
  })

  it('parses URL parameters correctly', () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      switch (key) {
        case 'q': return 'ubuntu'
        case 'cat': return '2000,5000'
        case 'seeds': return '10'
        case 'sort': return 'size'
        case 'order': return 'asc'
        case 'page': return '2'
        case 'limit': return '25'
        default: return null
      }
    })

    const { result } = renderHook(() => useSearchURL())

    expect(result.current.searchState).toEqual({
      query: 'ubuntu',
      categories: ['2000', '5000'],
      minSeeders: 10,
      sortBy: 'size',
      sortOrder: 'asc',
      offset: 25, // (page 2 - 1) * 25 limit
      limit: 25
    })
  })

  it('updates URL when search parameters change', () => {
    const { result } = renderHook(() => useSearchURL())

    act(() => {
      result.current.updateURL({
        query: 'linux',
        categories: ['2000'],
        minSeeders: 5,
        sortBy: 'seeders',
        sortOrder: 'desc'
      })
    })

    expect(mockPush).toHaveBeenCalledWith('/?q=linux&cat=2000&seeds=5', { scroll: false })
  })

  it('uses replace for non-query changes', () => {
    const { result } = renderHook(() => useSearchURL())

    act(() => {
      result.current.updateURL({
        categories: ['5000'],
        sortBy: 'size'
      })
    })

    expect(mockReplace).toHaveBeenCalledWith('/?cat=5000&sort=size', { scroll: false })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('handles pagination correctly', () => {
    const { result } = renderHook(() => useSearchURL())

    act(() => {
      result.current.updateURL({
        query: 'test',
        offset: 50,
        limit: 25
      })
    })

    expect(mockPush).toHaveBeenCalledWith('/?q=test&limit=25&page=3', { scroll: false })
  })

  it('omits default values from URL', () => {
    const { result } = renderHook(() => useSearchURL())

    act(() => {
      result.current.updateURL({
        query: 'test',
        sortBy: 'seeders', // default value
        sortOrder: 'desc', // default value
        limit: 50 // default value
      })
    })

    expect(mockPush).toHaveBeenCalledWith('/?q=test', { scroll: false })
  })
})

describe('parseSearchParams', () => {
  it('parses URLSearchParams to SearchRequest format', () => {
    const params = new URLSearchParams('q=ubuntu&cat=2000,5000&seeds=10&sort=size&order=asc&page=2&limit=25')
    
    const result = parseSearchParams(params)

    expect(result).toEqual({
      query: 'ubuntu',
      categories: ['2000', '5000'],
      minSeeders: 10,
      sortBy: 'size',
      sortOrder: 'asc',
      offset: 25,
      limit: 25
    })
  })

  it('handles empty URLSearchParams', () => {
    const params = new URLSearchParams()
    
    const result = parseSearchParams(params)

    expect(result).toEqual({
      query: '',
      categories: [],
      sortBy: 'seeders',
      sortOrder: 'desc',
      offset: 0,
      limit: 50
    })
  })
})

describe('generateSearchURL', () => {
  it('generates URL from search parameters', () => {
    const params = {
      query: 'ubuntu',
      categories: ['2000', '5000'],
      minSeeders: 10,
      sortBy: 'size' as const,
      sortOrder: 'asc' as const,
      limit: 25,
      offset: 50
    }

    const url = generateSearchURL(params, '/search')

    expect(url).toBe('/search?q=ubuntu&cat=2000%2C5000&seeds=10&sort=size&order=asc&limit=25&page=3')
  })

  it('omits default values from generated URL', () => {
    const params = {
      query: 'test',
      sortBy: 'seeders' as const, // default
      sortOrder: 'desc' as const, // default
      limit: 50 // default
    }

    const url = generateSearchURL(params)

    expect(url).toBe('/?q=test')
  })

  it('returns base path when no parameters provided', () => {
    const url = generateSearchURL({})

    expect(url).toBe('/')
  })
})