import { NextRequest, NextResponse } from 'next/server';
import { plexIntegrationManager } from '@/lib/managers/PlexIntegrationManager';
import type { Download } from '@/lib/types';
import type { CompletedFile } from '@/lib/types/file-history';
import { getMediaType, isPlexCompatible, extractQuality } from '@/lib/api/files';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Processing existing files in downloads directory...');

    if (!plexIntegrationManager.isReady()) {
      return NextResponse.json(
        { error: 'PlexIntegrationManager not initialized' },
        { status: 500 }
      );
    }

    const downloadsDir = '/downloads';
    const files = await fs.readdir(downloadsDir);
    const processedFiles = [];
    const errors = [];

    for (const fileName of files) {
      const filePath = path.join(downloadsDir, fileName);
      
      try {
        const stats = await fs.stat(filePath);
        
        if (!stats.isFile()) {
          continue; // Skip directories
        }

        const mediaType = getMediaType(fileName);
        if (!mediaType || mediaType === 'document') {
          console.log(`Skipping non-media file: ${fileName}`);
          continue;
        }

        console.log(`📥 Processing: ${fileName}`);

        // Create CompletedFile object
        const completedFile: CompletedFile = {
          path: filePath,
          name: fileName,
          size: stats.size,
          modifiedDate: stats.mtime,
          mediaType,
          plexCompatible: isPlexCompatible(fileName),
          quality: extractQuality(fileName),
        };

        // Create synthetic Download object
        const download: Download = {
          hash: `existing-${Date.now()}-${Math.random()}`,
          name: path.basename(fileName, path.extname(fileName)),
          state: 'completed',
          progress: 1.0,
          size: stats.size,
          downloadSpeed: 0,
          uploadSpeed: 0,
          eta: 0,
          priority: 1,
          category: 'existing-files',
          addedTime: stats.birthtime.getTime(),
          completedTime: stats.mtime.getTime(),
        };

        // Trigger Plex organization
        const success = await plexIntegrationManager.onDownloadComplete(download, [completedFile]);
        
        if (success) {
          processedFiles.push({
            fileName,
            status: 'success',
            size: stats.size
          });
          console.log(`✅ Successfully processed: ${fileName}`);
        } else {
          processedFiles.push({
            fileName,
            status: 'failed',
            error: 'Plex organization failed'
          });
          console.log(`❌ Failed to process: ${fileName}`);
        }

      } catch (fileError: any) {
        errors.push({
          fileName,
          error: fileError.message
        });
        console.error(`Error processing ${fileName}:`, fileError);
      }
    }

    console.log(`🏁 Completed processing ${processedFiles.length} files`);

    return NextResponse.json({
      success: true,
      processed: processedFiles.length,
      files: processedFiles,
      errors
    });

  } catch (error: any) {
    console.error('❌ Error processing existing files:', error);
    return NextResponse.json(
      { error: 'Failed to process existing files', details: error.message },
      { status: 500 }
    );
  }
}