import { NextRequest, NextResponse } from 'next/server'
import { getFileHistoryDB } from '@/lib/db/file-history'
import type { CompletedFile } from '@/lib/types/file-history'
import { getMediaType, isPlexCompatible, extractQuality } from '@/lib/api/files'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const torrentHash = searchParams.get('torrentHash')
    
    const db = getFileHistoryDB()
    const files = db.getCompletedFiles(torrentHash || undefined)
    
    return NextResponse.json({
      success: true,
      data: {
        files,
        total: files.length
      }
    })
  } catch (error) {
    console.error('Completed files fetch error:', error)
    return NextResponse.json(
      { 
        success: false, 
        data: null,
        error: 'Failed to fetch completed files' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Enhance file data with metadata
    const file: CompletedFile = {
      ...body,
      modifiedDate: body.modifiedDate ? new Date(body.modifiedDate) : new Date(),
      mediaType: body.mediaType || getMediaType(body.name),
      plexCompatible: body.plexCompatible ?? isPlexCompatible(body.name),
      quality: body.quality || extractQuality(body.name),
    }
    
    // Validate required fields
    if (!file.path || !file.name) {
      return NextResponse.json(
        { 
          success: false, 
          data: null,
          error: 'Missing required fields: path, name' 
        },
        { status: 400 }
      )
    }
    
    const db = getFileHistoryDB()
    db.addCompletedFile(file)
    
    return NextResponse.json({
      success: true,
      data: { success: true }
    })
  } catch (error) {
    console.error('Completed file add error:', error)
    return NextResponse.json(
      { 
        success: false, 
        data: null,
        error: 'Failed to add completed file' 
      },
      { status: 500 }
    )
  }
}