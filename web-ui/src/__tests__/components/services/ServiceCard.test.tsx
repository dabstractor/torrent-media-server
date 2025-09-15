import { render, screen } from '@testing-library/react'
import ServiceCard from '@/components/services/ServiceCard'
import { ServiceConfig, ServiceHealth } from '@/lib/types/services'

// Mock Next.js Link component
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>
  }
  MockLink.displayName = 'MockLink'
  return MockLink
})

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Download: () => <div data-testid="download-icon" />,
  Search: () => <div data-testid="search-icon" />,
  Play: () => <div data-testid="play-icon" />,
}))

describe('ServiceCard', () => {
  const mockService: ServiceConfig = {
    id: 'qbittorrent',
    name: 'qBittorrent',
    description: 'BitTorrent client for downloading torrents',
    icon: 'Download',
    url: 'http://localhost:8080',
    healthEndpoint: '/',
    requiresAuth: false,
    category: 'download'
  }

  const mockHealthOnline: ServiceHealth = {
    available: true,
    lastCheck: new Date('2023-01-01T12:00:00Z'),
    status: 200,
    responseTime: 150
  }

  const mockHealthOffline: ServiceHealth = {
    available: false,
    lastCheck: new Date('2023-01-01T12:00:00Z'),
    error: 'Connection timeout'
  }

  it('displays service name and description', () => {
    render(
      <ServiceCard
        service={mockService}
        health={mockHealthOnline}
        loading={false}
      />
    )

    expect(screen.getByText('qBittorrent')).toBeInTheDocument()
    expect(screen.getByText('BitTorrent client for downloading torrents')).toBeInTheDocument()
  })

  it('displays service category badge', () => {
    render(
      <ServiceCard
        service={mockService}
        health={mockHealthOnline}
        loading={false}
      />
    )

    expect(screen.getByText('download')).toBeInTheDocument()
  })

  it('shows online status for available service', () => {
    render(
      <ServiceCard
        service={mockService}
        health={mockHealthOnline}
        loading={false}
      />
    )

    expect(screen.getByText('Online')).toBeInTheDocument()
    expect(screen.getByText('150ms (200)')).toBeInTheDocument()
  })

  it('shows offline status for unavailable service', () => {
    render(
      <ServiceCard
        service={mockService}
        health={mockHealthOffline}
        loading={false}
      />
    )

    expect(screen.getByText('Offline')).toBeInTheDocument()
    expect(screen.getByText('Connection timeout')).toBeInTheDocument()
  })

  it('displays service metadata correctly', () => {
    render(
      <ServiceCard
        service={mockService}
        health={mockHealthOnline}
        loading={false}
      />
    )

    expect(screen.getByText('localhost')).toBeInTheDocument()
    expect(screen.getByText('No Auth')).toBeInTheDocument()
  })

  it('displays "Requires Auth" for auth-required services', () => {
    const serviceWithAuth = {
      ...mockService,
      requiresAuth: true
    }

    render(
      <ServiceCard
        service={serviceWithAuth}
        health={mockHealthOnline}
        loading={false}
      />
    )

    expect(screen.getByText('Requires Auth')).toBeInTheDocument()
  })

  it('creates external link with correct attributes', () => {
    render(
      <ServiceCard
        service={mockService}
        health={mockHealthOnline}
        loading={false}
      />
    )

    const link = screen.getByRole('link', { name: /open qbittorrent/i })
    expect(link).toHaveAttribute('href', 'http://localhost:8080')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('disables link for offline service', () => {
    render(
      <ServiceCard
        service={mockService}
        health={mockHealthOffline}
        loading={false}
      />
    )

    const link = screen.getByRole('link', { name: /open qbittorrent/i })
    expect(link).toHaveClass('opacity-50', 'cursor-not-allowed')
    expect(link).toHaveAttribute('aria-disabled', 'true')
  })

  it('shows loading skeleton when loading', () => {
    const { container } = render(
      <ServiceCard
        service={mockService}
        health={mockHealthOnline}
        loading={true}
      />
    )

    // Check for loading skeleton elements
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    expect(container.querySelectorAll('.bg-gray-200')).toHaveLength(4) // 4 skeleton elements
  })

  it('displays different category colors', () => {
    const mediaService = {
      ...mockService,
      category: 'media' as const
    }

    render(
      <ServiceCard
        service={mediaService}
        health={mockHealthOnline}
        loading={false}
      />
    )

    const categoryBadge = screen.getByText('media')
    expect(categoryBadge).toHaveClass('bg-blue-100', 'text-blue-800')
  })

  it('handles missing health data gracefully', () => {
    const emptyHealth: ServiceHealth = {
      available: false,
      lastCheck: null
    }

    render(
      <ServiceCard
        service={mockService}
        health={emptyHealth}
        loading={false}
      />
    )

    expect(screen.getByText('Offline')).toBeInTheDocument()
    expect(screen.getByText('Never')).toBeInTheDocument()
  })
})