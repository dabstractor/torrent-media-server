import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import SearchForm from '@/components/search/SearchForm'
import type { SearchRequest } from '@/lib/api/search'

// Create stable mock objects to prevent infinite re-renders
const mockSearchParams = {
  get: jest.fn(() => null),
  getAll: jest.fn(() => [])
}

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  refresh: jest.fn()
}

// Mock Next.js router hooks
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(() => mockSearchParams),
  useRouter: jest.fn(() => mockRouter),
  usePathname: jest.fn(() => '/')
}))

const mockOnSearch = jest.fn()

describe('SearchForm', () => {
  beforeEach(() => {
    mockOnSearch.mockClear()
    mockSearchParams.get.mockReturnValue(null)
    mockSearchParams.getAll.mockReturnValue([])
    mockRouter.push.mockClear()
    mockRouter.replace.mockClear()
  })

  it('renders search form elements correctly', () => {
    render(<SearchForm onSearch={mockOnSearch} />)

    expect(screen.getByPlaceholderText('Search torrents...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Min Seeders:')).toBeInTheDocument()
    expect(screen.getByLabelText('Sort by:')).toBeInTheDocument()
    expect(screen.getByLabelText('Order:')).toBeInTheDocument()
  })

  it('displays category filter buttons', () => {
    render(<SearchForm onSearch={mockOnSearch} />)

    expect(screen.getByRole('button', { name: 'Movies' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'TV Shows' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Music' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Books' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'PC/Software' })).toBeInTheDocument()
  })

  it('submits search with basic query', async () => {
    const user = userEvent.setup()
    render(<SearchForm onSearch={mockOnSearch} />)

    const searchInput = screen.getByPlaceholderText('Search torrents...')
    const searchButton = screen.getByRole('button', { name: /search/i })

    await user.type(searchInput, 'ubuntu linux')
    await user.click(searchButton)

    expect(mockOnSearch).toHaveBeenCalledWith({
      query: 'ubuntu linux',
      categories: undefined,
      minSeeders: undefined,
      sortBy: 'seeders',
      sortOrder: 'desc',
      limit: 50,
      offset: 0
    })
  })

  it('prevents submission with empty query', async () => {
    const user = userEvent.setup()
    render(<SearchForm onSearch={mockOnSearch} />)

    const searchButton = screen.getByRole('button', { name: /search/i })
    await user.click(searchButton)

    expect(mockOnSearch).not.toHaveBeenCalled()
  })

  it('toggles category selection', async () => {
    const user = userEvent.setup()
    render(<SearchForm onSearch={mockOnSearch} />)

    const searchInput = screen.getByPlaceholderText('Search torrents...')
    const moviesButton = screen.getByRole('button', { name: 'Movies' })
    const searchButton = screen.getByRole('button', { name: /search/i })

    await user.type(searchInput, 'test')
    await user.click(moviesButton)
    
    // Movies button should now be selected (primary style)
    expect(moviesButton).toHaveClass('btn-primary')

    await user.click(searchButton)

    expect(mockOnSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'test',
        categories: ['2000']
      })
    )
  })

  it('handles multiple category selection', async () => {
    const user = userEvent.setup()
    render(<SearchForm onSearch={mockOnSearch} />)

    const searchInput = screen.getByPlaceholderText('Search torrents...')
    const moviesButton = screen.getByRole('button', { name: 'Movies' })
    const tvButton = screen.getByRole('button', { name: 'TV Shows' })
    const searchButton = screen.getByRole('button', { name: /search/i })

    await user.type(searchInput, 'test')
    await user.click(moviesButton)
    await user.click(tvButton)
    await user.click(searchButton)

    expect(mockOnSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'test',
        categories: ['2000', '5000']
      })
    )
  })

  it('deselects categories when clicked again', async () => {
    const user = userEvent.setup()
    render(<SearchForm onSearch={mockOnSearch} />)

    const searchInput = screen.getByPlaceholderText('Search torrents...')
    const moviesButton = screen.getByRole('button', { name: 'Movies' })
    const searchButton = screen.getByRole('button', { name: /search/i })

    await user.type(searchInput, 'test')
    await user.click(moviesButton)
    await user.click(moviesButton) // Click again to deselect
    
    expect(moviesButton).toHaveClass('btn-secondary')

    await user.click(searchButton)

    expect(mockOnSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'test',
        categories: undefined
      })
    )
  })

  it('updates minimum seeders filter', async () => {
    const user = userEvent.setup()
    render(<SearchForm onSearch={mockOnSearch} />)

    const searchInput = screen.getByPlaceholderText('Search torrents...')
    const seedersInput = screen.getByLabelText('Min Seeders:')
    const searchButton = screen.getByRole('button', { name: /search/i })

    await user.type(searchInput, 'test')
    await user.clear(seedersInput)
    await user.type(seedersInput, '10')
    await user.click(searchButton)

    expect(mockOnSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'test',
        minSeeders: 10
      })
    )
  })

  it('ignores zero minimum seeders', async () => {
    const user = userEvent.setup()
    render(<SearchForm onSearch={mockOnSearch} />)

    const searchInput = screen.getByPlaceholderText('Search torrents...')
    const seedersInput = screen.getByLabelText('Min Seeders:')
    const searchButton = screen.getByRole('button', { name: /search/i })

    await user.type(searchInput, 'test')
    await user.clear(seedersInput)
    await user.type(seedersInput, '0')
    await user.click(searchButton)

    expect(mockOnSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'test',
        minSeeders: undefined
      })
    )
  })

  it('updates sort options', async () => {
    const user = userEvent.setup()
    render(<SearchForm onSearch={mockOnSearch} />)

    const searchInput = screen.getByPlaceholderText('Search torrents...')
    const sortBySelect = screen.getByLabelText('Sort by:')
    const sortOrderSelect = screen.getByLabelText('Order:')
    const searchButton = screen.getByRole('button', { name: /search/i })

    await user.type(searchInput, 'test')
    await user.selectOptions(sortBySelect, 'size')
    await user.selectOptions(sortOrderSelect, 'asc')
    await user.click(searchButton)

    expect(mockOnSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'test',
        sortBy: 'size',
        sortOrder: 'asc'
      })
    )
  })

  it('disables form when loading', async () => {
    render(<SearchForm onSearch={mockOnSearch} isLoading={true} />)

    const searchInput = screen.getByPlaceholderText('Search torrents...')
    const searchButton = screen.getByRole('button', { name: /searching/i })
    const moviesButton = screen.getByRole('button', { name: 'Movies' })
    const seedersInput = screen.getByLabelText('Min Seeders:')

    expect(searchInput).toBeDisabled()
    expect(searchButton).toBeDisabled()
    expect(moviesButton).toBeDisabled()
    expect(seedersInput).toBeDisabled()
    expect(searchButton).toHaveTextContent('Searching...')
  })

  it('trims whitespace from search query', async () => {
    const user = userEvent.setup()
    render(<SearchForm onSearch={mockOnSearch} />)

    const searchInput = screen.getByPlaceholderText('Search torrents...')
    const searchButton = screen.getByRole('button', { name: /search/i })

    await user.type(searchInput, '  ubuntu linux  ')
    await user.click(searchButton)

    expect(mockOnSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'ubuntu linux'
      })
    )
  })

  it('has proper accessibility attributes', () => {
    render(<SearchForm onSearch={mockOnSearch} />)

    const searchInput = screen.getByPlaceholderText('Search torrents...')
    expect(searchInput).toHaveFocus()

    const seedersInput = screen.getByLabelText('Min Seeders:')
    expect(seedersInput).toHaveAttribute('id', 'minSeeders')

    const sortBySelect = screen.getByLabelText('Sort by:')
    expect(sortBySelect).toHaveAttribute('id', 'sortBy')

    const sortOrderSelect = screen.getByLabelText('Order:')
    expect(sortOrderSelect).toHaveAttribute('id', 'sortOrder')
  })

  it('submits form on Enter key press', async () => {
    const user = userEvent.setup()
    render(<SearchForm onSearch={mockOnSearch} />)

    const searchInput = screen.getByPlaceholderText('Search torrents...')
    await user.type(searchInput, 'test query')
    await user.keyboard('{Enter}')

    expect(mockOnSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'test query'
      })
    )
  })
})