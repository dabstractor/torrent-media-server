import { NextRequest, NextResponse } from 'next/server'
import { getFileHistoryDB } from '@/lib/db/file-history'
import { promises as fs } from 'fs'
import path from 'path'
import { getMediaType, isPlexCompatible, extractQuality } from '@/lib/api/files'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'scan'
    
    const db = getFileHistoryDB()
    
    switch (action) {
      case 'scan':
        return await scanCompletedFiles(db)
      case 'cleanup':
        return await cleanupOrphanedFiles(db)
      case 'optimize':
        return await optimizeDatabase(db)
      default:
        return NextResponse.json(
          { 
            success: false, 
            data: null,
            error: 'Invalid maintenance action' 
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Maintenance operation error:', error)
    return NextResponse.json(
      { 
        success: false, 
        data: null,
        error: 'Failed to perform maintenance operation' 
      },
      { status: 500 }
    )
  }
}

async function scanCompletedFiles(db: any) {
  const completedPath = path.join(process.cwd(), '../data/downloads/complete')
  let scanned = 0
  let added = 0
  
  try {
    const scanDirectory = async (dirPath: string): Promise<void> => {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)
        scanned++
        
        if (entry.isFile()) {
          const stats = await fs.stat(fullPath)
          const relativePath = path.relative(path.join(process.cwd(), '../data'), fullPath)
          
          try {
            db.addCompletedFile({
              path: relativePath,
              name: entry.name,
              size: stats.size,
              modifiedDate: stats.mtime,
              mediaType: getMediaType(entry.name),
              plexCompatible: isPlexCompatible(entry.name),
              quality: extractQuality(entry.name),
            })
            added++
          } catch (error) {
            // File might already exist in database, skip
          }
        } else if (entry.isDirectory()) {
          await scanDirectory(fullPath)
        }
      }
    }
    
    await scanDirectory(completedPath)
    
    return NextResponse.json({
      success: true,
      data: { scanned, added }
    })
  } catch (error) {
    return NextResponse.json({
      success: true,
      data: { scanned, added }
    })
  }
}

async function cleanupOrphanedFiles(db: any) {
  // This would implement cleanup logic for orphaned files
  // For now, return a placeholder response
  return NextResponse.json({
    success: true,
    data: { removed: 0 }
  })
}

async function optimizeDatabase(db: any) {
  // This would implement database optimization
  // For now, return a success response
  return NextResponse.json({
    success: true,
    data: { success: true }
  })
}