import { plexService } from '@/lib/services/PlexService';
import type { Download } from '@/lib/types';
import type { CompletedFile } from '@/lib/types/file-history';
import { getMediaType } from '@/lib/api/files';

class PlexIntegrationManager {
  private isInitialized: boolean = false;

  // Initialize the manager with Plex token
  async initialize(plexToken: string): Promise<boolean> {
    try {
      plexService.setToken(plexToken);
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Plex integration:', error);
      return false;
    }
  }

  // Check if manager is initialized
  isReady(): boolean {
    return this.isInitialized;
  }

  // Handle download completion event
  async onDownloadComplete(download: Download, completedFiles: CompletedFile[]): Promise<boolean> {
    if (!this.isReady()) {
      console.warn('PlexIntegrationManager not initialized');
      return false;
    }

    try {
      // Determine the correct library type based on downloaded files
      const libraryType = this.determineLibraryType(completedFiles);
      if (!libraryType) {
        console.warn('Could not determine library type for download:', download.name);
        return false;
      }

      // Find the appropriate library
      const libraries = await plexService.getLibraries();
      const targetLibrary = libraries.find(lib => lib.type === libraryType);
      
      if (!targetLibrary) {
        console.warn(`No ${libraryType} library found in Plex`);
        return false;
      }

      // Trigger library refresh
      const success = await plexService.refreshLibrary(targetLibrary.id);
      
      if (success) {
        console.log(`Successfully triggered Plex library refresh for ${targetLibrary.title}`);
      } else {
        console.error(`Failed to trigger Plex library refresh for ${targetLibrary.title}`);
      }
      
      return success;
    } catch (error) {
      console.error('Error handling download completion for Plex integration:', error);
      return false;
    }
  }

  // Determine library type based on file types
  private determineLibraryType(files: CompletedFile[]): 'movie' | 'show' | 'music' | null {
    // Count media types
    const typeCounts = {
      video: 0,
      audio: 0,
      image: 0,
      archive: 0,
      document: 0
    };

    files.forEach(file => {
      if (file.mediaType) {
        typeCounts[file.mediaType]++;
      }
    });

    // Prioritize based on content
    if (typeCounts.video > 0) {
      // For videos, we need to determine if it's a movie or show
      // This is a simplified approach - in reality, you'd need more sophisticated logic
      const videoFiles = files.filter(f => f.mediaType === 'video');
      const hasSeasonInfo = videoFiles.some(f => 
        f.name.toLowerCase().includes('s0') || 
        f.name.toLowerCase().includes('season')
      );
      
      return hasSeasonInfo ? 'show' : 'movie';
    }
    
    if (typeCounts.audio > 0) {
      return 'music';
    }

    return null;
  }

  // Get direct link to media in Plex
  getMediaLink(mediaKey: string): string {
    if (!this.isReady()) {
      return '';
    }
    
    return plexService.getMediaLink(mediaKey);
  }

  // Check Plex server status
  async checkStatus(): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }
    
    try {
      const serverInfo = await plexService.getServerInfo();
      return serverInfo !== null;
    } catch (error) {
      console.error('Error checking Plex status:', error);
      return false;
    }
  }
}

export const plexIntegrationManager = new PlexIntegrationManager();
export default PlexIntegrationManager;