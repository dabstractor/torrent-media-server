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
}

export default QBittorrentClient;
