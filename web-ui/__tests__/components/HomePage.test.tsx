import { render, screen } from '@testing-library/react'
import HomePage from '@/app/page'

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>
  }
})

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon" />,
  Download: () => <div data-testid="download-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
}))

describe('HomePage', () => {
  it('renders the main heading', () => {
    render(<HomePage />)
    
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('Torrent Manager')
  })

  it('renders navigation cards with correct links', () => {
    render(<HomePage />)
    
    // Check for navigation links
    const searchLink = screen.getByRole('link', { name: /search/i })
    const downloadsLink = screen.getByRole('link', { name: /downloads/i })
    const settingsLink = screen.getByRole('link', { name: /settings/i })
    
    expect(searchLink).toHaveAttribute('href', '/search')
    expect(downloadsLink).toHaveAttribute('href', '/downloads')
    expect(settingsLink).toHaveAttribute('href', '/settings')
  })

  it('displays navigation card descriptions', () => {
    render(<HomePage />)
    
    expect(screen.getByText('Find and add torrents')).toBeInTheDocument()
    expect(screen.getByText('Manage active downloads')).toBeInTheDocument()
    expect(screen.getByText('Configure preferences')).toBeInTheDocument()
  })

  it('renders icons for each navigation option', () => {
    render(<HomePage />)
    
    expect(screen.getByTestId('search-icon')).toBeInTheDocument()
    expect(screen.getByTestId('download-icon')).toBeInTheDocument()
    expect(screen.getByTestId('settings-icon')).toBeInTheDocument()
  })
})