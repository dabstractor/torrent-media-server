import '@testing-library/jest-dom'

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock EventSource for SSE tests
global.EventSource = jest.fn(() => ({
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}))

// Mock fetch globally
global.fetch = jest.fn()

// Reset all mocks between tests
beforeEach(() => {
  jest.clearAllMocks()
})