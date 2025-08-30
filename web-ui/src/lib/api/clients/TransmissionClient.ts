export interface TransmissionPreferences {
  'speed-limit-down-enabled': boolean;
  'speed-limit-down': number;
  'speed-limit-up-enabled': boolean;
  'speed-limit-up': number;
  'alt-speed-enabled': boolean;
  'alt-speed-down': number;
  'alt-speed-up': number;
  'alt-speed-time-enabled': boolean;
  'alt-speed-time-begin': number;
  'alt-speed-time-end': number;
  'alt-speed-time-day': number;
  'download-queue-enabled': boolean;
  'download-queue-size': number;
  'seed-queue-enabled': boolean;
  'seed-queue-size': number;
  'start-added-torrents': boolean;
  'download-dir': string;
}

class TransmissionClient {
  private sessionId: string | null = null;
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;

  constructor(baseUrl: string = 'http://transmission:9091', username?: string, password?: string) {
    this.baseUrl = baseUrl;
    this.username = username || '';
    this.password = password || '';
  }

  private async request(method: string, rpcArguments?: any): Promise<any> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add session ID if available
    if (this.sessionId) {
      headers['X-Transmission-Session-Id'] = this.sessionId;
    }

    // Add Basic Auth if credentials provided
    if (this.username && this.password) {
      headers['Authorization'] = `Basic ${btoa(`${this.username}:${this.password}`)}`;
    }

    const requestBody = {
      method,
      arguments: rpcArguments || {}
    };

    const response = await fetch(`${this.baseUrl}/transmission/rpc`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    // Handle 409 response for session ID requirement
    if (response.status === 409) {
      const newSessionId = response.headers.get('X-Transmission-Session-Id');
      if (newSessionId) {
        this.sessionId = newSessionId;
        // Retry request with new session ID
        return this.request(method, rpcArguments);
      }
      throw new Error('Failed to obtain session ID from Transmission');
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Transmission authentication failed. Check username and password.');
      }
      throw new Error(`Transmission RPC error: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.result !== 'success') {
      throw new Error(`Transmission RPC error: ${data.result}`);
    }

    return data;
  }

  // Settings sync methods

  async getPreferences(): Promise<TransmissionPreferences> {
    try {
      const response = await this.request('session-get');
      const sessionData = response.arguments;
      
      // Map Transmission session data to our preferences format
      return {
        'speed-limit-down-enabled': sessionData['speed-limit-down-enabled'] || false,
        'speed-limit-down': sessionData['speed-limit-down'] || 0,
        'speed-limit-up-enabled': sessionData['speed-limit-up-enabled'] || false,
        'speed-limit-up': sessionData['speed-limit-up'] || 0,
        'alt-speed-enabled': sessionData['alt-speed-enabled'] || false,
        'alt-speed-down': sessionData['alt-speed-down'] || 0,
        'alt-speed-up': sessionData['alt-speed-up'] || 0,
        'alt-speed-time-enabled': sessionData['alt-speed-time-enabled'] || false,
        'alt-speed-time-begin': sessionData['alt-speed-time-begin'] || 0,
        'alt-speed-time-end': sessionData['alt-speed-time-end'] || 0,
        'alt-speed-time-day': sessionData['alt-speed-time-day'] || 0,
        'download-queue-enabled': sessionData['download-queue-enabled'] || false,
        'download-queue-size': sessionData['download-queue-size'] || 0,
        'seed-queue-enabled': sessionData['seed-queue-enabled'] || false,
        'seed-queue-size': sessionData['seed-queue-size'] || 0,
        'start-added-torrents': sessionData['start-added-torrents'] !== false,
        'download-dir': sessionData['download-dir'] || '',
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('authentication')) {
        throw new Error('Transmission authentication required. Please check credentials.');
      }
      throw new Error(`Failed to get Transmission preferences: ${error}`);
    }
  }

  async setPreferences(preferences: Partial<TransmissionPreferences>): Promise<void> {
    try {
      await this.request('session-set', preferences);
    } catch (error) {
      if (error instanceof Error && error.message.includes('authentication')) {
        throw new Error('Transmission authentication required. Please check credentials.');
      }
      throw new Error(`Failed to set Transmission preferences: ${error}`);
    }
  }

  async validateConnection(): Promise<{ connected: boolean; error?: string; version?: string }> {
    try {
      const response = await this.request('session-get');
      
      return {
        connected: true,
        version: response.arguments.version || 'Unknown'
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown connection error'
      };
    }
  }

  // Torrent management methods

  async getTorrents(fields?: string[]): Promise<any[]> {
    const defaultFields = ['id', 'name', 'status', 'percentDone', 'rateDownload', 'rateUpload', 'eta'];
    const response = await this.request('torrent-get', {
      fields: fields || defaultFields
    });
    
    return response.arguments.torrents || [];
  }

  async addTorrent(options: { filename?: string; metainfo?: string; 'download-dir'?: string }): Promise<any> {
    const response = await this.request('torrent-add', options);
    return response.arguments;
  }

  async removeTorrent(ids: number | number[], deleteLocalData: boolean = false): Promise<void> {
    const torrentIds = Array.isArray(ids) ? ids : [ids];
    await this.request('torrent-remove', {
      ids: torrentIds,
      'delete-local-data': deleteLocalData
    });
  }

  async startTorrents(ids: number | number[]): Promise<void> {
    const torrentIds = Array.isArray(ids) ? ids : [ids];
    await this.request('torrent-start', { ids: torrentIds });
  }

  async stopTorrents(ids: number | number[]): Promise<void> {
    const torrentIds = Array.isArray(ids) ? ids : [ids];
    await this.request('torrent-stop', { ids: torrentIds });
  }

  async getSessionStats(): Promise<any> {
    const response = await this.request('session-stats');
    return response.arguments;
  }

  // Utility methods for connection management

  isAuthenticated(): boolean {
    // For Transmission, authentication is validated with each request
    // We consider it authenticated if we have credentials
    return !!(this.username && this.password);
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  clearSession(): void {
    this.sessionId = null;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  // Update credentials
  updateCredentials(username: string, password: string): void {
    const newClient = new TransmissionClient(this.baseUrl, username, password);
    // Transfer session ID to maintain connection
    newClient.sessionId = this.sessionId;
    Object.assign(this, newClient);
  }
}

export default TransmissionClient;