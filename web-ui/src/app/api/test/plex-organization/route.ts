import { NextRequest, NextResponse } from 'next/server'
import { plexIntegrationManager } from '@/lib/managers/PlexIntegrationManager'
import { settingsService } from '@/lib/services/SettingsService'
import type { Download } from '@/lib/types'
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
    
    // Create a synthetic download and file for testing
    const filePath = path.join('/downloads', testFile)
    
    console.log(`🔍 Looking for file: ${filePath}`)
    
    // Check if file exists
    try {
      const stats = await fs.stat(filePath)
      
      const completedFile: CompletedFile = {
        path: `downloads/${testFile}`,
        name: testFile,
        size: stats.size,
        modifiedDate: stats.mtime,
        mediaType: getMediaType(testFile),
        plexCompatible: isPlexCompatible(testFile),
        quality: extractQuality(testFile),
        torrentHash: `test-${Date.now()}`
      }
      
      const download: Download = {
        hash: `test-${Date.now()}`,
        name: testFile.replace(/\.[^/.]+$/, ''), // Remove extension
        state: 'completed',
        progress: 1.0,
        size: stats.size,
        downloadSpeed: 0,
        uploadSpeed: 0,
        eta: 0,
        priority: 1,
        category: 'test',
        addedTime: Date.now() - 3600000, // 1 hour ago
        completedTime: Date.now(),
      }
      
      console.log(`🧪 TEST: Triggering Plex organization for: ${testFile}`)
      console.log(`📊 File analysis: ${completedFile.mediaType}, Plex compatible: ${completedFile.plexCompatible}`)
      
      // Initialize PlexIntegrationManager with test settings
      const settings = await settingsService.getSettings()
      const testPlexSettings = {
        ...settings.plex,
        enabled: true,
        organizationEnabled: true,  // Force enable for testing
        mediaPath: '/media',
        movieLibrary: 'Movies',
        tvLibrary: 'TV Shows'
      }
      await plexIntegrationManager.initialize(testPlexSettings)
      
      // Trigger the Plex organization process
      const success = await plexIntegrationManager.onDownloadComplete(download, [completedFile])
      
      return NextResponse.json({
        success: true,
        data: {
          file: testFile,
          organizationSuccess: success,
          fileInfo: {
            size: `${Math.round(stats.size / 1024 / 1024)}MB`,
            mediaType: completedFile.mediaType,
            plexCompatible: completedFile.plexCompatible,
            quality: completedFile.quality
          }
        }
      })
      
    } catch (fileError) {
      return NextResponse.json({
        success: false,
        error: `File not found: ${filePath}`
      }, { status: 404 })
    }
    
  } catch (error) {
    console.error('Test Plex organization error:', error)
    return NextResponse.json({
      success: false,
      error: 'Test failed: ' + (error as Error).message
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // List available test files
    const downloadDir = '/downloads'
    const files = await fs.readdir(downloadDir)
    
    const mediaFiles = files.filter(file => 
      file.endsWith('.mkv') || 
      file.endsWith('.mp4') || 
      file.endsWith('.avi')
    )
    
    return NextResponse.json({
      success: true,
      data: {
        availableFiles: mediaFiles,
        usage: 'POST /api/test/plex-organization?file=filename.mkv'
      }
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to list files: ' + (error as Error).message
    }, { status: 500 })
  }
}