#!/usr/bin/env node

import path from 'path';
import { promises as fs } from 'fs';
import { MediaConversionService } from '../../../../src/lib/services/MediaConversionService';

/**
 * CLI script to convert media files to H.264/AAC MP4 format
 * Usage: node convert-media.js [inputPath] [outputPath]
 * If no paths provided, will process all .mkv files in /downloads directory
 */

async function main() {
  const args = process.argv.slice(2);
  
  // Create conversion service instance
  const conversionService = MediaConversionService.getInstance();
  
  // Validate ffmpeg availability
  const ffmpegAvailable = await conversionService.validateFFmpegAvailability();
  if (!ffmpegAvailable) {
    console.error('❌ FFmpeg is not available. Please install ffmpeg.');
    process.exit(1);
  }
  
  console.log('✅ FFmpeg is available for conversions');
  
  if (args.length >= 2) {
    // Convert specific file
    const inputPath = args[0];
    const outputPath = args[1];
    
    console.log(`🔄 Converting: ${inputPath} -> ${outputPath}`);
    
    try {
      const task = await conversionService.convertToH264MP4(inputPath, outputPath);
      
      // Listen for progress events
      conversionService.on('conversionProgress', (data) => {
        console.log(`📊 Progress: ${data.percent}% - ${data.inputPath}`);
      });
      
      conversionService.on('taskCompleted', (data) => {
        console.log(`✅ Completed: ${data.outputPath}`);
      });
      
      conversionService.on('taskFailed', (data) => {
        console.error(`❌ Failed: ${data.error}`);
      });
      
      // Wait for completion
      await new Promise<void>((resolve, reject) => {
        conversionService.on('taskCompleted', () => resolve());
        conversionService.on('taskFailed', () => reject());
      });
      
      console.log('🎉 Conversion completed successfully!');
      
    } catch (error: any) {
      console.error('❌ Conversion failed:', error.message);
      process.exit(1);
    }
    
  } else {
    // Process all .mkv files in downloads directory
    const downloadsDir = '/downloads';
    try {
      const files = await fs.readdir(downloadsDir);
      const mkvFiles = files.filter(file => 
        path.extname(file).toLowerCase() === '.mkv' && 
        file.toLowerCase().includes('dexter')
      );
      
      if (mkvFiles.length === 0) {
        console.log('ℹ️  No Dexter .mkv files found in downloads directory');
        process.exit(0);
      }
      
      console.log(`🔄 Found ${mkvFiles.length} Dexter episodes to convert`);
      
      // Process each file
      for (const mkvFile of mkvFiles) {
        const inputPath = path.join(downloadsDir, mkvFile);
        const outputFileName = mkvFile.replace(/\.mkv$/i, '.mp4');
        const outputPath = path.join(downloadsDir, 'complete', outputFileName);
        
        console.log(`\n🎬 Processing: ${mkvFile}`);
        
        try {
          // Ensure output directory exists
          await fs.mkdir(path.dirname(outputPath), { recursive: true });
          
          const task = await conversionService.convertToH264MP4(inputPath, outputPath);
          
          // Wait for this conversion to complete before starting next
          await new Promise<void>((resolve, reject) => {
            const onComplete = (data: any) => {
              if (data.taskId === task.id) {
                conversionService.off('taskCompleted', onComplete);
                conversionService.off('taskFailed', onError);
                resolve();
              }
            };
            
            const onError = (data: any) => {
              if (data.taskId === task.id) {
                conversionService.off('taskCompleted', onComplete);
                conversionService.off('taskFailed', onError);
                reject(new Error(data.error));
              }
            };
            
            conversionService.on('taskCompleted', onComplete);
            conversionService.on('taskFailed', onError);
          });
          
          console.log(`✅ Completed: ${mkvFile} -> ${outputFileName}`);
          
        } catch (error: any) {
          console.error(`❌ Failed to convert ${mkvFile}:`, error.message);
        }
      }
      
      console.log('\n🎉 All conversions completed!');
      
    } catch (error: any) {
      console.error('❌ Error accessing downloads directory:', error.message);
      process.exit(1);
    }
  }
}

// Add event emitter methods to conversion service for CLI usage
const conversionService = MediaConversionService.getInstance();
if (!(conversionService as any).off) {
  (conversionService as any).off = function(event: string, listener: Function) {
    this.removeListener(event, listener);
  };
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});