import { NextRequest, NextResponse } from 'next/server';
import { plexOrganizationService } from '@/lib/services/PlexOrganizationService';
import type { CompletedFile } from '@/lib/types/file-history';
import { getMediaType, isPlexCompatible, extractQuality } from '@/lib/api/files';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    console.log('🐛 Debug: Processing Alien Earth episode specifically...');

    // Test with episode 2 file
    const filePath = '/downloads/alien.earth.s01e02.1080p.web.h264-successfulcrab[EZTVx.to].mkv';
    
    console.log('🐛 Debug: Checking file exists:', filePath);
    const stats = await fs.stat(filePath);
    console.log('🐛 Debug: File stats:', { size: stats.size, mtime: stats.mtime });

    const fileName = path.basename(filePath);
    const mediaType = getMediaType(fileName);
    console.log('🐛 Debug: Media type detected:', mediaType);

    const completedFile: CompletedFile = {
      path: filePath,
      name: fileName,
      size: stats.size,
      modifiedDate: stats.mtime,
      mediaType,
      plexCompatible: isPlexCompatible(fileName),
      quality: extractQuality(fileName),
    };

    console.log('🐛 Debug: CompletedFile object:', completedFile);

    // Initialize organization service with test settings
    const testPlexSettings = {
      enabled: true,
      token: 'oKYPzYJozUhkMV2_oFNs',
      url: 'http://172.28.0.1:32400',
      movieLibrary: 'Movies',
      tvLibrary: 'TV Shows',
      mediaPath: '/media',
      autoUpdate: true,
      refreshDelay: 10,
      scanAllLibraries: false,
      organizationEnabled: true,
      updateLibraryOnComplete: true,
      categories: []
    };

    console.log('🐛 Debug: Initializing organization service with settings:', testPlexSettings);
    plexOrganizationService.initialize(testPlexSettings);

    console.log('🐛 Debug: Starting organization process...');
    const organizationResults = await plexOrganizationService.organizeForPlex([completedFile]);
    
    console.log('🐛 Debug: Organization results:', organizationResults);

    return NextResponse.json({
      success: true,
      filePath,
      completedFile,
      organizationResults,
      debug: 'Alien Earth debug processing complete'
    });

  } catch (error: any) {
    console.error('🐛 Debug: Error during Alien Earth processing:', error);
    return NextResponse.json(
      { 
        error: 'Debug processing failed', 
        details: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
}