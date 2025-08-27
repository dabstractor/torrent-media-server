import { NextRequest, NextResponse } from 'next/server'
import { getFileHistoryDB } from '@/lib/db/file-history'

export async function GET(request: NextRequest) {
  try {
    const db = getFileHistoryDB()
    const stats = db.getStats()
    
    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('File stats fetch error:', error)
    return NextResponse.json(
      { 
        success: false, 
        data: null,
        error: 'Failed to fetch file statistics' 
      },
      { status: 500 }
    )
  }
}