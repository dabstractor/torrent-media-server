import type { PlexServerInfo, PlexLibrary, PlexMediaItem } from '@/lib/types/plex';
import apiClient from '@/lib/api/client';

class PlexService {
  private baseUrl: string;
  private token: string | null;

  constructor() {
    this.baseUrl = '/api/plex';
    this.token = null;
  }

  // Set the Plex token for authentication
  setToken(token: string): void {
    this.token = token;
  }

  // Get server information
  async getServerInfo(): Promise<PlexServerInfo | null> {
    if (!this.token) return null;
    
    try {
      const response = await apiClient.get<PlexServerInfo>(`${this.baseUrl}/status`);
      if (response.success) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch Plex server info:', error);
      return null;
    }
  }

  // Get all libraries
  async getLibraries(): Promise<PlexLibrary[]> {
    if (!this.token) return [];
    
    try {
      const response = await apiClient.get<PlexLibrary[]>(`${this.baseUrl}/libraries`);
      if (response.success) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch Plex libraries:', error);
      return [];
    }
  }

  // Refresh a specific library
  async refreshLibrary(libraryKey: string): Promise<boolean> {
    if (!this.token) return false;
    
    try {
      const response = await apiClient.post<void>(`${this.baseUrl}/libraries/${libraryKey}/refresh`);
      return response.success;
    } catch (error) {
      console.error(`Failed to refresh library ${libraryKey}:`, error);
      return false;
    }
  }

  // Get media items from a library
  async getMediaItems(libraryKey: string): Promise<PlexMediaItem[]> {
    if (!this.token) return [];
    
    try {
      const response = await apiClient.get<PlexMediaItem[]>(`${this.baseUrl}/libraries/${libraryKey}/items`);
      if (response.success) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error(`Failed to fetch media items from library ${libraryKey}:`, error);
      return [];
    }
  }

  // Search for media items
  async searchMedia(query: string): Promise<PlexMediaItem[]> {
    if (!this.token || !query) return [];
    
    try {
      const params = new URLSearchParams({ query });
      const response = await apiClient.get<PlexMediaItem[]>(`${this.baseUrl}/search?${params.toString()}`);
      if (response.success) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error(`Failed to search for media with query "${query}":`, error);
      return [];
    }
  }

  // Get direct link to media item in Plex Web
  getMediaLink(mediaKey: string): string {
    if (!this.token) return '';
    
    // Assuming Plex is running on the same host as the web UI
    // In a real implementation, this would need to be configurable
    return `http://localhost:32400/web/index.html#!/server/${mediaKey}`;
  }
}

export const plexService = new PlexService();
export default PlexService;