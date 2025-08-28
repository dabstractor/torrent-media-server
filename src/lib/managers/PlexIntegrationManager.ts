// src/lib/managers/PlexIntegrationManager.ts
import { PlexService } from '@/lib/services/PlexService';
import { PlexLibrary } from '@/lib/types/plex';

export class PlexIntegrationManager {
  private plexService: PlexService;

  constructor() {
    this.plexService = new PlexService();
  }

  /**
   * Handle download completion event
   * @param filePath Path to the completed download
   * @param mediaType Type of media (movie, show, etc.)
   */
  async onDownloadComplete(filePath: string, mediaType: string): Promise<boolean> {
    try {
      // Get all libraries
      const libraries = await this.plexService.getLibraries();
      
      // Find the appropriate library based on media type
      const targetLibrary = this.findLibraryForMedia(libraries, mediaType);
      
      if (!targetLibrary) {
        console.warn(`No matching library found for media type: ${mediaType}`);
        return false;
      }

      // Trigger library refresh
      const success = await this.plexService.refreshLibrary(targetLibrary.id);
      
      if (success) {
        console.log(`Successfully triggered refresh for library: ${targetLibrary.title}`);
      } else {
        console.error(`Failed to trigger refresh for library: ${targetLibrary.title}`);
      }
      
      return success;
    } catch (error) {
      console.error('Error handling download completion:', error);
      return false;
    }
  }

  /**
   * Find the appropriate library for a media type
   * @param libraries List of available libraries
   * @param mediaType Type of media
   */
  private findLibraryForMedia(libraries: PlexLibrary[], mediaType: string): PlexLibrary | null {
    // Convert media type to match Plex library types
    const plexMediaType = mediaType.toLowerCase() === 'movie' ? 'movie' : 'show';
    
    // Find library by type
    return libraries.find(library => library.type === plexMediaType) || null;
  }

  /**
   * Check if Plex integration is configured and working
   */
  async isPlexAvailable(): Promise<boolean> {
    try {
      const serverInfo = await this.plexService.getServerInfo();
      return serverInfo !== null;
    } catch (error) {
      return false;
    }
  }
}