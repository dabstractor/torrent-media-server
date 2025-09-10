import ffmpeg from 'fluent-ffmpeg';
import type { MediaAnalysis, MediaMetadata, MediaStream } from '@/lib/types/media-conversion';

/**
 * MediaAnalysisService - Analyzes media files for codec compatibility
 * Follows pattern from web-ui/src/lib/services/PlexService.ts class structure
 */
export class MediaAnalysisService {
  private static instance: MediaAnalysisService | null = null;

  constructor() {
    // Singleton pattern for consistent service access
  }

  public static getInstance(): MediaAnalysisService {
    if (!MediaAnalysisService.instance) {
      MediaAnalysisService.instance = new MediaAnalysisService();
    }
    return MediaAnalysisService.instance;
  }

  /**
   * Analyze a media file to determine codec compatibility with Plex
   * PATTERN: Promise-based ffprobe with structured error handling
   */
  async analyzeFile(filePath: string): Promise<MediaAnalysis> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          console.error(`Media analysis failed for ${filePath}:`, err);
          return reject(new Error(`Analysis failed: ${err.message}`));
        }

        try {
          const analysis = this.parseMetadata(metadata, filePath);
          resolve(analysis);
        } catch (parseError) {
          reject(parseError);
        }
      });
    });
  }

  /**
   * Parse ffprobe metadata into MediaAnalysis format
   * CRITICAL: Check both video and audio streams exist
   */
  private parseMetadata(metadata: any, filePath: string): MediaAnalysis {
    if (!metadata.streams || metadata.streams.length === 0) {
      throw new Error(`No streams found in media file: ${filePath}`);
    }

    const videoStream = metadata.streams.find((s: MediaStream) => s.codec_type === 'video');
    const audioStream = metadata.streams.find((s: MediaStream) => s.codec_type === 'audio');

    if (!videoStream) {
      throw new Error(`No video stream found in: ${filePath}`);
    }

    if (!audioStream) {
      console.warn(`No audio stream found in: ${filePath}`);
    }

    const videoCodec = videoStream.codec_name || 'unknown';
    const audioCodec = audioStream?.codec_name || 'none';
    
    // CRITICAL: H.264/AAC compatibility check for Plex optimization
    const isH264AAC = videoCodec === 'h264' && audioCodec === 'aac';
    
    const durationStr = metadata.format?.duration;
    const duration = durationStr ? parseFloat(durationStr.toString()) : 0;
    
    return {
      videoCodec,
      audioCodec,
      duration,
      resolution: this.buildResolutionString(videoStream),
      isPlexCompatible: this.isPlexCompatible(videoCodec, audioCodec),
      needsConversion: !isH264AAC
    };
  }

  /**
   * Build resolution string from video stream metadata
   */
  private buildResolutionString(videoStream: MediaStream): string {
    if (videoStream.width && videoStream.height) {
      return `${videoStream.width}x${videoStream.height}`;
    }
    return 'unknown';
  }

  /**
   * Determine if codec combination is Plex compatible
   * Based on Plex Media Server supported formats
   */
  private isPlexCompatible(videoCodec: string, audioCodec: string): boolean {
    const compatibleVideoCodecs = [
      'h264', 'h265', 'hevc', 'mpeg4', 'mpeg2video', 'mpeg1video',
      'wmv3', 'wmv2', 'wmv1', 'vc1', 'vp8', 'vp9', 'av1'
    ];

    const compatibleAudioCodecs = [
      'aac', 'mp3', 'ac3', 'eac3', 'dts', 'truehd', 'flac',
      'pcm_s16le', 'pcm_s24le', 'opus', 'vorbis'
    ];

    const isVideoSupported = compatibleVideoCodecs.includes(videoCodec.toLowerCase());
    const isAudioSupported = audioCodec === 'none' || compatibleAudioCodecs.includes(audioCodec.toLowerCase());

    return isVideoSupported && isAudioSupported;
  }

  /**
   * Quick check if file needs conversion to optimal format (H.264/AAC MP4)
   * Used for bulk processing decisions
   */
  async needsOptimalConversion(filePath: string): Promise<boolean> {
    try {
      const analysis = await this.analyzeFile(filePath);
      return analysis.needsConversion;
    } catch (error) {
      console.error(`Failed to analyze ${filePath} for conversion needs:`, error);
      return true; // Assume conversion needed if analysis fails
    }
  }

  /**
   * Get basic media information without full analysis
   * Lighter weight operation for simple compatibility checks
   */
  async getBasicInfo(filePath: string): Promise<{ isVideo: boolean; duration: number; size?: number }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          return reject(new Error(`Basic info analysis failed: ${err.message}`));
        }

        const hasVideo = metadata.streams?.some(s => s.codec_type === 'video') || false;
        const durationStr = metadata.format?.duration;
        const duration = durationStr ? parseFloat(durationStr.toString()) : 0;
        const sizeStr = metadata.format?.size;
        const size = sizeStr ? parseInt(sizeStr.toString()) : 0;

        resolve({
          isVideo: hasVideo,
          duration,
          size: size > 0 ? size : undefined
        });
      });
    });
  }

  /**
   * Batch analyze multiple files
   * Returns results for successful analyses, logs errors for failures
   */
  async analyzeMultipleFiles(filePaths: string[]): Promise<Map<string, MediaAnalysis>> {
    const results = new Map<string, MediaAnalysis>();
    
    const analyses = await Promise.allSettled(
      filePaths.map(async (filePath) => {
        const analysis = await this.analyzeFile(filePath);
        return { filePath, analysis };
      })
    );

    analyses.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.set(result.value.filePath, result.value.analysis);
      } else {
        console.error(`Failed to analyze ${filePaths[index]}:`, result.reason);
      }
    });

    return results;
  }

  /**
   * Validate that ffmpeg/ffprobe is available and working
   * Should be called during service initialization
   */
  async validateFFmpegInstallation(): Promise<boolean> {
    return new Promise((resolve) => {
      ffmpeg.getAvailableFormats((err, formats) => {
        if (err) {
          console.error('FFmpeg validation failed:', err);
          resolve(false);
        } else {
          console.log('FFmpeg validation successful');
          resolve(true);
        }
      });
    });
  }
}

// Export singleton instance for use across the application
export const mediaAnalysisService = MediaAnalysisService.getInstance();
export default MediaAnalysisService;