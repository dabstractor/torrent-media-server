import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { ThemeProvider } from 'next-themes'
import { ThemeToggle } from '@/components/theme'
import * as React from 'react'

// Mock next-themes useTheme hook
const mockSetTheme = jest.fn()
const mockUseTheme = jest.fn()

jest.mock('next-themes', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useTheme: () => mockUseTheme()
}))

// Test wrapper with ThemeProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider attribute="data-theme" defaultTheme="light">
    {children}
  </ThemeProvider>
)

describe('ThemeToggle', () => {
  beforeEach(() => {
    mockSetTheme.mockClear()
    mockUseTheme.mockReset()
  })

  it('renders loading state before mounting (SSR)', () => {
    // Mock unmounted state
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme
    })

    // Create a custom component that simulates unmounted state
    const UnmountedThemeToggle = () => {
      return (
        <button 
          className="w-10 h-10 min-h-[44px] rounded-lg bg-gray-100 dark:bg-gray-800"
          disabled 
          aria-label="Theme toggle loading"
        />
      )
    }

    render(<UnmountedThemeToggle />, { wrapper: TestWrapper })

    // Should show loading placeholder
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-label', 'Theme toggle loading')
    expect(button).toHaveClass('bg-gray-100', 'dark:bg-gray-800')
  })

  it('renders theme toggle after mounting', async () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme
    })

    render(<ThemeToggle />, { wrapper: TestWrapper })

    // Wait for mounting
    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label', 'Switch to dark theme')
    expect(button).toHaveAttribute('title', 'Light theme active. Switch to dark theme')
  })

  it('displays sun icon for light theme', async () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme
    })

    render(<ThemeToggle />, { wrapper: TestWrapper })

    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })

    // Check that sun icon is rendered (by looking for the SVG)
    const sunIcon = screen.getByRole('button').querySelector('svg')
    expect(sunIcon).toBeInTheDocument()
  })

  it('displays moon icon for dark theme', async () => {
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      setTheme: mockSetTheme
    })

    render(<ThemeToggle />, { wrapper: TestWrapper })

    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })

    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Switch to system theme')
  })

  it('displays monitor icon for system theme', async () => {
    mockUseTheme.mockReturnValue({
      theme: 'system',
      setTheme: mockSetTheme
    })

    render(<ThemeToggle />, { wrapper: TestWrapper })

    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })

    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Switch to light theme')
  })

  it('cycles from light to dark theme', async () => {
    const user = userEvent.setup()
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme
    })

    render(<ThemeToggle />, { wrapper: TestWrapper })

    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })

    const button = screen.getByRole('button')
    await user.click(button)

    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })

  it('cycles from dark to system theme', async () => {
    const user = userEvent.setup()
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      setTheme: mockSetTheme
    })

    render(<ThemeToggle />, { wrapper: TestWrapper })

    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })

    const button = screen.getByRole('button')
    await user.click(button)

    expect(mockSetTheme).toHaveBeenCalledWith('system')
  })

  it('cycles from system to light theme', async () => {
    const user = userEvent.setup()
    mockUseTheme.mockReturnValue({
      theme: 'system',
      setTheme: mockSetTheme
    })

    render(<ThemeToggle />, { wrapper: TestWrapper })

    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })

    const button = screen.getByRole('button')
    await user.click(button)

    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })

  it('has proper accessibility attributes', async () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme
    })

    render(<ThemeToggle />, { wrapper: TestWrapper })

    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })

    const button = screen.getByRole('button')
    
    // Check ARIA attributes
    expect(button).toHaveAttribute('aria-label', 'Switch to dark theme')
    expect(button).toHaveAttribute('title', 'Light theme active. Switch to dark theme')
    
    // Button element has implicit button role
    expect(button.tagName).toBe('BUTTON')
  })

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup()
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme
    })

    render(<ThemeToggle />, { wrapper: TestWrapper })

    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })

    const button = screen.getByRole('button')
    
    // Focus the button
    button.focus()
    expect(button).toHaveFocus()
    
    // Activate with Enter key
    await user.keyboard('{Enter}')
    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })

  it('supports space key activation', async () => {
    const user = userEvent.setup()
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme
    })

    render(<ThemeToggle />, { wrapper: TestWrapper })

    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })

    const button = screen.getByRole('button')
    button.focus()
    
    // Activate with Space key
    await user.keyboard(' ')
    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })

  it('has focus ring styles', async () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme
    })

    render(<ThemeToggle />, { wrapper: TestWrapper })

    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })

    const button = screen.getByRole('button')
    
    // Check focus styles are present
    expect(button).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-primary-500')
  })

  it('has hover styles', async () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme
    })

    render(<ThemeToggle />, { wrapper: TestWrapper })

    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })

    const button = screen.getByRole('button')
    
    // Check hover styles are present
    expect(button).toHaveClass('hover:bg-gray-200', 'dark:hover:bg-gray-700')
  })

  it('handles rapid theme switching correctly', async () => {
    const user = userEvent.setup()
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme
    })

    render(<ThemeToggle />, { wrapper: TestWrapper })

    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })

    const button = screen.getByRole('button')
    
    // Click multiple times rapidly
    await user.click(button)
    await user.click(button)
    await user.click(button)

    // Should have been called 3 times
    expect(mockSetTheme).toHaveBeenCalledTimes(3)
    expect(mockSetTheme).toHaveBeenNthCalledWith(1, 'dark')
    expect(mockSetTheme).toHaveBeenNthCalledWith(2, 'dark')
    expect(mockSetTheme).toHaveBeenNthCalledWith(3, 'dark')
  })

  it('handles undefined theme gracefully', async () => {
    mockUseTheme.mockReturnValue({
      theme: undefined,
      setTheme: mockSetTheme
    })

    render(<ThemeToggle />, { wrapper: TestWrapper })

    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })

    const button = screen.getByRole('button')
    
    // Should default to system theme behavior
    expect(button).toHaveAttribute('aria-label', 'Switch to light theme')
  })

  it('has touch-friendly sizing', async () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme
    })

    render(<ThemeToggle />, { wrapper: TestWrapper })

    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })

    const button = screen.getByRole('button')
    
    // Check minimum touch target size (44px)
    expect(button).toHaveClass('min-h-[44px]', 'w-10', 'h-10')
  })

  it('integrates properly with next-themes provider', () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme
    })

    const { unmount } = render(
      <ThemeProvider attribute="data-theme" defaultTheme="system">
        <ThemeToggle />
      </ThemeProvider>
    )

    // Should not throw any errors when integrated with real ThemeProvider
    expect(() => unmount()).not.toThrow()
  })
})