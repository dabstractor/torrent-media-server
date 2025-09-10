import { plexService } from '@/lib/services/PlexService';
import { plexOrganizationService } from '@/lib/services/PlexOrganizationService';
import type { Download } from '@/lib/types';
import type { CompletedFile } from '@/lib/types/file-history';
import type { AppSettings } from '@/lib/types/settings';
import { getMediaType } from '@/lib/api/files';

class PlexIntegrationManager {
  private isInitialized: boolean = false;

  // Initialize the manager with Plex token and settings
  async initialize(plexToken: string, plexSettings?: AppSettings['plex']): Promise<boolean> {
    try {
      plexService.setToken(plexToken);
      
      // Initialize organization service if settings provided
      if (plexSettings) {
        plexOrganizationService.initialize(plexSettings);
      }
      
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
    console.log(`🔍 TRACE: PlexIntegrationManager.onDownloadComplete called`);
    console.log(`🔍 TRACE: Download:`, JSON.stringify(download, null, 2));
    console.log(`🔍 TRACE: Completed files:`, JSON.stringify(completedFiles, null, 2));
    
    if (!this.isReady()) {
      console.error(`❌ TRACE: PlexIntegrationManager not initialized`);
      return false;
    }

    console.log(`✅ TRACE: PlexIntegrationManager is ready, proceeding...`);

    try {
      // INTEGRATION: Call PlexOrganizationService.organizeForPlex
      console.log(`🔍 TRACE: Processing ${completedFiles.length} files for Plex organization`);
      
      // Organize files for Plex (symlinks for compatible, conversion for incompatible)
      console.log(`🔍 TRACE: Calling plexOrganizationService.organizeForPlex...`);
      const organizationResults = await plexOrganizationService.organizeForPlex(completedFiles);
      console.log(`🔍 TRACE: Organization results:`, JSON.stringify(organizationResults, null, 2));
      
      const successfulOrganizations = organizationResults.filter(r => r.success).length;
      
      console.log(`✅ TRACE: Plex organization completed: ${successfulOrganizations}/${organizationResults.length} files processed successfully`);

      // Determine the correct library type based on downloaded files
      const libraryType = this.determineLibraryType(completedFiles);
      console.log(`🔍 TRACE: Determined library type:`, libraryType);
      
      if (!libraryType) {
        console.warn('❌ TRACE: Could not determine library type for download:', download.name);
        // Still return true if organization was successful, even if we can't refresh
        return successfulOrganizations > 0;
      }

      // PRESERVE: Existing library refresh functionality
      // Find the appropriate library
      console.log(`🔍 TRACE: Getting Plex libraries...`);
      const libraries = await plexService.getLibraries();
      console.log(`🔍 TRACE: Available libraries:`, JSON.stringify(libraries, null, 2));
      
      const targetLibrary = libraries.find(lib => lib.type === libraryType);
      console.log(`🔍 TRACE: Target library:`, JSON.stringify(targetLibrary, null, 2));
      
      if (!targetLibrary) {
        console.warn(`No ${libraryType} library found in Plex`);
        // Still return true if organization was successful
        return successfulOrganizations > 0;
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
      
      // Return true if either organization or refresh was successful
      return successfulOrganizations > 0 || refreshSuccess;
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