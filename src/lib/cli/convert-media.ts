#!/usr/bin/env node

import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { promises as fs } from 'fs';

/**
 * Simple CLI script to convert media files to H.264/AAC MP4 format
 * Usage: node convert-media.js [inputPath] [outputPath]
 * If no paths provided, will process all .mkv files in /downloads directory
 */

async function convertToH264MP4(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`🔄 Starting conversion: ${path.basename(inputPath)} -> ${path.basename(outputPath)}`);
    
    const command = ffmpeg(inputPath)
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
        console.log(`🎬 Started: ${path.basename(inputPath)}`);
      })
      .on('progress', (progress) => {
        // Progress percent can be undefined or inconsistent
        const percent = Math.min(Math.max(Math.round(progress.percent || 0), 0), 100);
        if (percent % 10 === 0) { // Only log every 10%
          console.log(`📊 Progress: ${percent}% - ${path.basename(inputPath)}`);
        }
      })
      .on('end', () => {
        console.log(`✅ Completed: ${path.basename(inputPath)} -> ${path.basename(outputPath)}`);
        resolve();
      })
      .on('error', (err) => {
        console.error(`❌ Error converting ${path.basename(inputPath)}:`, err.message);
        reject(new Error(`Conversion failed: ${err.message}`));
      })
      .save(outputPath);
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  // Validate that ffmpeg is available
  try {
    await new Promise<void>((resolve, reject) => {
      ffmpeg.getAvailableEncoders((err, encoders) => {
        if (err || !encoders.libx264 || !encoders.aac) {
          console.error('❌ Required FFmpeg encoders not available:', err?.message || 'Missing libx264 or aac encoders');
          reject(new Error('FFmpeg validation failed'));
        } else {
          console.log('✅ FFmpeg is available with required encoders');
          resolve();
        }
      });
    });
  } catch (error) {
    console.error('❌ FFmpeg is not available. Please install ffmpeg.');
    process.exit(1);
  }
  
  if (args.length >= 2) {
    // Convert specific file
    const inputPath = args[0];
    const outputPath = args[1];
    
    try {
      await convertToH264MP4(inputPath, outputPath);
      console.log('🎉 Conversion completed successfully!');
    } catch (error: any) {
      console.error('❌ Conversion failed:', error.message);
      process.exit(1);
    }
    
  } else {
    // Process all .mkv files in downloads directory
    const downloadsDir = './data/downloads';
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
      
      // Process each file sequentially
      for (const mkvFile of mkvFiles) {
        const inputPath = path.join(downloadsDir, mkvFile);
        const outputFileName = mkvFile.replace(/\.mkv$/i, '.mp4');
        const outputPath = path.join('./data/downloads', 'complete', outputFileName);
        
        console.log(`\n🎬 Processing: ${mkvFile}`);
        
        try {
          // Ensure output directory exists
          await fs.mkdir(path.dirname(outputPath), { recursive: true });
          
          await convertToH264MP4(inputPath, outputPath);
          
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

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});