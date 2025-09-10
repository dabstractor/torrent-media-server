// Media conversion and analysis types for Plex organization
// Follows pattern from web-ui/src/lib/types/file-history.ts

export interface MediaAnalysis {
  videoCodec: string;
  audioCodec: string;
  duration: number;
  resolution: string;
  isPlexCompatible: boolean;
  needsConversion: boolean;
}

export interface ConversionTask {
  id: string;
  inputPath: string;
  outputPath: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface PlexOrganizationResult {
  plexPath: string;
  action: 'symlink' | 'convert' | 'skip';
  conversionTask?: ConversionTask;
  success: boolean;
  error?: string;
}

// Conversion options for ffmpeg processing
export interface ConversionOptions {
  videoQuality?: number; // CRF value (18-28)
  audioBitrate?: string; // e.g., '128k', '192k'
  preset?: string;       // e.g., 'ultrafast', 'medium', 'slow'
}

// Progress tracking for conversion operations
export interface ConversionProgress {
  taskId: string;
  percent: number;
  timemark: string;
  targetSize?: string;
  currentFps?: number;
  currentKbps?: number;
  currentTime?: string;
}

// Queue management for concurrent conversions
export interface ConversionQueue {
  tasks: ConversionTask[];
  activeConversions: number;
  maxConcurrent: number;
  isProcessing: boolean;
}

// Plex organization configuration
export interface PlexOrganizationConfig {
  enabled: boolean;
  mediaPath: string;
  movieLibrary: string;
  tvLibrary: string;
  symlinkCompatible: boolean;
  convertIncompatible: boolean;
  conversionOptions: ConversionOptions;
}

// Media file metadata from ffprobe
export interface MediaMetadata {
  format: {
    filename: string;
    format_name: string;
    format_long_name: string;
    duration: string;
    size: string;
    bit_rate: string;
  };
  streams: MediaStream[];
}

export interface MediaStream {
  index: number;
  codec_name: string;
  codec_long_name: string;
  codec_type: 'video' | 'audio' | 'subtitle' | 'data';
  codec_tag_string: string;
  codec_tag: string;
  width?: number;
  height?: number;
  coded_width?: number;
  coded_height?: number;
  sample_rate?: string;
  channels?: number;
  channel_layout?: string;
  duration?: string;
  bit_rate?: string;
}

// Event types for conversion service
export interface ConversionEvent {
  type: 'start' | 'progress' | 'complete' | 'error';
  taskId: string;
  data?: Record<string, unknown>;
}

// File organization patterns for Plex naming conventions
export interface PlexNamingPattern {
  type: 'movie' | 'tv';
  pattern: string;
  variables: string[];
}

// Organization statistics
export interface OrganizationStats {
  totalFiles: number;
  symlinksCreated: number;
  filesConverted: number;
  errors: number;
  lastRun?: Date;
}