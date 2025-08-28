// src/lib/services/PlexService.ts
import { PlexServerInfo, PlexLibrary, PlexMediaItem } from '@/lib/types/plex';

export class PlexService {
  private baseUrl: string;
  private token: string;

  constructor() {
    this.baseUrl = process.env.PLEX_URL || 'http://plex:32400';
    this.token = process.env.PLEX_TOKEN || '';
  }

  private getHeaders(): HeadersInit {
    return {
      'X-Plex-Token': this.token,
      'Accept': 'application/json',
    };
  }

  /**
   * Get server information
   */
  async getServerInfo(): Promise<PlexServerInfo | null> {
    try {
      const response = await fetch(`${this.baseUrl}/`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch server info: ${response.status}`);
      }

      const data = await response.json();
      const server = data.MediaContainer;

      return {
        name: server.friendlyName,
        version: server.version,
        platform: server.platform,
        platformVersion: server.platformVersion,
        updatedAt: new Date(server.updatedAt * 1000),
        machineIdentifier: server.machineIdentifier,
      };
    } catch (error) {
      console.error('Error fetching Plex server info:', error);
      return null;
    }
  }

  /**
   * Get all libraries
   */
  async getLibraries(): Promise<PlexLibrary[]> {
    try {
      const response = await fetch(`${this.baseUrl}/library/sections`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch libraries: ${response.status}`);
      }

      const data = await response.json();
      const sections = data.MediaContainer.Directory || [];

      return sections.map((section: any) => ({
        id: section.key,
        title: section.title,
        type: section.type,
        locations: section.Location?.map((loc: any) => loc.path) || [],
        updatedAt: new Date(section.updatedAt * 1000),
        scannedAt: new Date(section.scannedAt * 1000),
      }));
    } catch (error) {
      console.error('Error fetching Plex libraries:', error);
      return [];
    }
  }

  /**
   * Refresh a specific library
   */
  async refreshLibrary(libraryId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/library/sections/${libraryId}/refresh`, {
        method: 'PUT',
        headers: this.getHeaders(),
      });

      return response.ok;
    } catch (error) {
      console.error(`Error refreshing library ${libraryId}:`, error);
      return false;
    }
  }

  /**
   * Search for a media item by title
   */
  async searchMedia(title: string): Promise<PlexMediaItem[]> {
    try {
      const response = await fetch(`${this.baseUrl}/search?query=${encodeURIComponent(title)}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to search media: ${response.status}`);
      }

      const data = await response.json();
      const mediaItems = data.MediaContainer.Metadata || [];

      return mediaItems.map((item: any) => ({
        id: item.ratingKey,
        title: item.title,
        type: item.type,
        year: item.year,
        rating: item.rating,
        summary: item.summary,
        poster: item.thumb ? `${this.baseUrl}${item.thumb}` : undefined,
        addedAt: new Date(item.addedAt * 1000),
        duration: item.duration,
        viewCount: item.viewCount || 0,
        lastViewedAt: item.lastViewedAt ? new Date(item.lastViewedAt * 1000) : undefined,
      }));
    } catch (error) {
      console.error('Error searching Plex media:', error);
      return [];
    }
  }

  /**
   * Get a direct link to a media item
   */
  getMediaLink(mediaKey: string): string {
    return `${this.baseUrl}/web/index.html#!/server/${this.getServerId()}/details?key=/library/metadata/${mediaKey}`;
  }

  /**
   * Get server identifier for links
   */
  private getServerId(): string {
    // In a real implementation, you would fetch this from the server info
    // For now, we'll use a placeholder
    return 'server-id';
  }
}