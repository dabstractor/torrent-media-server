import ffmpeg from 'fluent-ffmpeg';
import { EventEmitter } from 'events';
import path from 'path';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import type { 
  ConversionTask, 
  ConversionOptions, 
  ConversionProgress,
  ConversionQueue,
  ConversionEvent 
} from '@/lib/types/media-conversion';

/**
 * MediaConversionService - Handles ffmpeg conversion operations with queue management
 * Follows pattern from web-ui/src/lib/services/PlexService.ts async patterns
 */
export class MediaConversionService extends EventEmitter {
  private static instance: MediaConversionService | null = null;
  private conversionQueue: ConversionTask[] = [];
  private activeConversions = 0;
  private maxConcurrent = 2; // CRITICAL: Limit CPU usage
  private isProcessing = false;

  constructor() {
    super();
    // Singleton pattern for consistent service access
  }

  public static getInstance(): MediaConversionService {
    if (!MediaConversionService.instance) {
      MediaConversionService.instance = new MediaConversionService();
    }
    return MediaConversionService.instance;
  }

  /**
   * Convert media file to H.264/AAC MP4 format
   * PATTERN: Queue management to prevent resource exhaustion
   */
  async convertToH264MP4(
    inputPath: string,
    outputPath: string,
    options: ConversionOptions = {}
  ): Promise<ConversionTask> {
    const task: ConversionTask = {
      id: uuidv4(),
      inputPath,
      outputPath,
      status: 'pending',
      progress: 0,
      startedAt: new Date()
    };

    // Add to queue and start processing
    this.conversionQueue.push(task);
    this.emit('taskQueued', { taskId: task.id, position: this.conversionQueue.length });
    
    // Start processing queue if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return task;
  }

  /**
   * Process the conversion queue with concurrency limits
   * CRITICAL: Prevent overwhelming the container with too many conversions
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.conversionQueue.length > 0 && this.activeConversions < this.maxConcurrent) {
      const task = this.conversionQueue.shift();
      if (task && task.status === 'pending') {
        this.activeConversions++;
        this.processConversion(task)
          .finally(() => {
            this.activeConversions--;
            // Continue processing queue
            if (this.conversionQueue.length > 0) {
              setImmediate(() => this.processQueue());
            } else if (this.activeConversions === 0) {
              this.isProcessing = false;
            }
          });
      }
    }

    if (this.conversionQueue.length === 0 && this.activeConversions === 0) {
      this.isProcessing = false;
    }
  }

  /**
   * Process individual conversion task
   * GOTCHA: FFmpeg progress events may not be perfectly linear
   */
  private async processConversion(task: ConversionTask): Promise<void> {
    try {
      // Ensure output directory exists
      const outputDir = path.dirname(task.outputPath);
      await fs.mkdir(outputDir, { recursive: true });

      task.status = 'processing';
      task.startedAt = new Date();
      
      this.emit('taskStarted', { taskId: task.id, inputPath: task.inputPath });

      await this.executeFFmpegConversion(task);
      
      task.status = 'completed';
      task.completedAt = new Date();
      task.progress = 100;
      
      this.emit('taskCompleted', { taskId: task.id, outputPath: task.outputPath });
      
    } catch (error: any) {
      task.status = 'failed';
      task.error = error.message;
      task.completedAt = new Date();
      
      this.emit('taskFailed', { taskId: task.id, error: error.message });
      
      console.error(`Conversion failed for ${task.inputPath}:`, error);
    }
  }

  /**
   * Execute FFmpeg conversion with progress tracking
   */
  private executeFFmpegConversion(task: ConversionTask): Promise<void> {
    return new Promise((resolve, reject) => {
      const command = ffmpeg(task.inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          '-crf 23',              // Good quality/size balance
          '-preset medium',        // Reasonable speed/quality
          '-movflags +faststart', // Web optimization
          '-pix_fmt yuv420p'      // Maximum compatibility
        ])
        .toFormat('mp4');

      command
        .on('start', (cmd) => {
          console.log(`Starting conversion: ${task.inputPath}`);
          this.emit('conversionStart', { 
            taskId: task.id, 
            command: cmd, 
            inputPath: task.inputPath, 
            outputPath: task.outputPath 
          });
        })
        .on('progress', (progress) => {
          // GOTCHA: Progress percent can be undefined or inconsistent
          const percent = Math.min(Math.max(Math.round(progress.percent || 0), 0), 100);
          task.progress = percent;
          
          this.emit('conversionProgress', {
            taskId: task.id,
            percent,
            timemark: progress.timemark,
            targetSize: progress.targetSize,
            currentKbps: progress.currentKbps,
            currentFps: progress.currentFps,
            inputPath: task.inputPath,
            outputPath: task.outputPath
          });
        })
        .on('end', () => {
          console.log(`Conversion completed: ${task.outputPath}`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`Conversion error for ${task.inputPath}:`, err);
          reject(new Error(`Conversion failed: ${err.message}`));
        })
        .save(task.outputPath);
    });
  }

  /**
   * Get current queue status
   */
  getQueueStatus(): ConversionQueue {
    return {
      tasks: [...this.conversionQueue],
      activeConversions: this.activeConversions,
      maxConcurrent: this.maxConcurrent,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): ConversionTask | undefined {
    return this.conversionQueue.find(task => task.id === taskId);
  }

  /**
   * Cancel a pending task
   * Note: Cannot cancel tasks that are already processing
   */
  cancelTask(taskId: string): boolean {
    const taskIndex = this.conversionQueue.findIndex(task => task.id === taskId);
    if (taskIndex !== -1 && this.conversionQueue[taskIndex].status === 'pending') {
      this.conversionQueue[taskIndex].status = 'failed';
      this.conversionQueue[taskIndex].error = 'Cancelled by user';
      this.conversionQueue.splice(taskIndex, 1);
      
      this.emit('taskCancelled', { taskId });
      return true;
    }
    return false;
  }

  /**
   * Clear completed and failed tasks from queue
   */
  clearCompletedTasks(): number {
    const initialLength = this.conversionQueue.length;
    this.conversionQueue = this.conversionQueue.filter(
      task => task.status === 'pending' || task.status === 'processing'
    );
    const removed = initialLength - this.conversionQueue.length;
    
    if (removed > 0) {
      this.emit('queueCleaned', { tasksRemoved: removed });
    }
    
    return removed;
  }

  /**
   * Set maximum concurrent conversions
   * CRITICAL: Don't set too high or it will overwhelm the system
   */
  setMaxConcurrentConversions(max: number): void {
    if (max < 1 || max > 4) {
      throw new Error('Max concurrent conversions must be between 1 and 4');
    }
    
    this.maxConcurrent = max;
    this.emit('configChanged', { maxConcurrent: max });
    
    // Resume processing if we increased the limit
    if (!this.isProcessing && this.conversionQueue.length > 0) {
      this.processQueue();
    }
  }

  /**
   * Get conversion statistics
   */
  getStats(): {
    totalQueued: number;
    totalCompleted: number;
    totalFailed: number;
    activeConversions: number;
  } {
    const completed = this.conversionQueue.filter(t => t.status === 'completed').length;
    const failed = this.conversionQueue.filter(t => t.status === 'failed').length;
    
    return {
      totalQueued: this.conversionQueue.length,
      totalCompleted: completed,
      totalFailed: failed,
      activeConversions: this.activeConversions
    };
  }

  /**
   * Pause all conversions
   * Note: Currently processing conversions will complete
   */
  pauseConversions(): void {
    this.isProcessing = false;
    this.emit('conversionsPaused');
  }

  /**
   * Resume conversion processing
   */
  resumeConversions(): void {
    if (this.conversionQueue.length > 0 && !this.isProcessing) {
      this.processQueue();
      this.emit('conversionsResumed');
    }
  }

  /**
   * Validate that ffmpeg is available for conversions
   */
  async validateFFmpegAvailability(): Promise<boolean> {
    return new Promise((resolve) => {
      ffmpeg.getAvailableEncoders((err, encoders) => {
        if (err || !encoders.libx264 || !encoders.aac) {
          console.error('Required FFmpeg encoders not available:', err);
          resolve(false);
        } else {
          console.log('FFmpeg conversion encoders validated successfully');
          resolve(true);
        }
      });
    });
  }
}

// Export singleton instance for use across the application
export const mediaConversionService = MediaConversionService.getInstance();
export default MediaConversionService;