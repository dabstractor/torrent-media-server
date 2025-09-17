import { render, screen } from '@testing-library/react'
import ServiceCard from '@/components/services/ServiceCard'
import { ServiceConfig, ServiceHealth } from '@/lib/types/services'

// Mock window.location for testing dynamic URLs
const mockWindowLocation = {
  protocol: 'http:',
  hostname: '192.168.1.100',
  port: '',
  pathname: '/'
};

// @ts-ignore
delete window.location;
// @ts-ignore
window.location = mockWindowLocation;

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

    expect(screen.getByText('192.168.1.100')).toBeInTheDocument()
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
    expect(link).toHaveAttribute('href', 'http://192.168.1.100:8080/')
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
    expect(link).toHaveClass('cursor-not-allowed')
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

  it('generates correct dynamic URL for different hostnames', () => {
    // @ts-ignore
    window.location.hostname = '10.0.0.5';

    render(
      <ServiceCard
        service={mockService}
        health={mockHealthOnline}
        loading={false}
      />
    )

    const link = screen.getByRole('link', { name: /open qbittorrent/i });
    expect(link).toHaveAttribute('href', 'http://10.0.0.5:8080/');

    // Reset to original value
    // @ts-ignore
    window.location.hostname = '192.168.1.100';
  });

  it('falls back to original URL when URL parsing fails', () => {
    const serviceWithInvalidUrl = {
      ...mockService,
      url: 'invalid-url'
    };

    // Mock console.warn to avoid test output pollution
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    render(
      <ServiceCard
        service={serviceWithInvalidUrl}
        health={mockHealthOnline}
        loading={false}
      />
    );

    const link = screen.getByRole('link', { name: /open qbittorrent/i });
    expect(link).toHaveAttribute('href', 'invalid-url');

    // Restore console.warn
    consoleWarnSpy.mockRestore();
  });

  it('generates correct dynamic URL with HTTPS protocol', () => {
    // @ts-ignore
    window.location.protocol = 'https:';

    render(
      <ServiceCard
        service={mockService}
        health={mockHealthOnline}
        loading={false}
      />
    );

    const link = screen.getByRole('link', { name: /open qbittorrent/i });
    expect(link).toHaveAttribute('href', 'https://192.168.1.100:8080/');

    // Reset to original value
    // @ts-ignore
    window.location.protocol = 'http:';
  });
});