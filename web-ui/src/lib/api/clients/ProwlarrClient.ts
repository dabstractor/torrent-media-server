class ProwlarrClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, baseUrl: string = 'http://prowlarr:9696') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}/api/v1/${path}`;
    const headers = new Headers(options.headers);
    headers.set('X-Api-Key', this.apiKey);

    const config: RequestInit = {
      ...options,
      headers,
    };

    return fetch(url, config);
  }

  async get(path: string, options?: RequestInit): Promise<unknown> {
    const response = await this.request(path, { ...options, method: 'GET' });
    if (!response.ok) {
      throw new Error(`Prowlarr API error: ${response.statusText}`);
    }
    return response.json();
  }
}

export default ProwlarrClient;
