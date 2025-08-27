import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import TorrentCard from '@/components/search/TorrentCard'
import type { TorrentResult } from '@/lib/types'

const mockTorrent: TorrentResult = {
  id: 'test-torrent-123',
  title: 'Ubuntu 22.04.3 Desktop amd64.iso',
  size: 4294967296, // 4GB
  sizeText: '4.0 GB',
  seeders: 150,
  leechers: 25,
  category: 'PC/Software',
  indexer: 'Test Indexer',
  downloadUrl: 'https://example.com/download/ubuntu.torrent',
  magnetUrl: 'magnet:?xt=urn:btih:test123',
  publishDate: '2023-08-10T12:00:00Z'
}

const mockOnAdd = jest.fn()

describe('TorrentCard', () => {
  beforeEach(() => {
    mockOnAdd.mockClear()
  })

  it('renders torrent information correctly', () => {
    render(<TorrentCard torrent={mockTorrent} onAdd={mockOnAdd} />)

    expect(screen.getByText('Ubuntu 22.04.3 Desktop amd64.iso')).toBeInTheDocument()
    expect(screen.getByText('4.0 GB')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByText('Test Indexer')).toBeInTheDocument()
    expect(screen.getByText('PC/Software')).toBeInTheDocument()
  })

  it('displays formatted publish date', () => {
    render(<TorrentCard torrent={mockTorrent} onAdd={mockOnAdd} />)
    
    expect(screen.getByText(/Published: Aug 10, 2023/)).toBeInTheDocument()
  })

  it('shows correct seeder color based on count', () => {
    const { rerender } = render(<TorrentCard torrent={mockTorrent} onAdd={mockOnAdd} />)
    
    // High seeder count (150) should be green
    expect(screen.getByText('150')).toHaveClass('text-green-600')

    // Test low seeder count (red)
    const lowSeederTorrent = { ...mockTorrent, seeders: 0 }
    rerender(<TorrentCard torrent={lowSeederTorrent} onAdd={mockOnAdd} />)
    expect(screen.getByText('0')).toHaveClass('text-red-600')

    // Test medium seeder count (yellow)
    const mediumSeederTorrent = { ...mockTorrent, seeders: 15 }
    rerender(<TorrentCard torrent={mediumSeederTorrent} onAdd={mockOnAdd} />)
    expect(screen.getByText('15')).toHaveClass('text-yellow-600')
  })

  it('handles click on Add button', async () => {
    render(<TorrentCard torrent={mockTorrent} onAdd={mockOnAdd} />)

    const addButton = screen.getByRole('button', { name: /add/i })
    fireEvent.click(addButton)

    expect(mockOnAdd).toHaveBeenCalledWith(mockTorrent)
  })

  it('shows loading state when adding torrent', () => {
    render(<TorrentCard torrent={mockTorrent} onAdd={mockOnAdd} isAdding={true} />)

    expect(screen.getByText(/adding/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /adding/i })).toBeDisabled()
  })

  it('renders magnet link when available', () => {
    render(<TorrentCard torrent={mockTorrent} onAdd={mockOnAdd} />)

    const magnetLink = screen.getByRole('link', { name: /magnet/i })
    expect(magnetLink).toHaveAttribute('href', mockTorrent.magnetUrl)
  })

  it('renders download link', () => {
    render(<TorrentCard torrent={mockTorrent} onAdd={mockOnAdd} />)

    const downloadLink = screen.getByRole('link', { name: /\.torrent/i })
    expect(downloadLink).toHaveAttribute('href', mockTorrent.downloadUrl)
    expect(downloadLink).toHaveAttribute('target', '_blank')
    expect(downloadLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('handles torrent without magnet link', () => {
    const torrentWithoutMagnet = { ...mockTorrent, magnetUrl: undefined }
    render(<TorrentCard torrent={torrentWithoutMagnet} onAdd={mockOnAdd} />)

    expect(screen.queryByRole('link', { name: /magnet/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /\.torrent/i })).toBeInTheDocument()
  })

  it('applies correct category colors', () => {
    const { rerender } = render(<TorrentCard torrent={mockTorrent} onAdd={mockOnAdd} />)
    
    // Test movie category
    const movieTorrent = { ...mockTorrent, category: 'Movie HD' }
    rerender(<TorrentCard torrent={movieTorrent} onAdd={mockOnAdd} />)
    expect(screen.getByText('Movie HD')).toHaveClass('bg-blue-100', 'text-blue-800')

    // Test TV category
    const tvTorrent = { ...mockTorrent, category: 'TV Show' }
    rerender(<TorrentCard torrent={tvTorrent} onAdd={mockOnAdd} />)
    expect(screen.getByText('TV Show')).toHaveClass('bg-green-100', 'text-green-800')

    // Test music category
    const musicTorrent = { ...mockTorrent, category: 'Music' }
    rerender(<TorrentCard torrent={musicTorrent} onAdd={mockOnAdd} />)
    expect(screen.getByText('Music')).toHaveClass('bg-purple-100', 'text-purple-800')
  })

  it('truncates long titles appropriately', () => {
    const longTitleTorrent = {
      ...mockTorrent,
      title: 'Very Long Torrent Title That Should Be Truncated Because It Is Too Long For Normal Display'
    }
    
    render(<TorrentCard torrent={longTitleTorrent} onAdd={mockOnAdd} />)
    
    const titleElement = screen.getByText(longTitleTorrent.title)
    expect(titleElement).toHaveClass('line-clamp-2')
  })

  it('has proper accessibility attributes', () => {
    render(<TorrentCard torrent={mockTorrent} onAdd={mockOnAdd} />)

    const addButton = screen.getByRole('button', { name: /add/i })
    expect(addButton).toHaveAttribute('title', 'Add to downloads')

    const magnetLink = screen.getByRole('link', { name: /magnet/i })
    expect(magnetLink).toHaveAttribute('title', 'Open magnet link')

    const downloadLink = screen.getByRole('link', { name: /\.torrent/i })
    expect(downloadLink).toHaveAttribute('title', 'Download torrent file')
  })

  it('displays truncated ID correctly', () => {
    render(<TorrentCard torrent={mockTorrent} onAdd={mockOnAdd} />)
    
    expect(screen.getByText('ID: test-tor...')).toBeInTheDocument()
  })
})