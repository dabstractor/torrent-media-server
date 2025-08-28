import type { QBPreferences } from '@/lib/types/settings';

class QBittorrentClient {
  private sid: string | null = null;
  private readonly baseUrl: string;

  constructor(baseUrl: string = 'http://qbittorrent:8080') {
    this.baseUrl = baseUrl;
  }

  private async request(
    path: string,
    options: RequestInit = {},
    isLogin: boolean = false
  ): Promise<Response> {
    const url = `${this.baseUrl}/api/v2/${path}`;
    const headers = new Headers(options.headers);

    if (this.sid && !isLogin) {
      headers.set('Cookie', `SID=${this.sid}`);
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    return fetch(url, config);
  }

  async login(username?: string, password?: string): Promise<void> {
    if (!username || !password) {
      return;
    }
    const params = new URLSearchParams({
      username,
      password,
    });

    const response = await this.request(`auth/login`, {
      method: 'POST',
      body: params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }, true);

    if (!response.ok) {
      throw new Error(`qBittorrent login failed: ${response.statusText}`);
    }

    const setCookie = response.headers.get('Set-Cookie');
    if (setCookie) {
      const sidMatch = setCookie.match(/SID=([^;]+)/);
      if (sidMatch) {
        this.sid = sidMatch[1];
      }
    }
  }

  async get(path: string, options?: RequestInit): Promise<unknown> {
    const response = await this.request(path, { ...options, method: 'GET' });
    if (!response.ok) {
      throw new Error(`qBittorrent API error: ${response.statusText}`);
    }
    return response.json();
  }

  async post(path: string, data?: any, options?: RequestInit): Promise<unknown> {
    const headers = new Headers(options?.headers);
    let body: string | FormData;

    if (data instanceof FormData) {
      body = data;
    } else if (typeof data === 'object' && data !== null) {
      // qBittorrent API expects form data for most POST requests
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(data)) {
        params.append(key, String(value));
      }
      body = params.toString();
      headers.set('Content-Type', 'application/x-www-form-urlencoded');
    } else {
      body = data ? String(data) : '';
    }

    const response = await this.request(path, {
      ...options,
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      throw new Error(`qBittorrent API error: ${response.statusText}`);
    }

    // Some qBittorrent API endpoints return empty responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return response.text();
  }

  // Settings sync methods

  async getPreferences(): Promise<QBPreferences> {
    try {
      const preferences = await this.get('app/preferences') as QBPreferences;
      return preferences;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        throw new Error('qBittorrent authentication required. Please check credentials.');
      }
      throw new Error(`Failed to get qBittorrent preferences: ${error}`);
    }
  }

  async setPreferences(preferences: Partial<QBPreferences>): Promise<void> {
    try {
      // qBittorrent API expects preferences as JSON string in the 'json' parameter
      await this.post('app/setPreferences', {
        json: JSON.stringify(preferences),
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        throw new Error('qBittorrent authentication required. Please check credentials.');
      }
      throw new Error(`Failed to set qBittorrent preferences: ${error}`);
    }
  }

  async validateConnection(): Promise<{ connected: boolean; error?: string; version?: string }> {
    try {
      // First check if we can connect to the WebUI
      const versionResponse = await fetch(`${this.baseUrl}/api/v2/app/version`, {
        method: 'GET',
        headers: this.sid ? { 'Cookie': `SID=${this.sid}` } : {},
      });

      if (!versionResponse.ok) {
        if (versionResponse.status === 404) {
          return {
            connected: false,
            error: 'qBittorrent WebUI not found. Check if qBittorrent is running and WebUI is enabled.',
          };
        }
        if (versionResponse.status === 403) {
          return {
            connected: false,
            error: 'Authentication required. Please check username and password.',
          };
        }
        return {
          connected: false,
          error: `Connection failed: ${versionResponse.statusText}`,
        };
      }

      const version = await versionResponse.text();

      // Try to access preferences to verify authentication
      try {
        await this.getPreferences();
        return {
          connected: true,
          version: version,
        };
      } catch (authError) {
        return {
          connected: true, // Connection works but authentication failed
          error: 'Connected but authentication failed. Please check credentials.',
          version: version,
        };
      }
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown connection error',
      };
    }
  }

  // Utility methods for connection management

  isAuthenticated(): boolean {
    return this.sid !== null;
  }

  getSessionId(): string | null {
    return this.sid;
  }

  clearSession(): void {
    this.sid = null;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}

export default QBittorrentClient;
