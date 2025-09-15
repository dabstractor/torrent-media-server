import { render, screen, fireEvent } from '@testing-library/react'
import ServicesPage from '@/components/services/ServicesPage'
import { ServiceConfig, ServiceHealth } from '@/lib/types/services'
import { useServiceConfig } from '@/hooks/use-service-config'
import { useHealthCheck } from '@/hooks/use-health-check'

// Mock the custom hooks
jest.mock('@/hooks/use-service-config', () => ({
  useServiceConfig: jest.fn()
}))
jest.mock('@/hooks/use-health-check', () => ({
  useHealthCheck: jest.fn()
}))

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

// Mock window.location.reload
Object.defineProperty(window, 'location', {
  value: {
    reload: jest.fn()
  },
  writable: true
})

describe('ServicesPage', () => {
  const mockServices: ServiceConfig[] = [
    {
      id: 'qbittorrent',
      name: 'qBittorrent',
      description: 'BitTorrent client for downloading torrents',
      icon: 'Download',
      url: 'http://localhost:8080',
      healthEndpoint: '/',
      requiresAuth: false,
      category: 'download'
    },
    {
      id: 'plex',
      name: 'Plex',
      description: 'Media server for streaming content',
      icon: 'Play',
      url: 'http://localhost:32400',
      healthEndpoint: '/web/index.html',
      requiresAuth: false,
      category: 'media'
    }
  ]

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

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('test_ServicesPage_renders_main_heading', () => {
    (useServiceConfig as jest.Mock).mockReturnValue({
      config: mockServices,
      loading: false,
      error: null
    })

    ;(useHealthCheck as jest.Mock)
      .mockReturnValueOnce(mockHealthOnline)
      .mockReturnValueOnce(mockHealthOnline)

    render(<ServicesPage />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Services Dashboard')
    expect(screen.getByText('Monitor and access all configured services')).toBeInTheDocument()
  })

  it('test_ServicesPage_displays_loading_state', () => {
    (useServiceConfig as jest.Mock).mockReturnValue({
      config: [],
      loading: true,
      error: null
    })

    render(<ServicesPage />)

    expect(screen.getByText('Loading service configurations...')).toBeInTheDocument()
  })

  it('test_ServicesPage_displays_error_state', () => {
    (useServiceConfig as jest.Mock).mockReturnValue({
      config: [],
      loading: false,
      error: 'Failed to load configuration'
    })

    render(<ServicesPage />)

    expect(screen.getByText('Failed to load configuration')).toBeInTheDocument()
    expect(screen.getByText(/unable to load service configurations/i)).toBeInTheDocument()
  })

  it('test_ServicesPage_displays_service_stats', () => {
    (useServiceConfig as jest.Mock).mockReturnValue({
      config: mockServices,
      loading: false,
      error: null
    })

    ;(useHealthCheck as jest.Mock)
      .mockReturnValueOnce(mockHealthOnline)
      .mockReturnValueOnce(mockHealthOffline)

    render(<ServicesPage />)

    expect(screen.getByText('1 online')).toBeInTheDocument()
    expect(screen.getByText('1 offline')).toBeInTheDocument()
  })

  it('test_ServicesPage_displays_all_online_services', () => {
    (useServiceConfig as jest.Mock).mockReturnValue({
      config: mockServices,
      loading: false,
      error: null
    })

    ;(useHealthCheck as jest.Mock)
      .mockReturnValueOnce(mockHealthOnline)
      .mockReturnValueOnce(mockHealthOnline)

    render(<ServicesPage />)

    expect(screen.getByText('2 online')).toBeInTheDocument()
    expect(screen.queryByText(/offline/)).not.toBeInTheDocument()
  })

  it('test_ServicesPage_renders_service_grid', () => {
    (useServiceConfig as jest.Mock).mockReturnValue({
      config: mockServices,
      loading: false,
      error: null
    })

    ;(useHealthCheck as jest.Mock)
      .mockReturnValueOnce(mockHealthOnline)
      .mockReturnValueOnce(mockHealthOnline)

    render(<ServicesPage />)

    expect(screen.getByText('qBittorrent')).toBeInTheDocument()
    expect(screen.getByText('Plex')).toBeInTheDocument()
    expect(screen.getByText('2 services configured')).toBeInTheDocument()
  })

  it('test_ServicesPage_refresh_button_triggers_reload', () => {
    (useServiceConfig as jest.Mock).mockReturnValue({
      config: mockServices,
      loading: false,
      error: null
    })

    ;(useHealthCheck as jest.Mock)
      .mockReturnValueOnce(mockHealthOnline)
      .mockReturnValueOnce(mockHealthOnline)

    render(<ServicesPage />)

    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    fireEvent.click(refreshButton)

    expect(window.location.reload).toHaveBeenCalled()
  })

  it('test_ServicesPage_displays_empty_state', () => {
    (useServiceConfig as jest.Mock).mockReturnValue({
      config: [],
      loading: false,
      error: null
    })

    render(<ServicesPage />)

    expect(screen.getByText('No services configured')).toBeInTheDocument()
    expect(screen.getByText(/no services are currently configured/i)).toBeInTheDocument()
  })

  it('test_ServicesPage_shows_service_categories', () => {
    (useServiceConfig as jest.Mock).mockReturnValue({
      config: mockServices,
      loading: false,
      error: null
    })

    ;(useHealthCheck as jest.Mock)
      .mockReturnValueOnce(mockHealthOnline)
      .mockReturnValueOnce(mockHealthOnline)

    render(<ServicesPage />)

    expect(screen.getByText('download')).toBeInTheDocument()
    expect(screen.getByText('media')).toBeInTheDocument()
  })

  it('test_ServicesPage_displays_security_information', () => {
    (useServiceConfig as jest.Mock).mockReturnValue({
      config: mockServices,
      loading: false,
      error: null
    })

    ;(useHealthCheck as jest.Mock)
      .mockReturnValueOnce(mockHealthOnline)
      .mockReturnValueOnce(mockHealthOnline)

    render(<ServicesPage />)

    expect(screen.getByText('Security Notes')).toBeInTheDocument()
    expect(screen.getByText(/qbittorrent is vpn-isolated/i)).toBeInTheDocument()
    expect(screen.getByText('Health Monitoring')).toBeInTheDocument()
    expect(screen.getByText(/status checks run every 30 seconds/i)).toBeInTheDocument()
  })
})