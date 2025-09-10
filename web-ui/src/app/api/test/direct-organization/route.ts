import { NextRequest, NextResponse } from 'next/server'
import { PlexOrganizationService } from '@/lib/services/PlexOrganizationService'
import type { CompletedFile } from '@/lib/types/file-history'
import { getMediaType, isPlexCompatible, extractQuality } from '@/lib/api/files'
import { promises as fs } from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const testFile = searchParams.get('file')
    
    if (!testFile) {
      return NextResponse.json({
        success: false,
        error: 'File parameter required'
      }, { status: 400 })
    }
    
    console.log(`🧪 DIRECT TEST: Testing PlexOrganizationService with: ${testFile}`)
    
    // Create mock completed file for testing  
    const completedFile: CompletedFile = {
      path: `/downloads/${testFile}`,
      name: testFile,
      size: 800000000, // ~800MB mock size
      modifiedDate: new Date(),
      mediaType: getMediaType(testFile),
      plexCompatible: isPlexCompatible(testFile),
      quality: extractQuality(testFile),
      torrentHash: `test-${Date.now()}`
    }
    
    console.log(`📊 File analysis: ${completedFile.mediaType}, Plex compatible: ${completedFile.plexCompatible}, Quality: ${completedFile.quality}`)
    
    // Test settings for organization
    const testSettings = {
      enabled: true,
      organizationEnabled: true,
      mediaPath: '/tmp/test-media',
      movieLibrary: 'Movies',
      tvLibrary: 'TV Shows',
      autoUpdate: true,
      refreshDelay: 10,
      scanAllLibraries: false,
      updateLibraryOnComplete: false,
      categories: [],
      url: 'http://plex:32400',
      token: 'test-token'
    }
    
    // Create and initialize PlexOrganizationService
    const organizationService = new PlexOrganizationService()
    await organizationService.initialize(testSettings)
    
    console.log(`✅ PlexOrganizationService initialized`)
    
    // Test the organization process
    const results = await organizationService.organizeForPlex([completedFile])
    
    console.log(`📋 Organization results:`, JSON.stringify(results, null, 2))
    
    return NextResponse.json({
      success: true,
      data: {
        file: testFile,
        fileInfo: {
          mediaType: completedFile.mediaType,
          plexCompatible: completedFile.plexCompatible,
          quality: completedFile.quality
        },
        organizationResults: results,
        resultSummary: {
          totalFiles: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          actions: results.map(r => r.action)
        }
      }
    })
    
  } catch (error) {
    console.error('Direct organization test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Test failed: ' + (error as Error).message
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      description: 'Direct PlexOrganizationService test endpoint',
      usage: 'POST /api/test/direct-organization?file=filename.mkv',
      testFiles: [
        'south.park.s27e01.1080p.web.h264-successfulcrab[EZTVx.to].mkv', // H.264 - should symlink
        'South.Park.S27E02.1080p.AMZN.WEB-DL.DDP5.1.x265.10-bit-KSPEncodes.mkv', // x265 - should convert
        'South.Park.S27E03.1080p.HEVC.x265-MeGusta[EZTVx.to].mkv' // HEVC - should convert
      ]
    }
  })
}