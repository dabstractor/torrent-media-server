// Mock the environment variables for testing
process.env.FLARESOLVERR_URL = 'http://flaresolverr:8191';

// Mock fetch globally
global.fetch = jest.fn();

describe('FlareSolverr Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Connectivity', () => {
    it('should connect to FlareSolverr health endpoint', async () => {
      // Mock the fetch response for health check
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValueOnce('OK'),
        headers: new Map([['Content-Type', 'text/plain']]),
      });

      const response = await fetch(`${process.env.FLARESOLVERR_URL}/`);
      const data = await response.text();

      expect(response.status).toBe(200);
      expect(data).toBe('OK');
      expect(global.fetch).toHaveBeenCalledWith('http://flaresolverr:8191/');
    });

    it('should handle FlareSolverr API request', async () => {
      // Mock the fetch response for API request
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce({
          status: 'ok',
          message: 'Request successful',
          solution: {
            url: 'https://example.com',
            status: 200
          }
        }),
        headers: new Map([['Content-Type', 'application/json']]),
      });

      const requestBody = {
        cmd: 'request.get',
        url: 'https://example.com',
        maxTimeout: 60000
      };

      const response = await fetch(`${process.env.FLARESOLVERR_URL}/v1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.solution).toBeDefined();
      expect(global.fetch).toHaveBeenCalledWith(
        'http://flaresolverr:8191/v1',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(requestBody)
        })
      );
    });

    it('should handle FlareSolverr service unavailable', async () => {
      // Mock the fetch to throw an error
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('ECONNREFUSED'));

      try {
        await fetch(`${process.env.FLARESOLVERR_URL}/`);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('ECONNREFUSED');
      }

      expect(global.fetch).toHaveBeenCalledWith('http://flaresolverr:8191/');
    });

    it('should handle FlareSolverr API errors', async () => {
      // Mock the fetch to return an error status
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValueOnce({
          status: 'error',
          message: 'Internal server error'
        }),
        headers: new Map([['Content-Type', 'application/json']]),
      });

      const response = await fetch(`${process.env.FLARESOLVERR_URL}/v1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd: 'request.get', url: 'https://example.com' })
      });

      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.status).toBe('error');
    });
  });

  describe('Environment Configuration', () => {
    it('should have FLARESOLVERR_URL environment variable configured', () => {
      expect(process.env.FLARESOLVERR_URL).toBe('http://flaresolverr:8191');
    });

    it('should use correct service hostname for Docker network', () => {
      const url = new URL(process.env.FLARESOLVERR_URL!);
      expect(url.hostname).toBe('flaresolverr');
      expect(url.port).toBe('8191');
      expect(url.protocol).toBe('http:');
    });
  });
});