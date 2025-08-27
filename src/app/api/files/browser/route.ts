import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import type { FileBrowserNode } from '@/lib/api/files'
import { getMediaType, isPlexCompatible } from '@/lib/api/files'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const requestedPath = searchParams.get('path') || '/downloads/complete'
    
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
          error: 'Path not found' 
        },
        { status: 404 }
      )
    }
    
    if (!stats.isDirectory()) {
      // Return file info if it's a file
      const fileName = path.basename(fullPath)
      const fileNode: FileBrowserNode = {
        name: fileName,
        path: requestedPath,
        type: 'file',
        size: stats.size,
        modified: stats.mtime,
      }
      
      return NextResponse.json({
        success: true,
        data: {
          nodes: [fileNode],
          path: requestedPath,
          parent: path.dirname(requestedPath)
        }
      })
    }
    
    // Read directory contents
    const entries = await fs.readdir(fullPath, { withFileTypes: true })
    const nodes: FileBrowserNode[] = []
    
    for (const entry of entries) {
      const entryPath = path.join(fullPath, entry.name)
      const entryStats = await fs.stat(entryPath)
      const relativePath = path.join(requestedPath, entry.name)
      
      const node: FileBrowserNode = {
        name: entry.name,
        path: relativePath,
        type: entry.isDirectory() ? 'directory' : 'file',
        modified: entryStats.mtime,
      }
      
      if (entry.isFile()) {
        node.size = entryStats.size
      }
      
      nodes.push(node)
    }
    
    // Sort: directories first, then files, both alphabetically
    nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })
    
    const parentPath = requestedPath === '/' ? undefined : path.dirname(requestedPath)
    
    return NextResponse.json({
      success: true,
      data: {
        nodes,
        path: requestedPath,
        parent: parentPath
      }
    })
  } catch (error) {
    console.error('File browser error:', error)
    return NextResponse.json(
      { 
        success: false, 
        data: null,
        error: 'Failed to browse files' 
      },
      { status: 500 }
    )
  }
}