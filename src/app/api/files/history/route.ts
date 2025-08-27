import { NextRequest, NextResponse } from 'next/server'
import { getFileHistoryDB } from '@/lib/db/file-history'
import type { DownloadHistoryEntry, HistoryFilters } from '@/lib/types/file-history'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const statusParam = searchParams.get('status')
    const search = searchParams.get('search')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const minSize = searchParams.get('minSize')
    const maxSize = searchParams.get('maxSize')
    
    const filters: HistoryFilters = {}
    
    if (category) filters.category = category
    if (statusParam) {
      filters.status = statusParam.split(',') as DownloadHistoryEntry['status'][]
    }
    if (search) filters.searchTerm = search
    if (startDate && endDate) {
      filters.dateRange = [new Date(startDate), new Date(endDate)]
    }
    if (minSize && maxSize) {
      filters.sizeRange = [parseInt(minSize), parseInt(maxSize)]
    }
    
    const db = getFileHistoryDB()
    const entries = db.getHistoryEntries(filters)
    const stats = db.getStats()
    
    return NextResponse.json({
      success: true,
      data: {
        entries,
        total: entries.length,
        stats
      }
    })
  } catch (error) {
    console.error('File history fetch error:', error)
    return NextResponse.json(
      { 
        success: false, 
        data: null,
        error: 'Failed to fetch file history' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Generate ID and set current timestamp for new entries
    const entry: DownloadHistoryEntry = {
      ...body,
      id: uuidv4(),
      startedAt: body.startedAt ? new Date(body.startedAt) : new Date(),
      completedAt: body.completedAt ? new Date(body.completedAt) : new Date(),
    }
    
    // Validate required fields
    if (!entry.torrentHash || !entry.name || !entry.downloadPath) {
      return NextResponse.json(
        { 
          success: false, 
          data: null,
          error: 'Missing required fields: torrentHash, name, downloadPath' 
        },
        { status: 400 }
      )
    }
    
    const db = getFileHistoryDB()
    db.addHistoryEntry(entry)
    
    return NextResponse.json({
      success: true,
      data: { id: entry.id }
    })
  } catch (error) {
    console.error('File history add error:', error)
    return NextResponse.json(
      { 
        success: false, 
        data: null,
        error: 'Failed to add history entry' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const db = getFileHistoryDB()
    db.clearHistory()
    
    return NextResponse.json({
      success: true,
      data: { success: true }
    })
  } catch (error) {
    console.error('File history clear error:', error)
    return NextResponse.json(
      { 
        success: false, 
        data: null,
        error: 'Failed to clear history' 
      },
      { status: 500 }
    )
  }
}