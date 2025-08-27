import { NextRequest, NextResponse } from 'next/server'
import { getFileHistoryDB } from '@/lib/db/file-history'
import type { StoredTorrentFile } from '@/lib/types/file-history'

export async function GET(request: NextRequest) {
  try {
    const db = getFileHistoryDB()
    // For now, return empty array since we don't have a direct method to get all torrents
    // In a real implementation, we'd add this method to the database class
    const torrents: StoredTorrentFile[] = []
    
    return NextResponse.json({
      success: true,
      data: {
        torrents,
        total: torrents.length
      }
    })
  } catch (error) {
    console.error('Stored torrents fetch error:', error)
    return NextResponse.json(
      { 
        success: false, 
        data: null,
        error: 'Failed to fetch stored torrents' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const torrent: StoredTorrentFile = {
      ...body,
      createdDate: body.createdDate ? new Date(body.createdDate) : new Date(),
    }
    
    // Validate required fields
    if (!torrent.hash || !torrent.filename || !torrent.storagePath) {
      return NextResponse.json(
        { 
          success: false, 
          data: null,
          error: 'Missing required fields: hash, filename, storagePath' 
        },
        { status: 400 }
      )
    }
    
    const db = getFileHistoryDB()
    db.addStoredTorrentFile(torrent)
    
    return NextResponse.json({
      success: true,
      data: { success: true }
    })
  } catch (error) {
    console.error('Stored torrent add error:', error)
    return NextResponse.json(
      { 
        success: false, 
        data: null,
        error: 'Failed to add stored torrent' 
      },
      { status: 500 }
    )
  }
}