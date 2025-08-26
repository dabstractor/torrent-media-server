import { NextRequest } from 'next/server';

// Mock the environment variables for testing
process.env.PROWLARR_URL = 'http://prowlarr:9696';
process.env.PROWLARR_API_KEY = 'test-api-key';
process.env.QBITTORRENT_URL = 'http://qbittorrent:8080';
process.env.QBITTORRENT_USER = 'admin';
process.env.QBITTORRENT_PASSWORD = 'admin';

// Mock fetch globally
global.fetch = jest.fn();

describe('API Proxy Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Prowlarr Proxy', () => {
    it('should proxy GET requests to Prowlarr', async () => {
      // Mock the fetch response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValueOnce(JSON.stringify({ results: [] })),
        headers: new Map([['Content-Type', 'application/json']]),
      });

      // Import the route handler dynamically
      const { GET } = await import('@/app/api/prowlarr/[...path]/route');
      
      // Create a mock request
      const request = new NextRequest('http://localhost:3000/api/prowlarr/search?query=test');
      
      // Call the handler
      const response = await GET(request, { params: { path: ['search'] } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toEqual({ results: [] });
      expect(global.fetch).toHaveBeenCalledWith(
        'http://prowlarr:9696/api/v1/search?query=test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'X-Api-Key': 'test-api-key',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should handle Prowlarr API errors', async () => {
      // Mock the fetch to throw an error
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      // Import the route handler dynamically
      const { GET } = await import('@/app/api/prowlarr/[...path]/route');
      
      // Create a mock request
      const request = new NextRequest('http://localhost:3000/api/prowlarr/search?query=test');
      
      // Call the handler
      const response = await GET(request, { params: { path: ['search'] } });
      const data = await response.json();
      
      expect(response.status).toBe(503);
      expect(data.error).toBe('Service unavailable');
    });
  });

  describe('qBittorrent Proxy', () => {
    it('should proxy requests to qBittorrent with authentication', async () => {
      // Mock the login response
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Map([['Set-Cookie', 'SID=abc123; Path=/; HttpOnly']]),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: jest.fn().mockResolvedValueOnce(JSON.stringify({ torrents: [] })),
          headers: new Map([['Content-Type', 'application/json']]),
        });

      // Import the route handler dynamically
      const { GET } = await import('@/app/api/qbittorrent/[...path]/route');
      
      // Create a mock request
      const request = new NextRequest('http://localhost:3000/api/qbittorrent/torrents/info');
      
      // Call the handler
      const response = await GET(request, { params: { path: ['torrents', 'info'] } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toEqual({ torrents: [] });
    });

    it('should handle qBittorrent API errors', async () => {
      // Mock the fetch to throw an error
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      // Import the route handler dynamically
      const { GET } = await import('@/app/api/qbittorrent/[...path]/route');
      
      // Create a mock request
      const request = new NextRequest('http://localhost:3000/api/qbittorrent/torrents/info');
      
      // Call the handler
      const response = await GET(request, { params: { path: ['torrents', 'info'] } });
      const data = await response.json();
      
      expect(response.status).toBe(503);
      expect(data.error).toBe('Service unavailable');
    });
  });
});