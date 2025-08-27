import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import type { CompletedFile } from '@/lib/types/file-history'
import { getMediaType, isPlexCompatible, extractQuality } from '@/lib/api/files'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const requestedPath = searchParams.get('path')
    
    if (!requestedPath) {
      return NextResponse.json(
        { 
          success: false, 
          data: null,
          error: 'File path is required' 
        },
        { status: 400 }
      )
    }
    
    // Security: Ensure we stay within allowed directories
    const basePath = path.join(process.cwd(), '../data')
    const fullPath = path.join(basePath, requestedPath)
    
    // Prevent directory traversal attacks
    if (!fullPath.startsWith(basePath)) {
      return NextResponse.json(
        { 
          success: false, 
          data: null,
          error: 'Access denied: Invalid path' 
        },
        { status: 403 }
      )
    }
    
    let stats
    try {
      stats = await fs.stat(fullPath)
    } catch (error) {
      return NextResponse.json(
        { 
          success: false, 
          data: null,
          error: 'File not found' 
        },
        { status: 404 }
      )
    }
    
    if (stats.isDirectory()) {
      return NextResponse.json(
        { 
          success: false, 
          data: null,
          error: 'Path is a directory, not a file' 
        },
        { status: 400 }
      )
    }
    
    const fileName = path.basename(fullPath)
    
    const fileInfo: CompletedFile = {
      path: requestedPath,
      name: fileName,
      size: stats.size,
      modifiedDate: stats.mtime,
      mediaType: getMediaType(fileName),
      plexCompatible: isPlexCompatible(fileName),
      quality: extractQuality(fileName),
    }
    
    return NextResponse.json({
      success: true,
      data: fileInfo
    })
  } catch (error) {
    console.error('File info fetch error:', error)
    return NextResponse.json(
      { 
        success: false, 
        data: null,
        error: 'Failed to fetch file info' 
      },
      { status: 500 }
    )
  }
}