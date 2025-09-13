import { plexService } from '@/lib/services/PlexService';
import type { Download } from '@/lib/types';
import type { CompletedFile } from '@/lib/types/file-history';
import type { AppSettings } from '@/lib/types/settings';

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

  // Handle download completion event - trigger library refresh only (Sonarr/Radarr handle organization)
  async onDownloadComplete(download: Download, completedFiles: CompletedFile[]): Promise<boolean> {
    console.log(`🔍 TRACE: PlexIntegrationManager.onDownloadComplete called`);
    console.log(`🔍 TRACE: Download:`, JSON.stringify(download, null, 2));

    if (!this.isReady()) {
      console.error(`❌ TRACE: PlexIntegrationManager not initialized`);
      return false;
    }

    console.log(`✅ TRACE: PlexIntegrationManager is ready, proceeding with library refresh...`);

    try {
      // Determine the correct library type based on download category
      const libraryType = this.determineLibraryTypeFromCategory(download.category);
      console.log(`🔍 TRACE: Determined library type from category '${download.category}':`, libraryType);

      if (!libraryType) {
        // Fallback to file-based detection
        const fileBasedType = this.determineLibraryType(completedFiles);
        console.log(`🔍 TRACE: Fallback library type from files:`, fileBasedType);

        if (!fileBasedType) {
          console.warn('❌ TRACE: Could not determine library type for download:', download.name);
          return false;
        }

        return await this.refreshLibrary(fileBasedType);
      }

      return await this.refreshLibrary(libraryType);
    } catch (error) {
      console.error('Error handling download completion for Plex integration:', error);
      return false;
    }
  }

  // Refresh specific library type
  private async refreshLibrary(libraryType: 'movie' | 'show' | 'music'): Promise<boolean> {
    try {
      // Find the appropriate library
      console.log(`🔍 TRACE: Getting Plex libraries...`);
      const libraries = await plexService.getLibraries();
      console.log(`🔍 TRACE: Available libraries:`, JSON.stringify(libraries, null, 2));

      const targetLibrary = libraries.find(lib => lib.type === libraryType);
      console.log(`🔍 TRACE: Target library:`, JSON.stringify(targetLibrary, null, 2));

      if (!targetLibrary) {
        console.warn(`No ${libraryType} library found in Plex`);
        return false;
      }

      // Trigger library refresh
      console.log(`🔍 TRACE: Attempting to refresh library ${targetLibrary.id} (${targetLibrary.title})...`);
      const refreshSuccess = await plexService.refreshLibrary(targetLibrary.id);
      console.log(`🔍 TRACE: Library refresh result:`, refreshSuccess);

      if (refreshSuccess) {
        console.log(`✅ TRACE: Successfully triggered Plex library refresh for ${targetLibrary.title}`);
      } else {
        console.error(`❌ TRACE: Failed to trigger Plex library refresh for ${targetLibrary.title}`);
      }

      return refreshSuccess;
    } catch (error) {
      console.error('Error refreshing Plex library:', error);
      return false;
    }
  }

  // Determine library type from qBittorrent category (set by Sonarr/Radarr)
  private determineLibraryTypeFromCategory(category?: string): 'movie' | 'show' | 'music' | null {
    if (!category) return null;

    const lowerCategory = category.toLowerCase();

    // Common categories set by Sonarr/Radarr
    if (lowerCategory.includes('tv') || lowerCategory.includes('show') || lowerCategory.includes('series')) {
      return 'show';
    }

    if (lowerCategory.includes('movie') || lowerCategory.includes('film')) {
      return 'movie';
    }

    if (lowerCategory.includes('music') || lowerCategory.includes('audio')) {
      return 'music';
    }

    return null;
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