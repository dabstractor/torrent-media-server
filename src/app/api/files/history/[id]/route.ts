import { NextRequest, NextResponse } from 'next/server'
import { getFileHistoryDB } from '@/lib/db/file-history'
import type { DownloadHistoryEntry } from '@/lib/types/file-history'

interface Params {
  id: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id } = params
    
    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          data: null,
          error: 'History entry ID is required' 
        },
        { status: 400 }
      )
    }
    
    const db = getFileHistoryDB()
    const entry = db.getHistoryEntry(id)
    
    if (!entry) {
      return NextResponse.json(
        { 
          success: false, 
          data: null,
          error: 'History entry not found' 
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: entry
    })
  } catch (error) {
    console.error('File history entry fetch error:', error)
    return NextResponse.json(
      { 
        success: false, 
        data: null,
        error: 'Failed to fetch history entry' 
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id } = params
    const updates = await request.json()
    
    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          data: null,
          error: 'History entry ID is required' 
        },
        { status: 400 }
      )
    }
    
    const db = getFileHistoryDB()
    
    // Check if entry exists
    const existingEntry = db.getHistoryEntry(id)
    if (!existingEntry) {
      return NextResponse.json(
        { 
          success: false, 
          data: null,
          error: 'History entry not found' 
        },
        { status: 404 }
      )
    }
    
    // Update the entry
    db.updateHistoryEntry(id, updates)
    
    // Return updated entry
    const updatedEntry = db.getHistoryEntry(id)
    
    return NextResponse.json({
      success: true,
      data: updatedEntry
    })
  } catch (error) {
    console.error('File history entry update error:', error)
    return NextResponse.json(
      { 
        success: false, 
        data: null,
        error: 'Failed to update history entry' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id } = params
    
    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          data: null,
          error: 'History entry ID is required' 
        },
        { status: 400 }
      )
    }
    
    const db = getFileHistoryDB()
    
    // Check if entry exists
    const existingEntry = db.getHistoryEntry(id)
    if (!existingEntry) {
      return NextResponse.json(
        { 
          success: false, 
          data: null,
          error: 'History entry not found' 
        },
        { status: 404 }
      )
    }
    
    // Delete the entry
    db.deleteHistoryEntry(id)
    
    return NextResponse.json({
      success: true,
      data: { success: true }
    })
  } catch (error) {
    console.error('File history entry delete error:', error)
    return NextResponse.json(
      { 
        success: false, 
        data: null,
        error: 'Failed to delete history entry' 
      },
      { status: 500 }
    )
  }
}