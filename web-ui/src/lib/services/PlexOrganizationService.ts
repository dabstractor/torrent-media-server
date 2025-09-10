import path from 'path';
import type { CompletedFile } from '@/lib/types/file-history';
import type { AppSettings } from '@/lib/types/settings';
import type { PlexOrganizationResult, MediaAnalysis, ConversionTask } from '@/lib/types/media-conversion';
import { MediaAnalysisService, mediaAnalysisService } from './MediaAnalysisService';
import { MediaConversionService, mediaConversionService } from './MediaConversionService';
import { 
  createSymlink, 
  generatePlexPath, 
  extractMediaTitle,
  pathExists,
  getFileStats
} from '@/lib/utils/symlink-utils';

/**
 * PlexOrganizationService - Main orchestrator for Plex media organization workflow
 * Follows pattern from web-ui/src/lib/managers/PlexIntegrationManager.ts structure
 */
export class PlexOrganizationService {
  private static instance: PlexOrganizationService | null = null;
  private analysisService: MediaAnalysisService;
  private conversionService: MediaConversionService;
  private settings: AppSettings['plex'] | null = null;

  constructor() {
    this.analysisService = mediaAnalysisService;
    this.conversionService = mediaConversionService;
  }

  public static getInstance(): PlexOrganizationService {
    if (!PlexOrganizationService.instance) {
      PlexOrganizationService.instance = new PlexOrganizationService();
    }
    return PlexOrganizationService.instance;
  }

  /**
   * Initialize the service with Plex settings
   * Must be called before using organization features
   */
  initialize(plexSettings: AppSettings['plex']): void {
    this.settings = plexSettings;
  }

  /**
   * Main organization method - processes completed files for Plex
   * INTEGRATION: Call from PlexIntegrationManager.onDownloadComplete
   */
  async organizeForPlex(completedFiles: CompletedFile[]): Promise<PlexOrganizationResult[]> {
    if (!this.settings || !this.settings.organizationEnabled) {
      console.log('Plex organization is disabled');
      return [];
    }

    if (!this.settings.mediaPath) {
      throw new Error('Plex media path not configured');
    }

    console.log(`Starting Plex organization for ${completedFiles.length} files`);
    
    const results: PlexOrganizationResult[] = [];
    
    for (const file of completedFiles) {
      try {
        const result = await this.organizeFile(file);
        results.push(result);
      } catch (error: any) {
        console.error(`Failed to organize file ${file.path}:`, error);
        results.push({
          plexPath: '',
          action: 'skip',
          success: false,
          error: error.message
        });
      }
    }

    console.log(`Plex organization completed: ${results.filter(r => r.success).length}/${results.length} successful`);
    return results;
  }

  /**
   * Organize individual file for Plex
   * DEPENDENCIES: All previous services, symlink utilities, Plex types
   */
  private async organizeFile(file: CompletedFile): Promise<PlexOrganizationResult> {
    // Skip non-video files
    if (file.mediaType !== 'video') {
      return {
        plexPath: '',
        action: 'skip',
        success: true,
        error: 'Not a video file'
      };
    }

    // Verify source file exists
    const sourcePath = path.resolve(file.path);
    if (!await pathExists(sourcePath)) {
      throw new Error(`Source file not found: ${sourcePath}`);
    }

    // Analyze media file
    let analysis: MediaAnalysis;
    try {
      analysis = await this.analysisService.analyzeFile(sourcePath);
    } catch (error: any) {
      throw new Error(`Media analysis failed: ${error.message}`);
    }

    // Determine media type (movie vs tv show)
    const mediaType = this.determineMediaType(file.name);
    
    // Extract title for organization
    const title = extractMediaTitle(file.name);
    
    // Generate Plex path
    const plexPath = generatePlexPath(
      this.settings!.mediaPath,
      mediaType,
      title,
      path.basename(file.path)
    );

    // Decision: convert ALL non-MP4 files to MP4, and convert non-H.264/AAC MP4s
    const isMP4 = path.extname(file.path).toLowerCase() === '.mp4';
    const isOptimalFormat = isMP4 && !analysis.needsConversion; // H.264/AAC MP4
    
    if (isOptimalFormat) {
      // H.264/AAC MP4 file - create symlink (optimal format)
      return await this.createSymlinkOrganization(sourcePath, plexPath);
    } else {
      // Non-MP4 file OR non-H.264/AAC MP4 - convert to H.264/AAC MP4
      return await this.createConversionOrganization(sourcePath, plexPath, analysis);
    }
  }

  /**
   * Create symlink organization for compatible files
   * PRESERVE: Original file remains untouched for seeding
   */
  private async createSymlinkOrganization(
    sourcePath: string, 
    plexPath: string
  ): Promise<PlexOrganizationResult> {
    try {
      await createSymlink(sourcePath, plexPath);
      
      console.log(`Symlink created: ${sourcePath} -> ${plexPath}`);
      
      return {
        plexPath,
        action: 'symlink',
        success: true
      };
    } catch (error: any) {
      throw new Error(`Symlink creation failed: ${error.message}`);
    }
  }

  /**
   * Create conversion organization for incompatible files
   * Convert to H.264/AAC MP4 and place in Plex structure
   */
  private async createConversionOrganization(
    sourcePath: string,
    basePlexPath: string,
    analysis: MediaAnalysis
  ): Promise<PlexOrganizationResult> {
    // Generate converted file path (ensure .mp4 extension)
    const convertedPlexPath = this.generateConvertedPath(basePlexPath);
    
    try {
      // Queue conversion task
      const conversionTask = await this.conversionService.convertToH264MP4(
        sourcePath,
        convertedPlexPath
      );
      
      console.log(`Conversion queued: ${sourcePath} -> ${convertedPlexPath}`);
      
      return {
        plexPath: convertedPlexPath,
        action: 'convert',
        conversionTask,
        success: true
      };
    } catch (error: any) {
      throw new Error(`Conversion setup failed: ${error.message}`);
    }
  }

  /**
   * Generate converted file path with .mp4 extension
   */
  private generateConvertedPath(basePlexPath: string): string {
    const parsedPath = path.parse(basePlexPath);
    return path.join(parsedPath.dir, `${parsedPath.name}.mp4`);
  }

  /**
   * Determine media type based on filename patterns
   * Simple implementation - could be enhanced with more sophisticated logic
   */
  private determineMediaType(filename: string): 'movie' | 'tv' {
    const lowerName = filename.toLowerCase();
    
    // Look for TV show indicators
    const tvIndicators = [
      /s\d+e\d+/i,        // S01E01 pattern
      /season\s*\d+/i,    // Season X pattern
      /episode\s*\d+/i,   // Episode X pattern
      /\d+x\d+/           // 1x01 pattern
    ];
    
    const hasSeasonInfo = tvIndicators.some(pattern => pattern.test(lowerName));
    
    return hasSeasonInfo ? 'tv' : 'movie';
  }

  /**
   * Get organization statistics
   */
  getOrganizationStats(): {
    symlinksCreated: number;
    conversionsQueued: number;
    conversionsCompleted: number;
    errors: number;
  } {
    const conversionStats = this.conversionService.getStats();
    
    return {
      symlinksCreated: 0, // TODO: Track symlink stats
      conversionsQueued: conversionStats.totalQueued,
      conversionsCompleted: conversionStats.totalCompleted,
      errors: conversionStats.totalFailed
    };
  }

  /**
   * Validate service configuration and dependencies
   */
  async validateConfiguration(): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Check settings
    if (!this.settings) {
      errors.push('Plex organization service not initialized');
    } else {
      if (!this.settings.mediaPath) {
        errors.push('Media path not configured');
      }
      
      if (!this.settings.organizationEnabled) {
        errors.push('Organization is disabled');
      }
    }

    // Validate FFmpeg availability
    try {
      const ffmpegValid = await this.analysisService.validateFFmpegInstallation();
      if (!ffmpegValid) {
        errors.push('FFmpeg is not properly installed or configured');
      }
    } catch (error) {
      errors.push('Failed to validate FFmpeg installation');
    }

    // Validate conversion service
    try {
      const conversionValid = await this.conversionService.validateFFmpegAvailability();
      if (!conversionValid) {
        errors.push('FFmpeg encoders not available for conversion');
      }
    } catch (error) {
      errors.push('Failed to validate conversion capabilities');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Cleanup temporary files and failed conversions
   */
  async cleanup(): Promise<{
    tasksRemoved: number;
    tempFilesRemoved: number;
  }> {
    const tasksRemoved = this.conversionService.clearCompletedTasks();
    
    // TODO: Add cleanup for temporary files and failed symlinks
    const tempFilesRemoved = 0;
    
    return {
      tasksRemoved,
      tempFilesRemoved
    };
  }

  /**
   * Get current organization status
   */
  getStatus(): {
    isEnabled: boolean;
    mediaPath: string | null;
    queueStatus: any;
    validationStatus: Promise<any>;
  } {
    return {
      isEnabled: this.settings?.organizationEnabled || false,
      mediaPath: this.settings?.mediaPath || null,
      queueStatus: this.conversionService.getQueueStatus(),
      validationStatus: this.validateConfiguration()
    };
  }
}

// Export singleton instance for use across the application
export const plexOrganizationService = PlexOrganizationService.getInstance();
export default PlexOrganizationService;